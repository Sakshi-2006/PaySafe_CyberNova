import type { RiskResult, TransactionInput } from '@/lib/riskEngine';

const API_BASE = (import.meta.env.VITE_FRAUD_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export async function analyzeTransactionWithModel(tx: TransactionInput): Promise<RiskResult> {
  const response = await fetch(`${API_BASE}/api/analyze-transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: tx.amount,
      recipient: tx.recipient,
      category: tx.category,
      time: tx.time,
      isNewRecipient: tx.isNewRecipient,
      previousFrequency: tx.previousFrequency,
    }),
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    // Keep the error below useful even when the backend returns non-JSON.
  }

  if (!response.ok) {
    throw new Error(payload?.detail || `Fraud API request failed (${response.status})`);
  }

  return payload as RiskResult;
}
