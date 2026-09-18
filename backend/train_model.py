from pathlib import Path
import json
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.pipeline import Pipeline
import joblib

BASE = Path(__file__).resolve().parent
DATASET = BASE.parent / "paysafe_ds" / "paysafe_transactions_1000.csv"
MODEL_PATH = BASE / "fraud_model.pkl"
METRICS_PATH = BASE / "model_metrics.json"
FEATURES = ["amount", "transaction_hour", "previous_transactions"]

def main():
    df = pd.read_csv(DATASET)
    X, y = df[FEATURES], df["fraud"].astype(int)
    model = Pipeline([("classifier", RandomForestClassifier(
        n_estimators=500, min_samples_leaf=3, class_weight="balanced",
        random_state=42, n_jobs=-1
    ))])
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scoring = ["accuracy", "precision", "recall", "f1", "roc_auc", "average_precision"]
    scores = cross_validate(model, X, y, cv=cv, scoring=scoring)
    model.fit(X, y)
    joblib.dump(model, MODEL_PATH, compress=3)
    metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8")) if METRICS_PATH.exists() else {}
    metrics["cross_validation"]["metrics_mean"] = {
        m: round(float(scores[f"test_{m}"].mean()), 6) for m in scoring
    }
    metrics["cross_validation"]["metrics_std"] = {
        m: round(float(scores[f"test_{m}"].std()), 6) for m in scoring
    }
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))

if __name__ == "__main__":
    main()
