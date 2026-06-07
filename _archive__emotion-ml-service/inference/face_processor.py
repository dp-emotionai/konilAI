"""
Детекция лиц для пайплайна эмоций.

Поддерживает:
- Haar Cascade (OpenCV) — по умолчанию, не требует внешних файлов (использует cv2.data).
- MediaPipe Face Detection — опционально, лучше при сложном освещении и поворотах.

ТЗ п. 4.1: веб-камера, 1–2 кадра/сек анализа (троттлинг вызывается в main_realtime).
"""

import os
from typing import List, Tuple

import cv2
import numpy as np

# Попытка импорта MediaPipe (опционально)
try:
    import mediapipe as mp
    _MEDIAPIPE_AVAILABLE = True
except ImportError:
    _MEDIAPIPE_AVAILABLE = False


# ================== HAAR (по умолчанию) ==================
def _default_haar_path() -> str:
    """Путь к каскаду из данных OpenCV (не зависит от cwd)."""
    base = getattr(cv2.data, "haarcascades", None)
    if base is None:
        return "haarcascade_frontalface_default.xml"
    return os.path.join(base, "haarcascade_frontalface_default.xml")


class FaceProcessor:
    """
    Детекция лиц в кадре (серый или BGR).

    - detector="haar": быстрый, стабильный, хорошо при фронтальных лицах.
    - detector="mediapipe": точнее при поворотах и разном освещении, чуть тяжелее.
    """

    def __init__(
        self,
        detector: str = "haar",
        min_face_size: Tuple[int, int] = (80, 80),
        # Параметры Haar
        scale_factor: float = 1.2,
        min_neighbors: int = 5,
        # Параметр MediaPipe
        min_detection_confidence: float = 0.5,
    ):
        """
        detector: "haar" | "mediapipe"
        min_face_size: (width, height) — минимальный размер лица в пикселях.
        """
        self.detector_name = detector.lower()
        self.min_face_size = min_face_size
        self._cascade = None
        self._mp_face_detection = None

        if self.detector_name == "haar":
            path = _default_haar_path()
            if not os.path.isfile(path):
                path = "haarcascade_frontalface_default.xml"
            self._cascade = cv2.CascadeClassifier(path)
            if self._cascade.empty():
                raise RuntimeError(f"Haar cascade not loaded: {path}")
            self._scale_factor = scale_factor
            self._min_neighbors = min_neighbors
        elif self.detector_name == "mediapipe":
            if not _MEDIAPIPE_AVAILABLE:
                raise ImportError("MediaPipe not installed. Use detector='haar' or: pip install mediapipe")
            self._mp_face_detection = mp.solutions.face_detection.FaceDetection(
                min_detection_confidence=min_detection_confidence,
                model_selection=0,  # 0 = short range (2 m), 1 = full range
            )
        else:
            raise ValueError(f"Unknown detector: {detector}. Use 'haar' or 'mediapipe'.")

    def detect(
        self,
        frame: np.ndarray,
        *,
        use_gray: bool = True,
    ) -> List[Tuple[int, int, int, int]]:
        """
        Найти лица в кадре.

        Parameters
        ----------
        frame : np.ndarray
            BGR или серый кадр (H, W) или (H, W, 3).
        use_gray : bool
            Для Haar использовать серое изображение (рекомендуется).

        Returns
        -------
        List[Tuple[int, int, int, int]]
            Список боксов (x, y, width, height).
        """
        if frame is None or frame.size == 0:
            return []

        min_w, min_h = self.min_face_size

        if self.detector_name == "haar":
            if use_gray and len(frame.shape) == 3:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            else:
                gray = frame
            boxes = self._cascade.detectMultiScale(
                gray,
                scaleFactor=self._scale_factor,
                minNeighbors=self._min_neighbors,
                minSize=(min_w, min_h),
            )
            # OpenCV возвращает (x, y, w, h)
            return [tuple(map(int, b)) for b in boxes]

        if self.detector_name == "mediapipe":
            return self._detect_mediapipe(frame, min_w, min_h)

        return []

    def _detect_mediapipe(
        self,
        frame: np.ndarray,
        min_w: int,
        min_h: int,
    ) -> List[Tuple[int, int, int, int]]:
        """Детекция через MediaPipe; возврат (x, y, w, h) в пикселях."""
        if len(frame.shape) == 2:
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
        else:
            frame_bgr = frame
        h, w = frame_bgr.shape[:2]
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = self._mp_face_detection.process(rgb)
        out = []
        if not results.detections:
            return out
        for det in results.detections:
            b = det.location_data.relative_bounding_box
            x = int(b.xmin * w)
            y = int(b.ymin * h)
            bw = int(b.width * w)
            bh = int(b.height * h)
            if bw < min_w or bh < min_h:
                continue
            x = max(0, x)
            y = max(0, y)
            if x + bw > w:
                bw = w - x
            if y + bh > h:
                bh = h - y
            if bw > 0 and bh > 0:
                out.append((x, y, bw, bh))
        return out

    def close(self):
        """Освободить ресурсы (для MediaPipe)."""
        if self._mp_face_detection is not None:
            self._mp_face_detection.close()
            self._mp_face_detection = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


def crop_face_with_margin(
    gray: np.ndarray,
    box: Tuple[int, int, int, int],
    margin: float = 0.15,
) -> np.ndarray:
    """
    Вырезать область лица с отступом для лучшего качества эмоций.

    ТЗ: видео не сохраняется — только вырез для текущего кадра анализа.

    Parameters
    ----------
    gray : np.ndarray
        Серое изображение кадра.
    box : (x, y, w, h)
        Бокс лица.
    margin : float
        Доля от ширины/высоты для расширения (0.15 = 15%).

    Returns
    -------
    np.ndarray
        Вырез серого изображения (может быть меньше box при обрезке по границам).
    """
    x, y, w, h = box
    H, W = gray.shape[:2]
    pad_w = int(w * margin)
    pad_h = int(h * margin)
    x1 = max(0, x - pad_w)
    y1 = max(0, y - pad_h)
    x2 = min(W, x + w + pad_w)
    y2 = min(H, y + h + pad_h)
    return gray[y1:y2, x1:x2]
