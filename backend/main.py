from pathlib import Path
import os
from datetime import datetime, timezone
import json, re
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE = Path(__file__).resolve().parent
MODEL_PATH = BASE / "fraud_model.pkl"
METRICS_PATH = BASE / "model_metrics.json"
FEATURES = ["amount", "transaction_hour", "previous_transactions"]

if not MODEL_PATH.exists():
    raise RuntimeError("fraud_model.pkl not found. Run train_model.py first.")
model = joblib.load(MODEL_PATH)
metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8")) if METRICS_PATH.exists() else {}

REFERENCES = {"amount": 4836.5, "transaction_hour": 12.0, "previous_transactions": 7.0}

app = FastAPI(title="PaySafe Fraud Detection API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("CLIENT_URL", "http://localhost:5173"),
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TransactionRequest(BaseModel):
    amount: float = Field(gt=0)
    recipient: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=80)
    time: str = Field(min_length=1, max_length=40)
    isNewRecipient: bool = False
    previousFrequency: int = Field(default=0, ge=0, le=100000)

def parse_hour(value: str) -> int:
    match = re.search(r"\d{1,2}", value)
    if not match: raise ValueError("Transaction time must contain an hour, e.g. 11:47 PM or 23:47.")
    hour = int(match.group(0))
    if hour > 23: raise ValueError("Invalid transaction hour.")
    pm, am = bool(re.search(r"\bpm\b", value, re.I)), bool(re.search(r"\bam\b", value, re.I))
    if (pm or am) and hour > 12: raise ValueError("12-hour time must use an hour from 1 to 12.")
    if pm and hour != 12: hour += 12
    elif am and hour == 12: hour = 0
    return hour

def probability(row: dict) -> float:
    return float(model.predict_proba(pd.DataFrame([row], columns=FEATURES))[0, 1])

def level(score: int) -> str:
    if score <= 30: return "SAFE"
    if score <= 50: return "LOW"
    if score <= 70: return "SUSPICIOUS"
    if score <= 85: return "HIGH"
    return "CRITICAL"

def severity(effect: float) -> str:
    a = abs(effect)
    return "critical" if a >= 20 else "high" if a >= 10 else "medium" if a >= 4 else "low"

def factors(row: dict):
    base = probability(REFERENCES)
    labels = {
        "amount": ("Transaction Amount", f"₹{row['amount']:,.0f}"),
        "transaction_hour": ("Transaction Time", f"{row['transaction_hour']}:00"),
        "previous_transactions": ("Transaction History", f"{row['previous_transactions']} previous transaction(s)")
    }
    out = []
    for feature in FEATURES:
        candidate = dict(REFERENCES); candidate[feature] = row[feature]
        effect = (probability(candidate) - base) * 100
        if abs(effect) < 1: continue
        title, display = labels[feature]
        direction = "increases" if effect > 0 else "reduces"
        out.append({
            "title": title, "severity": severity(effect),
            "description": f"The entered value ({display}) {direction} the model's fraud probability by about {abs(effect):.1f} percentage points versus the reference value.",
            "scoreContribution": round(abs(effect), 1)
        })
    out.sort(key=lambda x: x["scoreContribution"], reverse=True)
    return out[:4] or [{
        "title": "Model Signals Within Reference Range", "severity": "low",
        "description": "The supplied model inputs are close to their reference values, so no individual input produced a large probability shift.",
        "scoreContribution": 0
    }]

def recommendation(risk: str) -> str:
    return {
        "SAFE": "The trained model estimates low fraud probability. Continue with standard caution and verify the recipient before confirming.",
        "LOW": "The model detects some risk. Verify the amount and recipient before confirming the transaction.",
        "SUSPICIOUS": "Pause before paying. Verify the recipient through a trusted channel and re-check the transaction details.",
        "HIGH": "Do not proceed until the recipient and transaction are independently verified through a trusted channel.",
        "CRITICAL": "Do not proceed. Independently verify the recipient and transaction, and report the transaction if you confirm it is fraudulent."
    }[risk]

@app.get("/health")
def health():
    return {"status": "ok", "model": metrics.get("model", "RandomForestClassifier"), "features": FEATURES}

@app.post("/api/analyze-transaction")
def analyze_transaction(tx: TransactionRequest):
    try:
        row = {"amount": float(tx.amount), "transaction_hour": parse_hour(tx.time),
               "previous_transactions": int(tx.previousFrequency)}
        p = probability(row)
        score = int(round(p * 100))
        risk = level(score)
        return {
            "riskScore": score, "riskLevel": risk,
            "confidence": int(round(max(p, 1-p) * 100)),
            "threatType": "Fraudulent Transaction Pattern" if score > 50 else "Low-Risk Transaction Pattern",
            "factors": factors(row), "recommendation": recommendation(risk),
            "analysisSummary": f"The trained Random Forest model evaluated amount, transaction hour, and previous transaction frequency and estimated a {p*100:.1f}% probability of fraud.",
            "inputType": "transaction",
            "inputPreview": f"₹{tx.amount:,.0f} to {tx.recipient} — {tx.category} at {tx.time}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model": "RandomForestClassifier", "fraudProbability": round(p, 6)
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model analysis failed: {exc}") from exc


# ── PaySafe backend authentication ─────────────────────────────
# FastAPI handles authentication; MongoDB Atlas provides persistent user storage.
# Passwords are bcrypt-hashed and the JWT is stored in an HttpOnly cookie.

import uuid
import jwt
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from passlib.context import CryptContext
from fastapi import Cookie, Response

AUTH_SECRET = os.getenv("PAYSAFE_AUTH_SECRET", "CHANGE_ME_IN_PRODUCTION")
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "PaySafe")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_mongo_client = None

class AuthCredentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=6, max_length=128)

class SignupRequest(AuthCredentials):
    name: str = Field(min_length=1, max_length=100)

class ProfileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)

def _db():
    global _mongo_client
    if not MONGODB_URI:
        raise HTTPException(status_code=503, detail="Authentication database is not configured.")
    if _mongo_client is None:
        _mongo_client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=8000,
            connectTimeoutMS=8000,
            maxPoolSize=10,
        )
    db = _mongo_client[MONGODB_DB]
    db.command("ping")
    db["users"].create_index("email", unique=True)
    return db

def _public_user(user):
    return {"id": user["id"], "name": user["name"], "email": user["email"]}

def _issue_auth_cookie(response: Response, user_id: str):
    token = jwt.encode({"sub": user_id}, AUTH_SECRET, algorithm="HS256")
    response.set_cookie(
        "paysafe_session",
        token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )

def _current_user(session: str | None):
    if not session:
        return None
    try:
        payload = jwt.decode(session, AUTH_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = _db()["users"].find_one(
            {"id": user_id},
            {"_id": 0, "id": 1, "name": 1, "email": 1},
        )
        return user
    except Exception:
        return None

@app.post("/api/auth/signup")
def signup(request: SignupRequest, response: Response):
    email = request.email.strip().lower()
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")
    try:
        user = {
            "id": str(uuid.uuid4()),
            "name": name,
            "email": email,
            "password_hash": pwd_context.hash(request.password),
            "created_at": datetime.now(timezone.utc),
        }
        _db()["users"].insert_one(user)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=409, detail="An account with this email already exists.") from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Authentication database error: {exc}") from exc
    _issue_auth_cookie(response, user["id"])
    return {"user": _public_user(user)}

@app.post("/api/auth/login")
def login(request: AuthCredentials, response: Response):
    email = request.email.strip().lower()
    try:
        user = _db()["users"].find_one({"email": email})
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Authentication database error: {exc}") from exc
    if not user or not pwd_context.verify(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    _issue_auth_cookie(response, user["id"])
    return {"user": _public_user(user)}

@app.get("/api/auth/me")
def me(paysafe_session: str | None = Cookie(default=None)):
    user = _current_user(paysafe_session)
    return {"user": _public_user(user) if user else None}

@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("paysafe_session", path="/", secure=True, samesite="none")
    return {"ok": True}

@app.patch("/api/auth/profile")
def update_profile(request: ProfileRequest, response: Response, paysafe_session: str | None = Cookie(default=None)):
    user = _current_user(paysafe_session)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")
    try:
        _db()["users"].update_one({"id": user["id"]}, {"$set": {"name": name}})
        updated = _db()["users"].find_one({"id": user["id"]})
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Authentication database error: {exc}") from exc
    return {"user": _public_user(updated)}
