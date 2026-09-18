#!/usr/bin/env python3
"""
PaySafe Fraud Detection — ML Training Pipeline
==============================================
Step 1: Dataset analysis
Step 2: Preprocessing pipeline
Step 3: Model training (Logistic Regression, Random Forest, Gradient Boosting)
Step 4: Model evaluation (Accuracy, Precision, Recall, F1, ROC-AUC, Confusion Matrix)
Step 5: Save model as fraud_model.pkl + export model JSON for browser inference
"""

import json
import sys
import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)
import joblib

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "paysafe_transactions_1000.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# ── STEP 1: Dataset Analysis ──────────────────────────────────────

print("=" * 70)
print("STEP 1: DATASET ANALYSIS")
print("=" * 70)

df = pd.read_csv(DATA_PATH)
print(f"\nShape: {df.shape}")
print(f"\nColumns: {list(df.columns)}")
print(f"\nData types:\n{df.dtypes}")
print(f"\nMissing values:\n{df.isnull().sum()}")
print(f"\nDuplicate rows: {df.duplicated().sum()}")

class_counts = df['fraud'].value_counts()
print(f"\nClass distribution:")
print(f"  Legitimate (0): {class_counts[0]} ({class_counts[0]/len(df)*100:.1f}%)")
print(f"  Fraud (1):      {class_counts[1]} ({class_counts[1]/len(df)*100:.1f}%)")
print(f"  Imbalance ratio: {class_counts[0]/class_counts[1]:.2f}:1")

print(f"\nNumerical features summary:")
num_cols = ['amount', 'transaction_hour', 'previous_transactions']
print(df[num_cols].describe())

print(f"\nCategorical features:")
cat_cols = ['payment_type', 'location', 'device']
for c in cat_cols:
    print(f"  {c}: {df[c].unique().tolist()}")

print(f"\nExcluded from features: transaction_id (identifier — data leakage risk)")
print(f"Target: fraud (binary)")

# ── STEP 2: Preprocessing ─────────────────────────────────────────

print("\n" + "=" * 70)
print("STEP 2: PREPROCESSING PIPELINE")
print("=" * 70)

FEATURES = ['amount', 'payment_type', 'location', 'device', 'transaction_hour', 'previous_transactions']
TARGET = 'fraud'

X = df[FEATURES]
y = df[TARGET]

numerical = ['amount', 'transaction_hour', 'previous_transactions']
categorical = ['payment_type', 'location', 'device']

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numerical),
        ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical),
    ]
)

print(f"\nFeatures used: {FEATURES}")
print(f"Numerical (StandardScaler): {numerical}")
print(f"Categorical (OneHotEncoder): {categorical}")
print(f"Excluded: transaction_id")

# Stratified train/test split (80/20)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"\nTrain set: {X_train.shape[0]} samples (fraud: {y_train.sum()})")
print(f"Test set:  {X_test.shape[0]} samples (fraud: {y_test.sum()})")

# ── STEP 3: Model Training ────────────────────────────────────────

print("\n" + "=" * 70)
print("STEP 3: MODEL TRAINING")
print("=" * 70)

models = {
    'Logistic Regression': Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42)),
    ]),
    'Random Forest': Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(
            n_estimators=200, max_depth=10, class_weight='balanced',
            random_state=42, n_jobs=-1
        )),
    ]),
    'Gradient Boosting': Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', GradientBoostingClassifier(
            n_estimators=200, max_depth=5, learning_rate=0.1,
            random_state=42
        )),
    ]),
}

# Cross-validation on training data
print("\nCross-validation (5-fold stratified) on training data:")
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_results = {}
for name, model in models.items():
    scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='f1')
    cv_results[name] = scores
    print(f"  {name}: F1 = {scores.mean():.4f} ± {scores.std():.4f}")

# ── STEP 4: Model Evaluation ──────────────────────────────────────

print("\n" + "=" * 70)
print("STEP 4: MODEL EVALUATION")
print("=" * 70)

results = {}
trained_models = {}

for name, model in models.items():
    model.fit(X_train, y_train)
    trained_models[name] = model
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc = roc_auc_score(y_test, y_proba)
    cm = confusion_matrix(y_test, y_pred)

    results[name] = {
        'accuracy': acc, 'precision': prec, 'recall': rec,
        'f1': f1, 'roc_auc': roc, 'confusion_matrix': cm.tolist(),
    }

    print(f"\n  {name}:")
    print(f"    Accuracy:  {acc:.4f}")
    print(f"    Precision: {prec:.4f}  (fraud class)")
    print(f"    Recall:    {rec:.4f}  (fraud class)")
    print(f"    F1-score:  {f1:.4f}  (fraud class)")
    print(f"    ROC-AUC:   {roc:.4f}")
    print(f"    Confusion Matrix: {cm.tolist()}")

# Select best model based on fraud-class F1-score
print("\n" + "-" * 40)
print("Model Comparison (sorted by fraud-class F1-score):")
sorted_results = sorted(results.items(), key=lambda x: x[1]['f1'], reverse=True)
for rank, (name, r) in enumerate(sorted_results, 1):
    print(f"  {rank}. {name}: F1={r['f1']:.4f}, Recall={r['recall']:.4f}, ROC-AUC={r['roc_auc']:.4f}")

best_name = sorted_results[0][0]
best_model = trained_models[best_name]
best_metrics = results[best_name]

print(f"\nSELECTED MODEL: {best_name}")
print(f"  Reason: Highest fraud-class F1-score ({best_metrics['f1']:.4f})")
print(f"  Recall: {best_metrics['recall']:.4f} (catches {best_metrics['recall']*100:.1f}% of frauds)")
print(f"  ROC-AUC: {best_metrics['roc_auc']:.4f}")

# ── STEP 5: Save Model ────────────────────────────────────────────

print("\n" + "=" * 70)
print("STEP 5: SAVING MODEL")
print("=" * 70)

pkl_path = os.path.join(MODEL_DIR, "fraud_model.pkl")
joblib.dump(best_model, pkl_path)
print(f"\nSaved sklearn pipeline to: {pkl_path}")

# Export model as JSON for browser-side inference (production-safe artifact)
# This exports the trained model's internal parameters so predictions can be
# made in JavaScript without Python. For Random Forest and Gradient Boosting,
# we export tree structures. For Logistic Regression, we export coefficients.

def export_model_json(pipeline, model_name, metrics, features, numerical, categorical):
    """Export trained model to JSON for browser inference."""
    pre = pipeline.named_steps['preprocessor']
    clf = pipeline.named_steps['classifier']

    # Export preprocessor state
    scaler = pre.named_transformers_['num']
    encoder = pre.named_transformers_['cat']

    scaler_data = {
        'mean_': scaler.mean_.tolist(),
        'scale_': scaler.scale_.tolist(),
        'feature_names': numerical,
    }

    cat_categories = encoder.categories_
    encoder_data = {
        'categories': [c.tolist() for c in cat_categories],
        'feature_names': categorical,
    }

    # Export classifier
    clf_data = {}
    clf_type = type(clf).__name__

    if clf_type == 'RandomForestClassifier':
        clf_data = {
            'type': 'random_forest',
            'n_estimators': clf.n_estimators,
            'classes_': clf.classes_.tolist(),
            'trees': [export_tree(tree) for tree in clf.estimators_],
        }
    elif clf_type == 'GradientBoostingClassifier':
        # For binary classification, sklearn uses a single set of trees
        clf_data = {
            'type': 'gradient_boosting',
            'n_estimators': clf.n_estimators,
            'learning_rate': clf.learning_rate,
            'classes_': clf.classes_.tolist(),
            'init_': export_init(clf.init_, clf.classes_),
            'trees': [[export_tree(t) for t in stage] for stage in clf.estimators_],
        }
    elif clf_type == 'LogisticRegression':
        clf_data = {
            'type': 'logistic_regression',
            'classes_': clf.classes_.tolist(),
            'coef_': clf.coef_.tolist(),
            'intercept_': clf.intercept_.tolist(),
        }

    return {
        'model_type': clf_type,
        'model_name': model_name,
        'features': features,
        'numerical_features': numerical,
        'categorical_features': categorical,
        'preprocessor': {
            'scaler': scaler_data,
            'encoder': encoder_data,
        },
        'classifier': clf_data,
        'metrics': metrics,
        'training_info': {
            'n_samples': len(df),
            'n_train': len(X_train),
            'n_test': len(X_test),
            'class_distribution': {
                'legitimate': int(class_counts[0]),
                'fraud': int(class_counts[1]),
            },
        },
    }


def export_tree(tree):
    """Export a single sklearn DecisionTree to JSON."""
    t = tree.tree_
    return {
        'feature': t.feature.tolist(),
        'threshold': t.threshold.tolist(),
        'children_left': t.children_left.tolist(),
        'children_right': t.children_right.tolist(),
        'value': t.value.tolist(),
        'impurity': t.impurity.tolist(),
        'n_node_samples': t.n_node_samples.tolist(),
    }


def export_init(init, classes_):
    """Export the init estimator for GradientBoosting."""
    if hasattr(init, 'class_prior_'):
        return {'type': 'prior', 'class_prior_': init.class_prior_.tolist()}
    return {'type': 'unknown'}


model_json = export_model_json(best_model, best_name, best_metrics, FEATURES, numerical, categorical)
json_path = os.path.join(MODEL_DIR, "fraud_model.json")
with open(json_path, "w") as f:
    json.dump(model_json, f)
print(f"Exported model JSON to: {json_path}")

# Save evaluation metrics
metrics_path = os.path.join(MODEL_DIR, "evaluation_metrics.json")
all_metrics = {}
for name, r in results.items():
    all_metrics[name] = {k: v for k, v in r.items()}
all_metrics['_selected'] = best_name
all_metrics['_cv_results'] = {k: v.tolist() for k, v in cv_results.items()}
with open(metrics_path, "w") as f:
    json.dump(all_metrics, f, indent=2)
print(f"Saved evaluation metrics to: {metrics_path}")

# ── Verify: Test with real rows from CSV ──────────────────────────

print("\n" + "=" * 70)
print("VERIFICATION: Testing with real CSV rows")
print("=" * 70)

test_cases = [
    ("T00001 (legitimate)", {'amount': 6640, 'payment_type': 'Card', 'location': 'Jaipur', 'device': 'Mobile', 'transaction_hour': 23, 'previous_transactions': 3}, 0),
    ("T00009 (fraud)", {'amount': 3158, 'payment_type': 'Wallet', 'location': 'Delhi', 'device': 'Mobile', 'transaction_hour': 1, 'previous_transactions': 10}, 1),
    ("T00032 (fraud)", {'amount': 48892, 'payment_type': 'Card', 'location': 'Pune', 'device': 'Desktop', 'transaction_hour': 4, 'previous_transactions': 9}, 1),
    ("T00004 (legitimate)", {'amount': 15464, 'payment_type': 'Wallet', 'location': 'Pune', 'device': 'Mobile', 'transaction_hour': 6, 'previous_transactions': 10}, 0),
    ("T01000 (fraud)", {'amount': 33927, 'payment_type': 'Net Banking', 'location': 'Bengaluru', 'device': 'Desktop', 'transaction_hour': 0, 'previous_transactions': 12}, 1),
]

for label, sample, expected in test_cases:
    sample_df = pd.DataFrame([sample])
    pred = best_model.predict(sample_df)[0]
    proba = best_model.predict_proba(sample_df)[0, 1]
    status = "CORRECT" if pred == expected else "MISMATCH"
    print(f"  {label}: predicted={int(pred)} (prob={proba:.4f}), actual={expected} -> {status}")

print("\n" + "=" * 70)
print("TRAINING PIPELINE COMPLETE")
print("=" * 70)
