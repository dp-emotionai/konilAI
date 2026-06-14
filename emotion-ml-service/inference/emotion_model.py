import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import (
    preprocess_input as mobilenet_v2_preprocess_input,
)
from typing import Dict, List, Tuple


class CompatibleBatchNormalization(tf.keras.layers.BatchNormalization):
    """
    Compatibility wrapper for legacy BatchNormalization configs.

    Some saved H5 models contain arguments removed from Keras 3:
    renorm, renorm_clipping and renorm_momentum.
    """

    def __init__(
        self,
        *args,
        renorm: bool = False,
        renorm_clipping=None,
        renorm_momentum: float = 0.99,
        **kwargs,
    ):
        del renorm, renorm_clipping, renorm_momentum
        super().__init__(*args, **kwargs)


class CompatibleDense(tf.keras.layers.Dense):
    """
    Compatibility wrapper for Dense configs saved by a newer Keras version.

    Some H5 models contain quantization_config=None, while the Dense layer
    bundled with TensorFlow 2.16 does not accept that keyword.
    """

    def __init__(
        self,
        *args,
        quantization_config=None,
        **kwargs,
    ):
        del quantization_config
        super().__init__(*args, **kwargs)


class EmotionModel:
    """
    Emotion inference engine.

    Loads a CNN model and performs emotion prediction on face crops.
    The actual model input size and number of channels are detected
    automatically after loading.
    """

    EMOTIONS = [
        "Angry",
        "Disgust",
        "Fear",
        "Happy",
        "Neutral",
        "Sad",
        "Surprise",
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

        self._clahe = (
            cv2.createCLAHE(
                clipLimit=2.0,
                tileGridSize=(8, 8),
            )
            if use_clahe
            else None
        )

        self.model = self._load_model()
        self._configure_input_from_model()

    def _load_model(self) -> tf.keras.Model:
        try:
            model = tf.keras.models.load_model(
                self.model_path,
                compile=False,
                custom_objects={
                    "BatchNormalization": CompatibleBatchNormalization,
                    "CompatibleBatchNormalization": CompatibleBatchNormalization,
                    "Dense": CompatibleDense,
                    "CompatibleDense": CompatibleDense,
                },
            )

            print(
                "Emotion model loaded successfully",
                flush=True,
            )

            return model

        except Exception as exc:
            raise RuntimeError(
                f"Failed to load emotion model: {exc}"
            ) from exc

    def _configure_input_from_model(self) -> None:
        input_shape = self.model.input_shape

        if isinstance(input_shape, list):
            if not input_shape:
                raise RuntimeError(
                    "Emotion model has no input shape"
                )
            input_shape = input_shape[0]

        if not isinstance(input_shape, tuple):
            input_shape = tuple(input_shape)

        if len(input_shape) != 4:
            raise RuntimeError(
                "Expected model input shape "
                f"(batch, height, width, channels), got {input_shape}"
            )

        _, height, width, channels = input_shape

        if height is None or width is None or channels is None:
            raise RuntimeError(
                f"Model input shape must be fully defined, got {input_shape}"
            )

        self.input_size = (
            int(width),
            int(height),
        )
        self.grayscale = int(channels) == 1

        print(
            "Emotion model configuration:",
            {
                "input_shape": input_shape,
                "output_shape": self.model.output_shape,
                "input_size": self.input_size,
                "grayscale": self.grayscale,
            },
            flush=True,
        )

    def preprocess_face(
        self,
        face_img: np.ndarray,
    ) -> np.ndarray:
        """
        Prepare a face image for the CNN.

        The image is converted to the channel format expected by the
        loaded model and resized to the detected model input size.

        Grayscale models receive values in the [0, 1] range. RGB models
        use the same MobileNetV2 preprocessing as the training pipeline
        (approximately [-1, 1]).
        """
        if face_img is None or face_img.size == 0:
            raise ValueError("Empty face image")

        if self.grayscale:
            if face_img.ndim == 3:
                if face_img.shape[-1] == 4:
                    face_img = cv2.cvtColor(
                        face_img,
                        cv2.COLOR_BGRA2GRAY,
                    )
                else:
                    face_img = cv2.cvtColor(
                        face_img,
                        cv2.COLOR_BGR2GRAY,
                    )

            if (
                self._clahe is not None
                and face_img.dtype == np.uint8
            ):
                face_img = self._clahe.apply(face_img)

        else:
            if face_img.ndim == 2:
                face_img = cv2.cvtColor(
                    face_img,
                    cv2.COLOR_GRAY2RGB,
                )
            elif face_img.ndim == 3:
                if face_img.shape[-1] == 4:
                    face_img = cv2.cvtColor(
                        face_img,
                        cv2.COLOR_BGRA2RGB,
                    )
                elif face_img.shape[-1] == 3:
                    face_img = cv2.cvtColor(
                        face_img,
                        cv2.COLOR_BGR2RGB,
                    )
                else:
                    raise ValueError(
                        f"Unsupported channel count: {face_img.shape[-1]}"
                    )
            else:
                raise ValueError(
                    f"Unsupported face image shape: {face_img.shape}"
                )

        face_img = cv2.resize(
            face_img,
            self.input_size,
            interpolation=cv2.INTER_AREA,
        )

        face_img = face_img.astype(
            np.float32
        )

        if self.grayscale:
            face_img /= 255.0
        else:
            face_img = mobilenet_v2_preprocess_input(
                face_img
            )

        if self.grayscale and face_img.ndim == 2:
            face_img = np.expand_dims(
                face_img,
                axis=-1,
            )

        face_img = np.expand_dims(
            face_img,
            axis=0,
        )

        return face_img

    def predict(
        self,
        face_img: np.ndarray,
    ) -> Dict:
        """
        Predict emotion from one face image.
        """
        model_input = self.preprocess_face(
            face_img
        )

        predictions = self.model.predict(
            model_input,
            verbose=0,
        )

        if isinstance(predictions, list):
            if not predictions:
                raise RuntimeError(
                    "Emotion model returned no predictions"
                )
            predictions = predictions[0]

        predictions = np.asarray(
            predictions
        )

        if predictions.ndim == 2:
            predictions = predictions[0]
        else:
            predictions = predictions.reshape(-1)

        if predictions.size != len(self.EMOTIONS):
            raise RuntimeError(
                "Emotion model output size does not match labels: "
                f"expected {len(self.EMOTIONS)}, got {predictions.size}"
            )

        predictions = predictions.astype(
            float
        )

        emotion_id = int(
            np.argmax(predictions)
        )
        confidence = float(
            predictions[emotion_id]
        )
        emotion = self.EMOTIONS[
            emotion_id
        ]

        distribution = {
            label: float(predictions[index])
            for index, label in enumerate(
                self.EMOTIONS
            )
        }

        if confidence < self.confidence_threshold:
            emotion = "Uncertain"

        return {
            "emotion": emotion,
            "confidence": confidence,
            "distribution": distribution,
        }

    def predict_batch(
        self,
        faces: List[np.ndarray],
    ) -> List[Dict]:
        results: List[Dict] = []

        for face in faces:
            try:
                results.append(
                    self.predict(face)
                )
            except Exception as exc:
                results.append(
                    {
                        "emotion": "Error",
                        "confidence": 0.0,
                        "distribution": {},
                        "error": str(exc),
                    }
                )

        return results
