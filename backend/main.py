from pathlib import Path
import os
from datetime import datetime, timezone
import json, re, socket
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

class QRPaymentRequest(BaseModel):
    network: str = Field(default="UPI", min_length=1, max_length=40)
    paymentAddress: str = Field(default="", max_length=2048)
    upiId: str = Field(default="", max_length=254)
    recipientName: str = Field(default="", max_length=200)
    amount: float = Field(default=0, ge=0)
    currency: str = Field(default="INR", max_length=10)
    note: str = Field(default="", max_length=500)
    merchantCity: str = Field(default="", max_length=120)
    country: str = Field(default="", max_length=10)
    reference: str = Field(default="", max_length=200)

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


# ── Payment QR verification ────────────────────────────────────
@app.post("/api/verify-upi")
def verify_payment_qr(qr: QRPaymentRequest):
    try:
        amount = float(qr.amount or 0)
        # The trained fraud model uses amount/time/history. For a QR payment
        # we only have the amount, so keep the other signals at neutral
        # reference values rather than inventing transaction history.
        row = {
            "amount": amount if amount > 0 else REFERENCES["amount"],
            "transaction_hour": datetime.now().hour,
            "previous_transactions": REFERENCES["previous_transactions"],
        }
        p = probability(row)
        score = int(round(p * 100))
        risk = level(score)

        network = qr.network.upper()
        is_url = bool(re.match(r"^https?://", qr.paymentAddress or "", re.I))
        extra_factors = factors(row)

        if network == "DUITNOW":
            extra_factors.insert(0, {
                "title": "DuitNow Payment QR",
                "severity": "low",
                "description": f"Malaysia DuitNow payment QR detected for {qr.recipientName or 'merchant'} in {qr.currency or 'MYR'}.",
                "scoreContribution": 0,
            })
        elif network == "EMV_PAYMENT_QR":
            extra_factors.insert(0, {
                "title": "EMV Payment QR",
                "severity": "low",
                "description": "An EMV merchant-presented payment QR was decoded successfully.",
                "scoreContribution": 0,
            })
        elif is_url:
            extra_factors.insert(0, {
                "title": "Payment URL QR",
                "severity": "medium",
                "description": "The QR contains a payment webpage URL. Verify the destination before entering payment information.",
                "scoreContribution": 5,
            })

        if qr.country and qr.country.upper() not in {"IN", "MY"}:
            extra_factors.insert(0, {
                "title": "International Payment QR",
                "severity": "medium",
                "description": f"The QR identifies country code {qr.country.upper()}. Confirm the merchant and currency before paying.",
                "scoreContribution": 5,
            })

        return {
            "riskResult": {
                "riskScore": score,
                "riskLevel": risk,
                "confidence": int(round(max(p, 1 - p) * 100)),
                "threatType": "Payment QR Risk Pattern" if score > 50 else "Payment QR",
                "factors": extra_factors[:6],
                "recommendation": recommendation(risk),
                "analysisSummary": (
                    f"PaySafe decoded a {qr.network} payment QR and evaluated the available "
                    f"transaction signals. Merchant: {qr.recipientName or 'Not provided'}; "
                    f"amount: {qr.currency or ''} {amount:g}."
                ),
                "inputType": "qr",
                "inputPreview": f"{qr.network}: {qr.paymentAddress or qr.recipientName or 'payment QR'}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "model": "RandomForestClassifier",
                "fraudProbability": round(p, 6),
            }
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Payment QR verification failed: {exc}") from exc



# ── Payment link analyzer ──────────────────────────────────────
class LinkRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)

SUSPICIOUS_TLDS = {"xyz", "tk", "ru", "cn", "info", "biz", "cc", "gq", "ml", "cf"}
FINANCIAL_TERMS = {"payment", "pay", "secure", "verify", "bank", "kyc", "transaction", "upi", "wallet", "login", "account"}
KNOWN_BANKS = {
    "sbi": {"sbi.co.in", "onlinesbi.sbi"},
    "hdfc": {"hdfcbank.com"},
    "icici": {"icicibank.com"},
    "axis": {"axisbank.com"},
    "pnb": {"pnbindia.in"},
    "kotak": {"kotak.com"},
    "rbi": {"rbi.org.in"},
}

def _link_level(score: int) -> str:
    return "SAFE" if score <= 30 else "LOW" if score <= 50 else "SUSPICIOUS" if score <= 70 else "HIGH" if score <= 85 else "CRITICAL"

def _link_severity(points: int) -> str:
    return "critical" if points >= 24 else "high" if points >= 16 else "medium" if points >= 8 else "low"

@app.post("/api/analyze-link")
def analyze_link(request: LinkRequest):
    raw = request.url.strip()
    if not re.match(r"^https?://", raw, re.I):
        raise HTTPException(status_code=400, detail="Enter a valid URL including https://")
    parsed = urlparse(raw)
    hostname = (parsed.hostname or "").lower().rstrip(".")
    if not hostname:
        raise HTTPException(status_code=400, detail="Could not determine the link domain.")

    factors = []
    score = 0

    if parsed.scheme.lower() != "https":
        points = 12
        score += points
        factors.append({"title":"No HTTPS Encryption","severity":"medium","description":"The link does not use HTTPS.","scoreContribution":points})

    labels = hostname.split(".")
    tld = labels[-1] if labels else ""
    if tld in SUSPICIOUS_TLDS:
        points = 14
        score += points
        factors.append({"title":"Suspicious TLD","severity":"high","description":f"The domain uses the .{tld} top-level domain, which can be associated with abusive registrations.","scoreContribution":points})

    hyphens = hostname.count("-")
    if hyphens >= 2:
        points = 18
        score += points
        factors.append({"title":"Deceptive Domain Structure","severity":"high","description":"The domain contains multiple hyphens, which can be used in lookalike phishing domains.","scoreContribution":points})

    if len(labels) >= 4:
        points = 8
        score += points
        factors.append({"title":"Unusual Subdomain Structure","severity":"medium","description":"The link contains several domain/subdomain levels; verify the registered domain carefully.","scoreContribution":points})

    path_lower = (parsed.path + "?" + parsed.query).lower()
    hits = sorted({term for term in FINANCIAL_TERMS if term in path_lower or term in hostname})
    if len(hits) >= 2:
        points = 10
        score += points
        factors.append({"title":"Financial Keyword Clustering","severity":"medium","description":f"The URL contains multiple financial/security terms: {', '.join(hits[:5])}.","scoreContribution":points})

    for bank, official_domains in KNOWN_BANKS.items():
        if bank in hostname and hostname not in official_domains and not any(hostname.endswith("." + d) for d in official_domains):
            points = 28
            score += points
            factors.append({"title":"Brand Impersonation","severity":"critical","description":f"The domain references {bank.upper()} but does not match its known official domain pattern.","scoreContribution":points})
            break

    # Live DNS signal: a domain that cannot resolve is not automatically fraudulent,
    # but it is a useful warning for payment links.
    dns_ok = True
    try:
        socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)
    except Exception:
        dns_ok = False
        points = 16
        score += points
        factors.append({"title":"Domain Does Not Resolve","severity":"high","description":"The hostname could not be resolved by DNS from the backend.","scoreContribution":points})

    # RDAP gives registration data without visiting the payment page itself.
    registration_age_days = None
    rdap_source = None
    try:
        async def fetch_rdap():
            async with httpx.AsyncClient(timeout=5.0, follow_redirects=True, headers={"User-Agent":"PaySafe-Link-Analyzer/1.0"}) as client:
                return await client.get(f"https://rdap.org/domain/{hostname}")
        rdap_response = __import__("asyncio").run(fetch_rdap())
        if rdap_response.status_code == 200:
            data = rdap_response.json()
            rdap_source = data.get("ldhName", hostname)
            events = {e.get("eventAction"): e.get("eventDate") for e in data.get("events", [])}
            created = events.get("registration") or events.get("registered")
            if created:
                created_dt = datetime.fromisoformat(created.replace("Z","+00:00"))
                registration_age_days = max(0, (datetime.now(timezone.utc) - created_dt).days)
                if registration_age_days < 30:
                    points = 22
                    score += points
                    factors.append({"title":"Very New Domain","severity":"high","description":f"The domain appears to have been registered about {registration_age_days} day(s) ago.","scoreContribution":points})
                elif registration_age_days < 90:
                    points = 12
                    score += points
                    factors.append({"title":"Recently Registered Domain","severity":"medium","description":f"The domain appears to be about {registration_age_days} day(s) old.","scoreContribution":points})
    except Exception:
        pass

    if not factors:
        points = 6
        score += points
        factors.append({"title":"No Major Suspicious Indicators","severity":"low","description":"No strong structural or live registration indicators were detected.","scoreContribution":points})

    score = min(100, score)
    risk = _link_level(score)
    confidence = min(98, 55 + len(factors) * 7 + (10 if registration_age_days is not None else 0))
    recommendation = {
        "SAFE":"The URL shows no major risk indicators. Still verify the domain before entering payment details.",
        "LOW":"Some risk indicators are present. Verify the domain before proceeding.",
        "SUSPICIOUS":"Do not enter payment information. Verify the URL through the official service.",
        "HIGH":"Do not enter information or make a payment through this link. Use the official app or website instead.",
        "CRITICAL":"Do not use this link. Do not enter financial information. Access the service through its official app or website."
    }[risk]

    factors.sort(key=lambda x:x["scoreContribution"], reverse=True)
    return {"riskResult":{
        "riskScore":score,"riskLevel":risk,"confidence":confidence,
        "threatType":"Suspicious Payment URL" if risk not in {"SAFE","LOW"} else "Payment URL",
        "factors":factors[:6],
        "recommendation":recommendation,
        "analysisSummary":f"Live link analysis evaluated URL structure, DNS resolution, and domain registration signals{f' for {rdap_source}' if rdap_source else ''}.",
        "inputType":"url","inputPreview":raw[:200],"timestamp":datetime.now(timezone.utc).isoformat()
    }}



# ── PaySafe backend authentication ─────────────────────────────
# FastAPI handles authentication; MongoDB Atlas provides persistent user storage.
# Passwords are bcrypt-hashed and the JWT is stored in an HttpOnly cookie.

import uuid
import jwt
from urllib.parse import quote_plus, unquote_plus
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from fastapi import Cookie, Response

AUTH_SECRET = os.getenv("PAYSAFE_AUTH_SECRET", "CHANGE_ME_IN_PRODUCTION")
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "PaySafe")
import bcrypt
import httpx
from urllib.parse import urlparse

_mongo_client = None

class AuthCredentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=6, max_length=128)

class SignupRequest(AuthCredentials):
    name: str = Field(min_length=1, max_length=100)

class ProfileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)

def _encoded_mongodb_uri(uri: str) -> str:
    """Escape MongoDB URI credentials so special characters in Atlas passwords work."""
    if "://" not in uri or "@" not in uri:
        return uri
    scheme, rest = uri.split("://", 1)
    userinfo, host = rest.rsplit("@", 1)
    if ":" not in userinfo:
        return uri
    username, password = userinfo.split(":", 1)
    username = quote_plus(unquote_plus(username))
    password = quote_plus(unquote_plus(password))
    return f"{scheme}://{username}:{password}@{host}"

def _db():
    global _mongo_client
    if not MONGODB_URI:
        raise HTTPException(status_code=503, detail="Authentication database is not configured.")
    if _mongo_client is None:
        _mongo_client = MongoClient(
            _encoded_mongodb_uri(MONGODB_URI),
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
            "password_hash": bcrypt.hashpw(request.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
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
    if not user or not bcrypt.checkpw(request.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
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
