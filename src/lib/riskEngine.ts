export type RiskLevel = 'SAFE' | 'LOW' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';

export interface RiskFactor {
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  scoreContribution: number;
}

export interface RiskResult {
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  threatType: string;
  factors: RiskFactor[];
  recommendation: string;
  analysisSummary: string;
  inputType: 'message' | 'url' | 'qr' | 'transaction';
  inputPreview: string;
  timestamp: string;
}

export function scoreToLevel(score: number): RiskLevel {
  if (score <= 30) return 'SAFE';
  if (score <= 50) return 'LOW';
  if (score <= 70) return 'SUSPICIOUS';
  if (score <= 85) return 'HIGH';
  return 'CRITICAL';
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

const BANK_NAMES = [
  'sbi', 'hdfc', 'icici', 'axis', 'kotak', 'pnb', 'canara',
  'bank of baroda', 'yes bank', 'idfc', 'rbl', 'federal',
  'reserve bank', 'rbi',
];

const URGENT_WORDS = [
  'urgent', 'immediately', 'block', 'blocked', 'suspend',
  'suspended', 'verify', 'verification', 'kyc', 'expire',
  'expired', 'last warning', 'final notice', 'action required',
  'deadline', 'today', 'now', 'within hours',
];

const PHISHING_WORDS = [
  'click', 'link', 'login', 'password', 'otp', 'cvv', 'card',
  'account', 'verify', 'confirm', 'update', 'secure', 'security',
  'alert', 'warning', 'limited', 'restricted', 'unlock',
];

const MONEY_WORDS = [
  'payment', 'pay', 'transfer', 'money', 'refund', 'cashback',
  'prize', 'won', 'winner', 'lottery', 'reward', 'invest',
  'bitcoin', 'crypto', 'double', 'scheme', 'deposit',
];

function countMatches(text: string, words: string[]): string[] {
  const lower = text.toLowerCase();
  return words.filter((w) => lower.includes(w));
}

function hasUrl(text: string): boolean {
  return /https?:\/\/|www\.|\b\w+\.\w{2,}/i.test(text);
}

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s]+|www\.[^\s]+|\b[\w-]+\.(?:com|in|net|org|co|io|xyz|info|biz|ru|cn|tk)[^\s]*/gi);
  return matches ?? [];
}

function isLookalikeDomain(url: string): boolean {
  const domainMatch = url.match(/(?:https?:\/\/|www\.)?([^/]+)/i);
  if (!domainMatch) return false;
  const domain = domainMatch[1].toLowerCase();
  return BANK_NAMES.some((bank) => {
    if (!domain.includes(bank)) return false;
    const parts = domain.split(/[.\-]/);
    return parts.some((p) => p === bank) === false;
  });
}

function hasExcessiveHyphens(url: string): boolean {
  const domainMatch = url.match(/(?:https?:\/\/|www\.)?([^/]+)/i);
  if (!domainMatch) return false;
  return (domainMatch[1].match(/-/g) ?? []).length >= 2;
}

function hasSuspiciousTld(url: string): boolean {
  return /\.(xyz|tk|ru|cn|info|biz|cc|gq|ml|cf)/i.test(url);
}

function hasHttps(url: string): boolean {
  return /^https:\/\//i.test(url);
}

// ── Message Analyzer ──────────────────────────────────────────

export function analyzeMessage(rawText: string): RiskResult {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const factors: RiskFactor[] = [];

  const urgentHits = countMatches(lower, URGENT_WORDS);
  if (urgentHits.length >= 1) {
    factors.push({
      title: 'Urgency Manipulation',
      severity: urgentHits.length >= 3 ? 'critical' : 'high',
      description:
        'The message creates time pressure to encourage immediate action before you can think critically.',
      scoreContribution: Math.min(28, 10 + urgentHits.length * 5),
    });
  }

  const bankHit = BANK_NAMES.find((b) => lower.includes(b));
  if (bankHit) {
    const urls = extractUrls(text);
    const domainLooksOff =
      urls.length > 0 && (isLookalikeDomain(urls[0]) || hasExcessiveHyphens(urls[0]) || hasSuspiciousTld(urls[0]));
    if (domainLooksOff || (urls.length > 0 && !urls[0].toLowerCase().includes(bankHit + '.com') && !urls[0].toLowerCase().includes(bankHit + '.co.in'))) {
      factors.push({
        title: 'Financial Institution Impersonation',
        severity: 'critical',
        description: `The message claims to represent "${bankHit.toUpperCase()}" but the link domain does not match the official institution domain.`,
        scoreContribution: 26,
      });
    } else {
      factors.push({
        title: 'Financial Institution Impersonation',
        severity: 'high',
        description: `The message claims to represent "${bankHit.toUpperCase()}". Always verify through official channels.`,
        scoreContribution: 18,
      });
    }
  }

  const urls = extractUrls(text);
  if (urls.length > 0) {
    let urlScore = 0;
    if (isLookalikeDomain(urls[0])) {
      factors.push({
        title: 'Suspicious URL',
        severity: 'critical',
        description: `The domain "${urls[0]}" appears to be a lookalike designed to mimic a legitimate institution.`,
        scoreContribution: 22,
      });
      urlScore += 22;
    }
    if (hasExcessiveHyphens(urls[0])) {
      factors.push({
        title: 'Deceptive Domain Structure',
        severity: 'high',
        description: 'The URL contains excessive hyphens, a common phishing tactic to create lookalike domains.',
        scoreContribution: 12,
      });
      urlScore += 12;
    }
    if (hasSuspiciousTld(urls[0])) {
      factors.push({
        title: 'Suspicious TLD',
        severity: 'medium',
        description: 'The URL uses a top-level domain frequently associated with phishing campaigns.',
        scoreContribution: 8,
      });
      urlScore += 8;
    }
    if (!hasHttps(urls[0])) {
      factors.push({
        title: 'Unencrypted Connection',
        severity: 'medium',
        description: 'The link does not use HTTPS, meaning any data you enter would not be encrypted.',
        scoreContribution: 6,
      });
      urlScore += 6;
    }
  }

  const phishingHits = countMatches(lower, PHISHING_WORDS);
  if (phishingHits.length >= 3) {
    factors.push({
      title: 'Credential / Verification Request',
      severity: 'high',
      description: 'The message attempts to push you toward account verification or credential entry.',
      scoreContribution: Math.min(16, 6 + phishingHits.length * 2),
    });
  }

  const moneyHits = countMatches(lower, MONEY_WORDS);
  if (moneyHits.length >= 2) {
    factors.push({
      title: 'Financial Lure',
      severity: 'medium',
      description: 'The message references money, prizes, or payments in a way that may entice quick action.',
      scoreContribution: Math.min(14, 4 + moneyHits.length * 2),
    });
  }

  if (lower.includes('otp') || lower.includes('cvv') || lower.includes('pin')) {
    factors.push({
      title: 'Sensitive Information Request',
      severity: 'critical',
      description: 'The message may be fishing for OTP, CVV, or PIN — no legitimate institution ever asks for these.',
      scoreContribution: 20,
    });
  }

  if (factors.length === 0) {
    factors.push({
      title: 'No Significant Risk Indicators',
      severity: 'low',
      description: 'No strong scam patterns were detected in this message. Remain cautious but no major red flags.',
      scoreContribution: 5,
    });
  }

  const rawScore = factors.reduce((sum, f) => sum + f.scoreContribution, 0);
  const riskScore = clamp(rawScore);
  const riskLevel = scoreToLevel(riskScore);
  const confidence = clamp(60 + factors.length * 6 + (riskScore > 70 ? 10 : 0));

  const threatParts: string[] = [];
  if (bankHit) threatParts.push('Financial Institution Impersonation');
  if (urls.length > 0) threatParts.push('Phishing URL');
  if (urgentHits.length > 0) threatParts.push('Social Engineering');
  if (lower.includes('otp') || lower.includes('cvv')) threatParts.push('Credential Harvesting');
  if (moneyHits.length >= 2) threatParts.push('Financial Lure');
  if (threatParts.length === 0) threatParts.push('No Major Threat Detected');

  const recommendations: Record<RiskLevel, string> = {
    SAFE: 'No significant risk indicators detected. Continue to stay vigilant.',
    LOW: 'Low risk detected. Exercise normal caution and verify the sender if unsure.',
    SUSPICIOUS: 'Treat with caution. Do not click links or share information. Verify through official channels.',
    HIGH: 'Do not click any links or share information. Verify the request through the official bank application or official website.',
    CRITICAL: 'Do not click the link. Do not share financial information. Verify the request through the official bank application or official website. Report this message as fraud.',
  };

  return {
    riskScore,
    riskLevel,
    confidence,
    threatType: threatParts.join(' + '),
    factors,
    recommendation: recommendations[riskLevel],
    analysisSummary: buildMessageSummary(riskLevel, factors, bankHit, urls.length > 0),
    inputType: 'message',
    inputPreview: text.slice(0, 200),
    timestamp: new Date().toISOString(),
  };
}

function buildMessageSummary(level: RiskLevel, factors: RiskFactor[], bankHit?: string, hasUrl?: boolean): string {
  const top = factors.slice(0, 3).map((f) => f.title).join(', ');
  const bank = bankHit ? ` impersonating ${bankHit.toUpperCase()}` : '';
  const url = hasUrl ? ' containing a suspicious link' : '';
  return `This message was classified as ${level} risk based on ${factors.length} detected indicator(s)${bank}${url}: ${top}.`;
}

// ── URL Analyzer ───────────────────────────────────────────────

export function analyzeURL(rawUrl: string): RiskResult {
  const url = rawUrl.trim();
  const factors: RiskFactor[] = [];

  if (!hasHttps(url)) {
    factors.push({
      title: 'No HTTPS Encryption',
      severity: 'medium',
      description: 'The link does not use HTTPS. Any payment or personal data entered would be transmitted unencrypted.',
      scoreContribution: 12,
    });
  }

  if (isLookalikeDomain(url)) {
    factors.push({
      title: 'Lookalike Domain',
      severity: 'critical',
      description: 'The domain mimics a known financial institution but uses subtle spelling or structural differences.',
      scoreContribution: 28,
    });
  }

  if (hasExcessiveHyphens(url)) {
    factors.push({
      title: 'Excessive Hyphens in Domain',
      severity: 'high',
      description: 'Multiple hyphens in the domain are a strong phishing indicator used to create lookalike URLs.',
      scoreContribution: 18,
    });
  }

  if (hasSuspiciousTld(url)) {
    factors.push({
      title: 'Suspicious TLD',
      severity: 'high',
      description: 'The top-level domain is frequently associated with phishing and scam infrastructure.',
      scoreContribution: 14,
    });
  }

  const lower = url.toLowerCase();
  const financialKeywords = ['payment', 'pay', 'secure', 'verify', 'bank', 'kyc', 'transaction', 'upi', 'wallet'];
  const finHits = countMatches(lower, financialKeywords);
  if (finHits.length >= 2) {
    factors.push({
      title: 'Financial Keyword Clustering',
      severity: 'medium',
      description: 'The URL contains multiple financial keywords designed to appear legitimate.',
      scoreContribution: 10,
    });
  }

  const subdomainMatch = url.match(/:\/\/([^/]+)\./);
  if (subdomainMatch) {
    const sub = subdomainMatch[1];
    if (sub.length > 3 && sub !== 'www' && !['api', 'app', 'secure'].includes(sub)) {
      factors.push({
        title: 'Unusual Subdomain',
        severity: 'medium',
        description: `The subdomain "${sub}" is unusual for a legitimate payment page.`,
        scoreContribution: 8,
      });
    }
  }

  const bankHit = BANK_NAMES.find((b) => lower.includes(b));
  if (bankHit) {
    const domainMatch = url.match(/(?:https?:\/\/|www\.)?([^/]+)/);
    const domain = domainMatch ? domainMatch[1].toLowerCase() : '';
    if (!domain.includes(`${bankHit}.com`) && !domain.includes(`${bankHit}.co.in`)) {
      factors.push({
        title: 'Brand Impersonation',
        severity: 'critical',
        description: `The URL references "${bankHit.toUpperCase()}" but the domain is not the official ${bankHit.toUpperCase()} domain.`,
        scoreContribution: 24,
      });
    }
  }

  if (factors.length === 0) {
    factors.push({
      title: 'No Major Suspicious Indicators',
      severity: 'low',
      description: 'The URL structure appears standard. No strong phishing indicators detected in this prototype analysis.',
      scoreContribution: 6,
    });
  }

  const rawScore = factors.reduce((sum, f) => sum + f.scoreContribution, 0);
  const riskScore = clamp(rawScore);
  const riskLevel = scoreToLevel(riskScore);
  const confidence = clamp(55 + factors.length * 7);

  const recommendations: Record<RiskLevel, string> = {
    SAFE: 'The URL appears standard. Always verify you are on the correct website before entering payment details.',
    LOW: 'Low risk indicators present. Verify the domain carefully before proceeding.',
    SUSPICIOUS: 'Suspicious indicators detected. Do not enter payment information. Verify the URL through official channels.',
    HIGH: 'High risk URL detected. Do not enter any information. Access the service through the official website or app instead.',
    CRITICAL: 'This URL shows strong phishing indicators. Do not enter any information. Report this URL and access the service through official channels only.',
  };

  return {
    riskScore,
    riskLevel,
    confidence,
    threatType: bankHit ? `Phishing — ${bankHit.toUpperCase()} Impersonation` : 'Suspicious Payment URL',
    factors,
    recommendation: recommendations[riskLevel],
    analysisSummary: `Prototype security analysis flagged ${factors.length} indicator(s). This is a heuristic analysis, not real-time domain reputation.`,
    inputType: 'url',
    inputPreview: url.slice(0, 200),
    timestamp: new Date().toISOString(),
  };
}

// ── QR Analyzer ───────────────────────────────────────────────

export interface QRData {
  upiId: string;
  recipientName: string;
  amount: number;
  note: string;
}

export function analyzeQR(qr: QRData): RiskResult {
  const factors: RiskFactor[] = [];
  const lowerNote = qr.note.toLowerCase();
  const upiLower = qr.upiId.toLowerCase();

  if (qr.amount >= 10000) {
    factors.push({
      title: 'High Payment Amount',
      severity: qr.amount >= 20000 ? 'critical' : 'high',
      description: `The amount ₹${qr.amount.toLocaleString('en-IN')} is significantly higher than typical everyday UPI transactions.`,
      scoreContribution: qr.amount >= 20000 ? 26 : 18,
    });
  }

  const suspiciousUpiPatterns = ['unknown', 'temp', 'test', 'verify', 'kyc', 'secure', 'payment', 'collect', 'request'];
  if (suspiciousUpiPatterns.some((p) => upiLower.includes(p))) {
    factors.push({
      title: 'Suspicious UPI ID',
      severity: 'high',
      description: `The UPI ID "${qr.upiId}" contains patterns commonly seen in scam payment requests.`,
      scoreContribution: 20,
    });
  }

  if (upiLower.includes('@upi') && !upiLower.includes('@oksbi') && !upiLower.includes('@okhdfcbank') && !upiLower.includes('@ybl') && !upiLower.includes('@ibl') && !upiLower.includes('@axl')) {
    factors.push({
      title: 'Non-Standard UPI Handle',
      severity: 'medium',
      description: 'The UPI ID uses a generic handle that does not match common verified merchant patterns.',
      scoreContribution: 10,
    });
  }

  const suspiciousNoteWords = ['urgent', 'verify', 'kyc', 'block', 'suspend', 'last', 'warning', 'limited'];
  if (suspiciousNoteWords.some((w) => lowerNote.includes(w))) {
    factors.push({
      title: 'Suspicious Payment Note',
      severity: 'high',
      description: `The payment note "${qr.note}" contains urgency or verification language typical of scams.`,
      scoreContribution: 16,
    });
  }

  factors.push({
    title: 'No Transaction History',
    severity: 'medium',
    description: 'This recipient has no prior transaction history with your account, increasing uncertainty.',
    scoreContribution: 12,
  });

  if (qr.recipientName.toLowerCase().includes('unknown') || qr.recipientName.trim() === '') {
    factors.push({
      title: 'Unverified Recipient',
      severity: 'high',
      description: 'The recipient name is unknown or unverified. Always confirm the recipient identity before paying.',
      scoreContribution: 14,
    });
  }

  if (factors.length === 0) {
    factors.push({
      title: 'No Major Risk Indicators',
      severity: 'low',
      description: 'No significant risk indicators detected in this QR data.',
      scoreContribution: 8,
    });
  }

  const rawScore = factors.reduce((sum, f) => sum + f.scoreContribution, 0);
  const riskScore = clamp(rawScore);
  const riskLevel = scoreToLevel(riskScore);
  const confidence = clamp(58 + factors.length * 6);

  const recommendations: Record<RiskLevel, string> = {
    SAFE: 'No significant risk detected. Always verify the recipient before confirming payment.',
    LOW: 'Low risk. Verify the recipient name and amount before proceeding.',
    SUSPICIOUS: 'Suspicious indicators present. Verify the recipient independently before making payment.',
    HIGH: 'High risk detected. Verify the recipient through a trusted channel before sending money.',
    CRITICAL: 'Do not proceed with payment. Verify the recipient independently through official channels before sending any money.',
  };

  return {
    riskScore,
    riskLevel,
    confidence,
    threatType: 'Suspicious Payment Request',
    factors,
    recommendation: recommendations[riskLevel],
    analysisSummary: `QR analysis for ${qr.upiId} flagged ${factors.length} risk indicator(s) based on amount, recipient, and note heuristics.`,
    inputType: 'qr',
    inputPreview: `UPI: ${qr.upiId}, Amount: ₹${qr.amount}, Recipient: ${qr.recipientName}`,
    timestamp: new Date().toISOString(),
  };
}

// ── Transaction Analyzer ──────────────────────────────────────

export interface TransactionInput {
  amount: number;
  recipient: string;
  category: string;
  time: string;
  isNewRecipient: boolean;
  previousFrequency: number;
}

export function analyzeTransaction(tx: TransactionInput): RiskResult {
  const factors: RiskFactor[] = [];
  const hour = parseInt(tx.time.match(/\d{1,2}/)?.[0] ?? '12', 10);
  const isPM = /pm/i.test(tx.time);
  const hour24 = isPM && hour !== 12 ? hour + 12 : !isPM && hour === 12 ? 0 : hour;

  if (tx.amount >= 15000) {
    factors.push({
      title: 'High Transaction Amount',
      severity: tx.amount >= 25000 ? 'critical' : 'high',
      description: `₹${tx.amount.toLocaleString('en-IN')} is significantly above your average transaction amount.`,
      scoreContribution: tx.amount >= 25000 ? 28 : 20,
    });
  } else if (tx.amount >= 5000) {
    factors.push({
      title: 'Elevated Transaction Amount',
      severity: 'medium',
      description: `₹${tx.amount.toLocaleString('en-IN')} is above typical everyday transaction values.`,
      scoreContribution: 10,
    });
  }

  if (tx.isNewRecipient) {
    factors.push({
      title: 'New Recipient',
      severity: 'high',
      description: 'This is the first transaction with this recipient. New recipients carry higher fraud risk.',
      scoreContribution: 22,
    });
  }

  if (hour24 >= 22 || hour24 < 6) {
    factors.push({
      title: 'Unusual Transaction Time',
      severity: 'high',
      description: `The transaction is initiated at ${tx.time}, outside normal banking hours. Fraudulent transactions often occur late at night.`,
      scoreContribution: 16,
    });
  }

  const riskyCategories = ['Payment Request', 'Investment', 'Crypto', 'Gift Card', 'Lottery'];
  if (riskyCategories.includes(tx.category)) {
    factors.push({
      title: 'High-Risk Category',
      severity: 'high',
      description: `"${tx.category}" transactions are frequently associated with social engineering scams.`,
      scoreContribution: 14,
    });
  }

  if (tx.previousFrequency === 0 && !tx.isNewRecipient) {
    factors.push({
      title: 'Infrequent Recipient',
      severity: 'medium',
      description: 'You have not transacted with this recipient recently. Confirm before proceeding.',
      scoreContribution: 8,
    });
  }

  const suspiciousPatterns = ['unknown', 'temp', 'verify', 'kyc', 'secure'];
  if (suspiciousPatterns.some((p) => tx.recipient.toLowerCase().includes(p))) {
    factors.push({
      title: 'Suspicious Recipient Pattern',
      severity: 'high',
      description: `The recipient ID "${tx.recipient}" contains patterns commonly seen in scam requests.`,
      scoreContribution: 12,
    });
  }

  if (factors.length === 0) {
    factors.push({
      title: 'No Significant Risk Indicators',
      severity: 'low',
      description: 'The transaction appears within normal parameters based on available heuristics.',
      scoreContribution: 5,
    });
  }

  const rawScore = factors.reduce((sum, f) => sum + f.scoreContribution, 0);
  const riskScore = clamp(rawScore);
  const riskLevel = scoreToLevel(riskScore);
  const confidence = clamp(60 + factors.length * 6);

  const recommendations: Record<RiskLevel, string> = {
    SAFE: 'The transaction appears within normal parameters. Proceed with standard caution.',
    LOW: 'Low risk indicators. Verify the amount and recipient before confirming.',
    SUSPICIOUS: 'Suspicious indicators detected. Pause and verify the recipient before proceeding.',
    HIGH: 'High risk transaction. Verify the recipient independently before proceeding with this transaction.',
    CRITICAL: 'Do not proceed. Verify the recipient independently through a trusted channel before making this transaction. Consider reporting if confirmed fraudulent.',
  };

  return {
    riskScore,
    riskLevel,
    confidence,
    threatType: tx.isNewRecipient ? 'New Recipient + High Value' : 'Suspicious Transaction Pattern',
    factors,
    recommendation: recommendations[riskLevel],
    analysisSummary: `Transaction risk engine evaluated ${factors.length} factor(s): amount, recipient history, time, and category.`,
    inputType: 'transaction',
    inputPreview: `₹${tx.amount.toLocaleString('en-IN')} to ${tx.recipient} — ${tx.category} at ${tx.time}`,
    timestamp: new Date().toISOString(),
  };
}

export const riskLevelColor: Record<RiskLevel, string> = {
  SAFE: '#22c55e',
  LOW: '#84cc16',
  SUSPICIOUS: '#f59e0b',
  HIGH: '#fb923c',
  CRITICAL: '#ef4444',
};

export const riskLevelBg: Record<RiskLevel, string> = {
  SAFE: 'bg-safe/15 text-safe border-safe/30',
  LOW: 'bg-lime-500/15 text-lime-400 border-lime-500/30',
  SUSPICIOUS: 'bg-caution/15 text-caution border-caution/30',
  HIGH: 'bg-high/15 text-high border-high/30',
  CRITICAL: 'bg-critical/15 text-critical border-critical/30',
};
