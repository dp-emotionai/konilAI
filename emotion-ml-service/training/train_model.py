import json
import os

import numpy as np
import tensorflow as tf
from sklearn.utils.class_weight import compute_class_weight
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from tensorflow.keras.layers import (
    BatchNormalization,
    Dense,
    Dropout,
    GlobalAveragePooling2D,
)
from tensorflow.keras.models import Sequential
from tensorflow.keras.preprocessing.image import ImageDataGenerator


# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRAIN_DIR = os.path.join(BASE_DIR, "data", "train")
TEST_DIR = os.path.join(BASE_DIR, "data", "test")

# Training parameters
IMG_SIZE = (96, 96)
BATCH_SIZE = 32
NUM_CLASSES = 7
PHASE_1_EPOCHS = 10
EPOCHS = 50
MODEL_OUTPUT_PATH = "../emotion_model_custom.h5"


def load_data():
    train_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,
        rotation_range=15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        horizontal_flip=True,
        zoom_range=0.1,
        brightness_range=[0.8, 1.2],
    )

    test_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,
    )

    train_generator = train_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=IMG_SIZE,
        color_mode="rgb",
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        shuffle=True,
    )

    test_generator = test_datagen.flow_from_directory(
        TEST_DIR,
        target_size=IMG_SIZE,
        color_mode="rgb",
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        shuffle=False,
    )

    return train_generator, test_generator


def build_model():
    base_model = MobileNetV2(
        weights="imagenet",
        include_top=False,
        input_shape=(96, 96, 3),
    )

    model = Sequential(
        [
            base_model,
            GlobalAveragePooling2D(),
            Dense(256, activation="relu"),
            BatchNormalization(),
            Dropout(0.5),
            Dense(NUM_CLASSES, activation="softmax"),
        ]
    )

    return model, base_model


def make_callbacks():
    return [
        EarlyStopping(
            monitor="val_loss",
            patience=10,
            restore_best_weights=True,
        ),
        ModelCheckpoint(
            filepath=MODEL_OUTPUT_PATH,
            monitor="val_accuracy",
            save_best_only=True,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_accuracy",
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1,
        ),
    ]


if __name__ == "__main__":
    train_gen, test_gen = load_data()

    with open("class_indices.json", "w") as f:
        json.dump(train_gen.class_indices, f)
    print("Saved class_indices.json:", train_gen.class_indices)

    class_weights = compute_class_weight(
        class_weight="balanced",
        classes=np.arange(NUM_CLASSES),
        y=train_gen.classes,
    )
    class_weight_dict = dict(enumerate(class_weights))
    print("Class weights:", class_weight_dict)

    model, base_model = build_model()

    # Phase 1: train only the classification head.
    base_model.trainable = False
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    model.summary()
    print("Phase 1: training classification head")
    history_phase_1 = model.fit(
        train_gen,
        validation_data=test_gen,
        epochs=PHASE_1_EPOCHS,
        callbacks=make_callbacks(),
        class_weight=class_weight_dict,
    )

    # Phase 2: fine-tune MobileNetV2 while keeping early layers frozen.
    base_model.trainable = True
    for layer in base_model.layers[:100]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    print("Phase 2: fine-tuning MobileNetV2")
    history_phase_2 = model.fit(
        train_gen,
        validation_data=test_gen,
        initial_epoch=PHASE_1_EPOCHS,
        epochs=EPOCHS,
        callbacks=make_callbacks(),
        class_weight=class_weight_dict,
    )

    test_loss, test_acc = model.evaluate(test_gen)
    print(f"Test accuracy: {test_acc:.4f}")
