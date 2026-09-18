#!/usr/bin/env python3
"""
PaySafe Fraud Detection — Backend API Server
=============================================
Flask API that loads the trained model (fraud_model.pkl) and serves
real-time transaction fraud predictions.

Endpoint: POST /api/analyze-transaction
"""

import os
import sys
import joblib
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "fraud_model.pkl")
METRICS_PATH = os.path.join(MODEL_DIR, "evaluation_metrics.json")

app = Flask(__name__)

# Load trained model at startup
model = joblib.load(MODEL_PATH)
print(f"Loaded model from {MODEL_PATH}", file=sys.stderr)

# Load feature info
FEATURES = ['amount', 'payment_type', 'location', 'device', 'transaction_hour', 'previous_transactions']
NUMERICAL = ['amount', 'transaction_hour', 'previous_transactions']
CATEGORICAL = ['payment_type', 'location', 'device']

# Valid categorical values (from training data)
VALID_PAYMENT_TYPES = ['Card', 'UPI', 'Net Banking', 'Wallet']
VALID_LOCATIONS = ['Jaipur', 'Delhi', 'Pune', 'Hyderabad', 'Bengaluru', 'Kolkata', 'Mumbai', 'Indore']
VALID_DEVICES = ['Mobile', 'Desktop', 'Tablet']


@app.route('/api/analyze-transaction', methods=['POST'])
def analyze_transaction():
    """Analyze a transaction for fraud risk using the trained ML model."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON body'}), 400

    # Validate required fields
    errors = []
    for field in FEATURES:
        if field not in data:
            errors.append(f'Missing field: {field}')
    if errors:
        return jsonify({'error': 'Validation failed', 'details': errors}), 400

    # Validate types
    try:
        amount = float(data['amount'])
        if amount < 0:
            errors.append('amount must be non-negative')
    except (ValueError, TypeError):
        errors.append('amount must be a number')

    try:
        transaction_hour = int(data['transaction_hour'])
        if transaction_hour < 0 or transaction_hour > 23:
            errors.append('transaction_hour must be 0-23')
    except (ValueError, TypeError):
        errors.append('transaction_hour must be an integer 0-23')

    try:
        previous_transactions = int(data['previous_transactions'])
        if previous_transactions < 0:
            errors.append('previous_transactions must be non-negative')
    except (ValueError, TypeError):
        errors.append('previous_transactions must be an integer')

    if data.get('payment_type') not in VALID_PAYMENT_TYPES:
        errors.append(f'payment_type must be one of: {VALID_PAYMENT_TYPES}')
    if data.get('location') not in VALID_LOCATIONS:
        errors.append(f'location must be one of: {VALID_LOCATIONS}')
    if data.get('device') not in VALID_DEVICES:
        errors.append(f'device must be one of: {VALID_DEVICES}')

    if errors:
        return jsonify({'error': 'Validation failed', 'details': errors}), 400

    # Build input dataframe
    sample = pd.DataFrame([{
        'amount': amount,
        'payment_type': data['payment_type'],
        'location': data['location'],
        'device': data['device'],
        'transaction_hour': transaction_hour,
        'previous_transactions': previous_transactions,
    }])

    # Run prediction
    prediction = int(model.predict(sample)[0])
    fraud_probability = float(model.predict_proba(sample)[0, 1])

    # Determine status and risk score
    if prediction == 1:
        status = 'HIGH RISK'
    elif fraud_probability > 0.3:
        status = 'SUSPICIOUS'
    else:
        status = 'SAFE'

    risk_score = round(fraud_probability * 100)

    # Feature contributions (rule-based explainability alongside ML)
    explanations = []
    if amount >= 25000:
        explanations.append(f'High transaction amount (₹{int(amount):,}) increases fraud risk.')
    elif amount >= 15000:
        explanations.append(f'Elevated transaction amount (₹{int(amount):,}) may indicate risk.')
    if transaction_hour >= 22 or transaction_hour < 6:
        explanations.append(f'Transaction at hour {transaction_hour} (late night) is unusual for legitimate activity.')
    if previous_transactions <= 2:
        explanations.append(f'Low previous transaction count ({previous_transactions}) indicates new or infrequent recipient.')
    if prediction == 1 and not explanations:
        explanations.append('The ML model detected fraud patterns based on combined transaction features.')

    return jsonify({
        'prediction': 'fraud' if prediction == 1 else 'legitimate',
        'fraud_probability': round(fraud_probability, 4),
        'risk_score': risk_score,
        'status': status,
        'model': 'Gradient Boosting (sklearn)',
        'features_used': FEATURES,
        'explanations': explanations,
    })


@app.route('/api/model-info', methods=['GET'])
def model_info():
    """Return model metadata and evaluation metrics."""
    import json
    info = {
        'model_type': 'GradientBoostingClassifier',
        'features': FEATURES,
        'numerical_features': NUMERICAL,
        'categorical_features': CATEGORICAL,
        'valid_payment_types': VALID_PAYMENT_TYPES,
        'valid_locations': VALID_LOCATIONS,
        'valid_devices': VALID_DEVICES,
    }
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH) as f:
            metrics = json.load(f)
        info['metrics'] = metrics
    return jsonify(info)


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model_loaded': model is not None})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
