import tensorflow as tf
import numpy as np
import cv2
from typing import Dict, Tuple, List


class EmotionModel:
    """
    Emotion inference engine.
    Loads CNN model and performs emotion prediction on face crops.
    """

    EMOTIONS = [
        "Angry",
        "Disgust",
        "Fear",
        "Happy",
        "Sad",
        "Surprise",
        "Neutral"
    ]

    def __init__(
        self,
        model_path: str,
        input_size: Tuple[int, int] = (64, 64),
        grayscale: bool = True,
        confidence_threshold: float = 0.3,
        use_clahe: bool = True,
    ):
        self.model_path = model_path
        self.input_size = input_size
        self.grayscale = grayscale
        self.confidence_threshold = confidence_threshold
        self.use_clahe = use_clahe
        self._clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)) if use_clahe else None

        self.model = self._load_model()

   
    def _load_model(self) -> tf.keras.Model:
        try:
            model = tf.keras.models.load_model(
                self.model_path,
                compile=False
            )
            return model
        except Exception as e:
            raise RuntimeError(
                f"Failed to load emotion model: {e}"
            )


    def preprocess_face(self, face_img: np.ndarray) -> np.ndarray:
        """
        Prepare face image for CNN.

        - Нормализация яркости через CLAHE (опционально) для устойчивости к освещению.
        - Resize к input_size, нормализация [0, 1].
        """
        if face_img is None or face_img.size == 0:
            raise ValueError("Empty face image")

        if self.grayscale:
            if len(face_img.shape) == 3:
                face_img = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)

        # CLAHE улучшает контраст при слабом/неравномерном освещении
        if self._clahe is not None and face_img.dtype == np.uint8:
            face_img = self._clahe.apply(face_img)

        face_img = cv2.resize(face_img, self.input_size)
        face_img = face_img.astype("float32") / 255.0

        if self.grayscale:
            face_img = np.expand_dims(face_img, axis=-1)

        face_img = np.expand_dims(face_img, axis=0)
        return face_img

    # --------------------------------------------------
    # Prediction
    # --------------------------------------------------
    def predict(
        self,
        face_img: np.ndarray
    ) -> Dict:
        """
        Predict emotion from face image.

        Returns:
        {
            emotion: str,
            confidence: float,
            distribution: dict
        }
        """
        x = self.preprocess_face(face_img)

        preds = self.model.predict(x, verbose=0)[0]
        preds = preds.astype(float)

        emotion_id = int(np.argmax(preds))
        confidence = float(preds[emotion_id])
        emotion = self.EMOTIONS[emotion_id]

        distribution = {
            self.EMOTIONS[i]: float(preds[i])
            for i in range(len(self.EMOTIONS))
        }

        # Low confidence guard
        if confidence < self.confidence_threshold:
            emotion = "Uncertain"

        return {
            "emotion": emotion,
            "confidence": confidence,
            "distribution": distribution
        }

    # --------------------------------------------------
    # Batch prediction (future-proof)
    # --------------------------------------------------
    def predict_batch(
        self,
        faces: List[np.ndarray]
    ) -> List[Dict]:
        results = []
        for face in faces:
            try:
                results.append(self.predict(face))
            except Exception:
                results.append({
                    "emotion": "Error",
                    "confidence": 0.0,
                    "distribution": {}
                })
        return results
