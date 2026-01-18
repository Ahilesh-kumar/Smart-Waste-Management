# Waste-Classification-using-TensorFlow-and-OpenCV
A deep learning-based waste classification system that classifies waste into organic and inorganic categories using Convolutional Neural Networks (CNNs). This project utilizes TensorFlow and Keras for model building and training, with real-time image prediction capabilities for waste management applications.
This project implements a binary classification model to distinguish between organic and inorganic waste using Convolutional Neural Networks (CNNs). The model is trained using images of organic and inorganic waste and achieves high accuracy in classifying the images. The project is built using TensorFlow, OpenCV, and Matplotlib.
Project Overview
Waste classification is an important task in promoting environmental sustainability. This project aims to develop a deep learning model that can classify waste into two categories:

Organic Waste
Inorganic Waste
The model uses CNN layers for feature extraction and learns from a dataset of waste images. The classification task is binary, with the model outputting a prediction between 0 and 1, where 0 represents inorganic waste and 1 represents organic waste.
Dataset
The dataset consists of images of waste divided into two categories: Organic and Inorganic.
The images are processed using OpenCV, and TensorFlow's image_dataset_from_directory() function is used to create a pipeline for training.

Model Architecture
The model consists of several convolutional layers followed by pooling layers to reduce the spatial dimensions. It uses ReLU activation functions in the convolutional layers and sigmoid activation in the final layer for binary classification. A dropout layer is added to prevent overfitting, and L2 regularization is used for regularization.

Here's a summary of the model architecture:

Conv2D layer with 16 filters, kernel size (3,3)
MaxPooling2D layer
Conv2D layer with 32 filters, kernel size (3,3)
MaxPooling2D layer
Conv2D layer with 16 filters, kernel size (3,3)
MaxPooling2D layer
Flatten layer
Dropout layer with 20% dropout rate
Dense layer with 256 units
Dense layer with 1 unit and sigmoid activation for binary classification
Training
The dataset is split into three parts:

70% Training Set
20% Validation Set
10% Test Set
The model is trained using binary crossentropy loss and Adam optimizer. Training is done for 15 epochs with the use of TensorBoard for monitoring the training process.

Evaluation
The model is evaluated on a test set, and performance metrics such as Precision, Recall, and Accuracy are calculated. These metrics help determine how well the model performs in classifying waste images.

Prediction
The model can make predictions on new waste images. The steps for making predictions include:

Loading the image.
Resizing the image to the required input size (256x256).
Normalizing the pixel values by dividing by 255.
Using the trained model to make a prediction.
Outputting whether the waste is classified as organic or inorganic.
