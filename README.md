# PaySafe

> AI-powered financial security platform for identifying suspicious digital payment activity before users make a payment.

PaySafe is a web-based fraud and scam analysis platform built for the Orvix Hackathon by **Team CyberNova**. It brings multiple payment-risk checks into a single interface so users can analyze transaction details, payment links, QR-based payment requests, and scam-related intelligence before proceeding.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-PaySafe-06b6d4?style=for-the-badge)](https://pay-safe-cyber-nova.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/Sakshi-2006/PaySafe_CyberNova)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)

## Overview

Digital payment fraud increasingly reaches users through multiple channels: suspicious transaction patterns, phishing and payment links, fraudulent QR codes, impersonation, and social engineering.

PaySafe addresses this problem by providing a unified interface for pre-payment risk assessment. Instead of relying on a single indicator, the platform presents a risk score, risk level, contributing factors, confidence, and a recommended action.

The goal is not simply to flag a payment as suspicious, but to make the reason behind the assessment understandable to the user.

## Key Features

### Transaction Risk Analysis

Users can enter transaction details such as:

- Transaction amount
- Recipient
- Transaction category
- Transaction time
- Previous transaction frequency
- New-recipient status

The backend evaluates the available transaction signals using a trained Random Forest classifier and returns:

- Risk score
- Risk level
- Fraud probability
- Confidence
- Explainable risk factors
- Recommended action
- Analysis summary

### Payment Link Analysis

PaySafe analyzes payment-related URLs without requiring the user to open the destination page.

The analyzer checks signals including:

- HTTPS usage
- Domain structure
- Suspicious top-level domains
- Financial and security-related keywords
- Possible brand impersonation
- DNS resolution
- Domain registration information through RDAP
- Recently registered domains

The result is converted into a risk level with explainable factors and a safety recommendation.

### QR Payment Analysis

The QR analyzer can decode payment QR codes from uploaded images and camera input.

It is designed to handle payment formats including:

- UPI
- DuitNow
- EMV merchant-presented payment QR
- Payment URLs embedded in QR codes

When payment information can be extracted, PaySafe displays available details such as:

- Payment network
- Recipient or merchant
- Payment address
- Amount
- Currency
- Merchant city
- Country
- Reference or note
- Decoded payment payload

The decoded information can then be sent for payment-risk verification.

### Scam Intelligence

The Scam Intelligence section provides educational guides explaining common scam patterns.

Each guide contains:

- How the scam works
- Warning signs
- What to do
- What not to do
- Associated risk level

Users can search the guides by scam category, title, or description.

### Authentication and User Profiles

PaySafe includes account authentication backed by MongoDB Atlas.

The backend provides:

- User registration
- Secure password hashing with bcrypt
- JWT-based session authentication
- HttpOnly authentication cookies
- Login and logout
- Profile name updates
- Persistent user records

## Risk Assessment

PaySafe uses different signals depending on the input type.

### Transaction Model

The transaction analyzer uses a Random Forest classifier trained on transaction-level features:

| Feature | Description |
| --- | --- |
| Amount | Transaction value |
| Transaction hour | Time at which the transaction occurs |
| Previous transactions | Historical transaction frequency |

The model is configured with:

- 500 decision trees
- Balanced class weights
- Minimum samples per leaf of 3
- Fixed random state for reproducibility

The backend converts the model probability into five user-facing levels:

| Score | Risk Level |
| ---: | --- |
| 0–30 | SAFE |
| 31–50 | LOW |
| 51–70 | SUSPICIOUS |
| 71–85 | HIGH |
| 86–100 | CRITICAL |

These levels are presentation thresholds used by the application and should not be interpreted as a guarantee that a real-world transaction is fraudulent or safe.

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui-style component patterns
- Framer Motion
- Lucide React
- Recharts
- React Router
- jsQR

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- scikit-learn
- pandas
- joblib
- httpx
- PyMongo
- bcrypt
- PyJWT

### Database and Infrastructure

- MongoDB Atlas
- Vercel for deployment
- REST APIs between frontend and backend

## System Architecture

```text
                         PaySafe
                            |
              +-------------+-------------+
              |                           |
          React Frontend             FastAPI Backend
              |                           |
      +-------+--------+          +-------+--------+
      |       |        |          |       |        |
 Transaction  Link     QR      Fraud   Link     Auth
   Analyzer Analyzer Analyzer  Model  Analysis  Services
      |       |        |          |       |        |
      +-------+--------+----------+-------+--------+
                            |
                       MongoDB Atlas
                       User Accounts
```

The frontend is responsible for the user experience, input collection, visualization, QR decoding, and presenting explainable results. The backend handles model inference, URL analysis, authentication, database access, and risk evaluation.

## Project Structure

```text
PaySafe_CyberNova/
|
├── src/
│   ├── components/        Reusable UI and application components
│   ├── context/           Authentication and application context
│   ├── lib/               Storage, risk logic, theme, and utilities
│   └── pages/             Application pages and analyzers
|
├── backend/
│   ├── main.py            FastAPI application and API routes
│   ├── train_model.py     Random Forest training pipeline
│   ├── model_metrics.json Model evaluation metrics
│   ├── fraud_model.pkl    Trained fraud detection model
│   └── requirements.txt   Python dependencies
|
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## Getting Started

### Prerequisites

Install the following:

- Node.js 18 or later
- npm
- Python 3.10 or later
- MongoDB Atlas account for authentication features

### Frontend Setup

Clone the repository:

```bash
git clone https://github.com/Sakshi-2006/PaySafe_CyberNova.git
cd PaySafe_CyberNova
```

Install dependencies:

```bash
npm install
```

Create the frontend environment file if your local configuration requires one:

```text
VITE_FRAUD_API_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

### Backend Setup

Create a Python virtual environment:

```bash
cd backend

python -m venv .venv
```

Activate it on Windows:

```bash
.venv\\Scripts\\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

The backend requires the trained model file `fraud_model.pkl`. If retraining the model, place the source dataset at:

```text
paysafe_ds/paysafe_transactions_1000.csv
```

Then run:

```bash
python train_model.py
```

Start FastAPI:

```bash
uvicorn main:app --reload --port 8000
```

Backend endpoints:

```text
http://localhost:8000/
http://localhost:8000/health
http://localhost:8000/docs
```

### Backend Environment Variables

For authentication and deployment, configure:

```text
PAYSAFE_AUTH_SECRET=your_secure_secret
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB=PaySafe
CLIENT_URL=http://localhost:5173
```

Never commit real credentials, database connection strings, API keys, or authentication secrets to the repository.

## API Overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Backend and model health check |
| POST | `/api/analyze-transaction` | Analyze transaction risk |
| POST | `/api/verify-upi` | Verify payment QR risk |
| POST | `/api/analyze-link` | Analyze payment URL risk |
| POST | `/api/auth/signup` | Create a user account |
| POST | `/api/auth/login` | Authenticate a user |
| GET | `/api/auth/me` | Get the current user |
| POST | `/api/auth/logout` | End the current session |
| PATCH | `/api/auth/profile` | Update the user profile |

Interactive API documentation is available through FastAPI at `/docs` when the backend is running.

## Model Evaluation

The transaction model is evaluated using stratified cross-validation with:

- Accuracy
- Precision
- Recall
- F1 score
- ROC AUC
- Average precision

The stored evaluation results are available in:

```text
backend/model_metrics.json
```

Model performance depends on the dataset and features used during training. The model is a decision-support component and should not be treated as a definitive fraud verdict.

## Security Considerations

PaySafe is designed as a hackathon prototype and should not be treated as a production financial security service without additional security review.

Important considerations include:

- Keep authentication secrets outside source control.
- Restrict MongoDB network access appropriately for deployment.
- Validate and sanitize all user inputs.
- Do not expose sensitive payment credentials to the application.
- Treat risk scores as indicators rather than guarantees.
- Verify payment information through trusted channels before transferring money.
- Enable repository security features such as secret scanning and push protection when appropriate.

## Live Demo

**Application:** https://pay-safe-cyber-nova.vercel.app/

**Repository:** https://github.com/Sakshi-2006/PaySafe_CyberNova

**Backend:** https://paysafebackend.vercel.app/

## Hackathon

PaySafe was developed by **Team CyberNova** for the **Orvix Hackathon 2026**, with a focus on the intersection of:

- FinTech
- Artificial Intelligence and Machine Learning
- Cybersecurity
- Digital payment safety
- Explainable risk assessment

## Team

**Team CyberNova**

The project was developed collaboratively as a hackathon project covering frontend engineering, backend/API development, machine learning, payment QR analysis, URL risk analysis, authentication, and product presentation.

## Future Scope

Potential extensions include:

- Larger and more diverse fraud datasets
- More transaction-level behavioral features
- Real-time threat intelligence feeds
- More payment networks and QR standards
- Improved phishing and scam-message classification
- Device and behavioral anomaly detection
- Explainable model visualizations
- Production-grade monitoring and audit logging
- Integration with verified financial-service security APIs

## Disclaimer

PaySafe is an educational and hackathon project intended to demonstrate digital payment risk analysis.

A risk score does not guarantee that a transaction, QR code, or URL is safe or fraudulent. Users should independently verify payment requests and recipients through trusted channels before making financial transactions.

## Acknowledgements

The project uses open-source technologies and libraries from the React, Vite, Tailwind CSS, FastAPI, scikit-learn, MongoDB, and other developer communities.

---

Built by Team CyberNova for Orvix Hackathon 2026.
