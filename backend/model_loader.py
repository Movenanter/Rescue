"""
Model loading utilities for the CPR backend
This module handles loading the trained CPR model with proper custom object registration
"""

import os
import json
import logging
import tensorflow as tf
from tensorflow import keras
import numpy as np

logger = logging.getLogger(__name__)

# Register custom objects for model loading
@tf.keras.utils.register_keras_serializable(package="CPRModel")
class CPRMetronomeModel(tf.keras.Model):
    """Multi-output regression model for CPR coaching with metronome control using CNN for images"""
    
    def __init__(self, input_shape=(224, 224, 3), num_outputs=13, **kwargs):
        super().__init__(**kwargs)
        self.input_shape = input_shape
        self.num_outputs = num_outputs
        
        # Define all the layers (matching the notebook architecture)
        # CNN layers
        self.conv1 = keras.layers.Conv2D(32, (3, 3), activation='relu', padding='same', name='conv1')
        self.bn_conv1 = keras.layers.BatchNormalization()
        self.pool1 = keras.layers.MaxPooling2D((2, 2))
        self.dropout_conv1 = keras.layers.Dropout(0.25)
        
        self.conv2 = keras.layers.Conv2D(64, (3, 3), activation='relu', padding='same', name='conv2')
        self.bn_conv2 = keras.layers.BatchNormalization()
        self.pool2 = keras.layers.MaxPooling2D((2, 2))
        self.dropout_conv2 = keras.layers.Dropout(0.25)
        
        self.conv3 = keras.layers.Conv2D(128, (3, 3), activation='relu', padding='same', name='conv3')
        self.bn_conv3 = keras.layers.BatchNormalization()
        self.pool3 = keras.layers.MaxPooling2D((2, 2))
        self.dropout_conv3 = keras.layers.Dropout(0.25)
        
        self.conv4 = keras.layers.Conv2D(256, (3, 3), activation='relu', padding='same', name='conv4')
        self.bn_conv4 = keras.layers.BatchNormalization()
        self.pool4 = keras.layers.MaxPooling2D((2, 2))
        self.dropout_conv4 = keras.layers.Dropout(0.3)
        
        # Global pooling
        self.global_pool = keras.layers.GlobalAveragePooling2D()
        
        # Dense layers
        self.feature_extraction_1 = keras.layers.Dense(512, activation='relu', name='feature_extraction_1')
        self.bn1 = keras.layers.BatchNormalization()
        self.dropout1 = keras.layers.Dropout(0.4)
        
        self.feature_extraction_2 = keras.layers.Dense(256, activation='relu', name='feature_extraction_2')
        self.bn2 = keras.layers.BatchNormalization()
        self.dropout2 = keras.layers.Dropout(0.3)
        
        self.technique_dense_1 = keras.layers.Dense(128, activation='relu', name='technique_dense_1')
        self.bn3 = keras.layers.BatchNormalization()
        self.dropout3 = keras.layers.Dropout(0.2)
        self.technique_dense_2 = keras.layers.Dense(64, activation='relu', name='technique_dense_2')
        
        self.metronome_dense_1 = keras.layers.Dense(128, activation='relu', name='metronome_dense_1')
        self.bn4 = keras.layers.BatchNormalization()
        self.dropout4 = keras.layers.Dropout(0.2)
        self.metronome_dense_2 = keras.layers.Dense(64, activation='relu', name='metronome_dense_2')
        
        self.combined_dense = keras.layers.Dense(64, activation='relu', name='combined_dense')
        
        # Output layer
        self.outputs_layer = keras.layers.Dense(self.num_outputs, activation='linear', name='outputs')

    def call(self, inputs, training=False):
        """Forward pass for image inputs"""
        # Convolutional layers
        x = self.conv1(inputs)
        x = self.bn_conv1(x, training=training)
        x = self.pool1(x)
        x = self.dropout_conv1(x, training=training)
        
        x = self.conv2(x)
        x = self.bn_conv2(x, training=training)
        x = self.pool2(x)
        x = self.dropout_conv2(x, training=training)
        
        x = self.conv3(x)
        x = self.bn_conv3(x, training=training)
        x = self.pool3(x)
        x = self.dropout_conv3(x, training=training)
        
        x = self.conv4(x)
        x = self.bn_conv4(x, training=training)
        x = self.pool4(x)
        x = self.dropout_conv4(x, training=training)
        
        # Global pooling
        x = self.global_pool(x)
        
        # Dense layers
        x = self.feature_extraction_1(x)
        x = self.bn1(x, training=training)
        x = self.dropout1(x, training=training)
        
        x = self.feature_extraction_2(x)
        x = self.bn2(x, training=training)
        x = self.dropout2(x, training=training)
        
        technique_branch = self.technique_dense_1(x)
        technique_branch = self.bn3(technique_branch, training=training)
        technique_branch = self.dropout3(technique_branch, training=training)
        technique_branch = self.technique_dense_2(technique_branch)
        
        metronome_branch = self.metronome_dense_1(x)
        metronome_branch = self.bn4(metronome_branch, training=training)
        metronome_branch = self.dropout4(metronome_branch, training=training)
        metronome_branch = self.metronome_dense_2(metronome_branch)
        
        combined = keras.layers.Concatenate()([technique_branch, metronome_branch])
        combined = self.combined_dense(combined)
        
        outputs = self.outputs_layer(combined)
        
        return outputs

    def get_config(self):
        config = super().get_config()
        config.update({
            'input_shape': self.input_shape,
            'num_outputs': self.num_outputs,
        })
        return config
    
    @classmethod
    def from_config(cls, config):
        return cls(**config)


# Register the custom loss function
@tf.keras.utils.register_keras_serializable(package="CPRModel")
def combined_loss(y_true, y_pred):
    """Combined loss function for CPR model"""
    # Simplified version for loading - the actual weights are in the trained model
    return tf.keras.losses.mean_squared_error(y_true, y_pred)


def load_cpr_model(model_path="./cpr_model.keras", weights_only=False):
    """
    Load the CPR model with proper custom object handling
    
    Args:
        model_path: Path to the saved model file
        weights_only: If True, only load weights into a new model instance
        
    Returns:
        Loaded Keras model or None if loading fails
    """
    model = None
    
    # Try different loading strategies
    if os.path.exists(model_path):
        try:
            if weights_only:
                # Create a new model instance and load weights
                weights_path = model_path.replace('.keras', '_weights.weights.h5')
                if os.path.exists(weights_path):
                    logger.info("Loading weights only...")
                    model = CPRMetronomeModel(input_shape=(224, 224, 3), num_outputs=13)
                    
                    # Build the model
                    dummy_input = tf.keras.Input(shape=(224, 224, 3))
                    _ = model(dummy_input)
                    
                    # Load weights
                    model.load_weights(weights_path)
                    
                    # Compile the model
                    model.compile(
                        optimizer='adam',
                        loss=combined_loss,
                        metrics=['mae']
                    )
                    logger.info(f"Successfully loaded weights from {weights_path}")
                else:
                    logger.error(f"Weights file not found: {weights_path}")
            else:
                # Try loading the full model with custom objects
                with tf.keras.utils.custom_object_scope({
                    'CPRMetronomeModel': CPRMetronomeModel,
                    'combined_loss': combined_loss
                }):
                    model = tf.keras.models.load_model(model_path)
                logger.info(f"Successfully loaded full model from {model_path}")
                
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            
            # Fallback: Try loading without compilation
            try:
                logger.info("Attempting to load without compilation...")
                model = tf.keras.models.load_model(model_path, compile=False)
                
                # Recompile
                model.compile(
                    optimizer='adam',
                    loss=combined_loss,
                    metrics=['mae']
                )
                logger.info("Successfully loaded and recompiled model")
                
            except Exception as e2:
                logger.error(f"All loading attempts failed: {e2}")
                model = None
    else:
        logger.error(f"Model file not found: {model_path}")
    
    return model


# Test function to verify model loading
def test_model_loading(model_path="./cpr_model.keras"):
    """Test if the model loads correctly"""
    
    print("Testing model loading...")
    
    # Test 1: Load full model
    print("\n1. Testing full model loading...")
    model = load_cpr_model(model_path, weights_only=False)
    if model:
        print("   ✓ Full model loaded successfully")
        # Test prediction
        test_input = np.random.randn(1, 224, 224, 3).astype(np.float32)
        try:
            output = model(test_input)
            print(f"   ✓ Model prediction shape: {output.shape}")
        except Exception as e:
            print(f"   ✗ Model prediction failed: {e}")
    else:
        print("   ✗ Full model loading failed")
    
    # Test 2: Load weights only
    print("\n2. Testing weights-only loading...")
    model = load_cpr_model(model_path, weights_only=True)
    if model:
        print("   ✓ Weights loaded successfully")
        # Test prediction
        test_input = np.random.randn(1, 224, 224, 3).astype(np.float32)
        try:
            output = model(test_input)
            print(f"   ✓ Model prediction shape: {output.shape}")
        except Exception as e:
            print(f"   ✗ Model prediction failed: {e}")
    else:
        print("   ✗ Weights loading failed")
    
    print("\nModel loading test complete!")


if __name__ == "__main__":
    # Run test when module is executed directly
    test_model_loading()