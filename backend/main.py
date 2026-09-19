from pathlib import Path
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
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False,
                   allow_methods=["*"], allow_headers=["*"])

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


# ── Live link reputation + UPI verification services ─────────────
# These endpoints deliberately do not fabricate reputation/UPI ownership.
# Domain registration data is fetched from RDAP.org. Optional Google Safe
# Browsing and external UPI verification can be enabled with server env vars.
import os
import socket
from urllib.parse import urlparse
from urllib.request import Request, urlopen

def _http_json(url: str, headers: dict | None = None, timeout: int = 8):
    req = Request(url, headers=headers or {"User-Agent": "PaySafe/1.0"})
    with urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))

def _domain_age_days(rdap: dict) -> int | None:
    dates = []
    for event in rdap.get("events", []):
        if event.get("eventAction") in {"registration", "registered"} and event.get("eventDate"):
            try:
                dates.append(datetime.fromisoformat(event["eventDate"].replace("Z", "+00:00")))
            except ValueError:
                pass
    if not dates:
        return None
    return max(0, (datetime.now(timezone.utc) - min(dates)).days)

def _safe_browsing_check(url: str) -> dict:
    key = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")
    if not key:
        return {"status": "not_configured", "listed": None, "source": "Google Safe Browsing"}
    endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={key}"
    body = json.dumps({
        "client": {"clientId": "paysafe", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}],
        },
    }).encode()
    req = Request(endpoint, data=body, headers={"Content-Type": "application/json", "User-Agent": "PaySafe/1.0"})
    with urlopen(req, timeout=8) as response:
        payload = json.loads(response.read().decode("utf-8"))
    matches = payload.get("matches", [])
    return {"status": "checked", "listed": bool(matches), "matches": [m.get("threatType") for m in matches], "source": "Google Safe Browsing"}

class LinkRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)

@app.post("/api/analyze-link")
def analyze_link(req: LinkRequest):
    try:
        parsed = urlparse(req.url.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise HTTPException(status_code=400, detail="Enter a valid HTTP(S) URL.")
        domain = parsed.hostname.lower().rstrip(".")
        factors = []
        if parsed.scheme != "https":
            factors.append({"title": "No HTTPS", "severity": "high", "description": "The submitted URL does not use HTTPS.", "scoreContribution": 20})
        try:
            ip = socket.gethostbyname(domain)
            dns_status = "resolved"
        except OSError:
            ip, dns_status = None, "unresolved"
        if dns_status == "unresolved":
            factors.append({"title": "Domain Does Not Resolve", "severity": "high", "description": "Live DNS resolution could not resolve the submitted domain.", "scoreContribution": 25})

        registration_age_days = None
        rdap_status = "unavailable"
        try:
            rdap = _http_json(f"https://rdap.org/domain/{domain}")
            registration_age_days = _domain_age_days(rdap)
            rdap_status = "checked"
            if registration_age_days is not None and registration_age_days < 30:
                factors.append({"title": "Very New Domain", "severity": "high", "description": f"RDAP registration data indicates the domain is about {registration_age_days} day(s) old.", "scoreContribution": 25})
            elif registration_age_days is not None and registration_age_days < 180:
                factors.append({"title": "Recently Registered Domain", "severity": "medium", "description": f"RDAP registration data indicates the domain is about {registration_age_days} day(s) old.", "scoreContribution": 12})
        except Exception:
            rdap = {}
        reputation = {"status": "unavailable", "listed": None, "source": "Google Safe Browsing"}
        try:
            reputation = _safe_browsing_check(req.url.strip())
            if reputation.get("listed"):
                factors.append({"title": "Live Reputation Match", "severity": "critical", "description": "Google Safe Browsing returned a live threat-list match for this URL.", "scoreContribution": 55})
        except Exception:
            reputation = {"status": "error", "listed": None, "source": "Google Safe Browsing"}

        score = min(100, sum(f["scoreContribution"] for f in factors))
        if score <= 30: level = "SAFE"
        elif score <= 50: level = "LOW"
        elif score <= 70: level = "SUSPICIOUS"
        elif score <= 85: level = "HIGH"
        else: level = "CRITICAL"
        if not factors:
            factors.append({"title": "No Live Threat Signal", "severity": "low", "description": "No configured live reputation or registration signal indicated a known threat.", "scoreContribution": 5})
            score = 5
        return {
            "riskResult": {
                "riskScore": score, "riskLevel": level,
                "confidence": 90 if reputation.get("status") == "checked" and rdap_status == "checked" else 70,
                "threatType": "Known Malicious URL" if reputation.get("listed") else "Domain Reputation Assessment",
                "factors": factors,
                "recommendation": "Do not proceed if the live reputation check reports a threat. Otherwise verify the domain independently before entering payment details.",
                "analysisSummary": f"Live analysis checked DNS ({dns_status}), RDAP registration data ({rdap_status}), and Safe Browsing status ({reputation.get('status')}).",
                "liveSignals": {
                    "domain": domain, "dns": dns_status, "resolvedIp": ip,
                    "registrationAgeDays": registration_age_days, "blacklist": reputation
                },
            }
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Live link analysis failed: {exc}") from exc

class UpiVerificationRequest(BaseModel):
    upiId: str = Field(min_length=3, max_length=200)
    recipientName: str = Field(default="", max_length=200)
    amount: float = Field(default=0, ge=0)
    note: str = Field(default="", max_length=500)

@app.post("/api/verify-upi")
def verify_upi(req: UpiVerificationRequest):
    upi = req.upiId.strip().lower()
    syntax_valid = bool(re.fullmatch(r"[a-z0-9._-]{2,256}@[a-z0-9._-]{2,64}", upi))
    if not syntax_valid:
        raise HTTPException(status_code=400, detail="Decoded QR contains an invalid UPI ID format.")

    external_source = "local UPI syntax validation"
    external = None
    verifier_url = os.getenv("UPI_VERIFY_URL")
    if verifier_url:
        try:
            body = json.dumps({"upiId": upi}).encode()
            response = Request(verifier_url, data=body, headers={"Content-Type": "application/json", "User-Agent": "PaySafe/1.0"})
            with urlopen(response, timeout=8) as r:
                external = json.loads(r.read().decode("utf-8"))
            external_source = "configured external UPI verifier"
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"UPI verification service failed: {exc}") from exc

    factors = []
    if not syntax_valid:
        factors.append({"title": "Invalid UPI ID", "severity": "critical", "description": "The decoded UPI ID failed format validation.", "scoreContribution": 60})
    if not req.recipientName.strip():
        factors.append({"title": "Recipient Name Missing", "severity": "medium", "description": "The QR payload does not provide a recipient display name.", "scoreContribution": 15})
    if req.amount >= 20000:
        factors.append({"title": "High Payment Amount", "severity": "high", "description": f"The decoded QR requests ₹{req.amount:,.0f}.", "scoreContribution": 20})
    if any(word in req.note.lower() for word in ("urgent", "verify", "kyc", "block", "suspend", "warning")):
        factors.append({"title": "Urgent Payment Note", "severity": "high", "description": "The decoded payment note contains urgency or verification language.", "scoreContribution": 15})
    if external and external.get("valid") is False:
        factors.append({"title": "External UPI Verification Failed", "severity": "critical", "description": "The configured UPI verification service did not validate this VPA.", "scoreContribution": 60})

    score = min(100, sum(f["scoreContribution"] for f in factors))
    level = "SAFE" if score <= 30 else "LOW" if score <= 50 else "SUSPICIOUS" if score <= 70 else "HIGH" if score <= 85 else "CRITICAL"
    verified = bool(external.get("valid")) if external else syntax_valid
    return {
        "verification": {
            "upiId": upi, "syntaxValid": syntax_valid, "verified": verified,
            "recipientName": external.get("recipientName", req.recipientName) if external else req.recipientName,
            "source": external_source,
            "externalResponse": external,
        },
        "riskResult": {
            "riskScore": score, "riskLevel": level,
            "confidence": 92 if external else 70,
            "threatType": "UPI Verification Result",
            "factors": factors or [{"title": "UPI Format Valid", "severity": "low", "description": "The decoded VPA matches the standard UPI identifier format.", "scoreContribution": 5}],
            "recommendation": "Confirm the recipient name and amount in your banking app before approving payment.",
            "analysisSummary": f"Decoded UPI payload was checked using {external_source}.",
        },
    }
