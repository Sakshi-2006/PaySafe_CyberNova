import type { RiskResult } from './riskEngine';

export interface SavedAnalysis extends RiskResult {
  id: string;
  label: string;
}

export interface TransactionRecord {
  id: string;
  transaction: string;
  recipient: string;
  amount: number;
  date: string;
  riskScore: number;
  status: 'SAFE' | 'SUSPICIOUS' | 'HIGH RISK' | 'BLOCKED';
  factors: { title: string; description: string; scoreContribution: number }[];
  recommendation: string;
  threatType: string;
}

export interface AlertRecord {
  id: string;
  category: 'Critical' | 'High' | 'Medium' | 'Low';
  icon: string;
  title: string;
  description: string;
  time: string;
  riskScore: number;
  read: boolean;
  dismissed: boolean;
  source: string;
}

export interface RiskHistoryEntry {
  id: string;
  date: string;
  riskScore: number;
  riskLevel: string;
  threatType: string;
  inputType: string;
  label: string;
}

const KEYS = {
  auth: 'fsg_auth',
  analyses: 'fsg_analyses',
  alerts: 'fsg_alerts',
  settings: 'fsg_settings',
  transactions: 'fsg_transactions',
  history: 'fsg_history',
};

export function getAuth(): { name: string; email: string } | null {
  try {
    const raw = localStorage.getItem(KEYS.auth);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuth(user: { name: string; email: string }): void {
  localStorage.setItem(KEYS.auth, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(KEYS.auth);
}

export function getSavedAnalyses(): SavedAnalysis[] {
  try {
    const raw = localStorage.getItem(KEYS.analyses);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAnalysis(result: RiskResult, label: string): SavedAnalysis {
  const analyses = getSavedAnalyses();
  const entry: SavedAnalysis = { ...result, id: crypto.randomUUID(), label };
  analyses.unshift(entry);
  localStorage.setItem(KEYS.analyses, JSON.stringify(analyses.slice(0, 100)));
  return entry;
}

export function getAlerts(): AlertRecord[] {
  try {
    const raw = localStorage.getItem(KEYS.alerts);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const defaults = defaultAlerts();
  localStorage.setItem(KEYS.alerts, JSON.stringify(defaults));
  return defaults;
}

export function setAlerts(alerts: AlertRecord[]): void {
  localStorage.setItem(KEYS.alerts, JSON.stringify(alerts));
}

export function getTransactions(): TransactionRecord[] {
  try {
    const raw = localStorage.getItem(KEYS.transactions);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const defaults = defaultTransactions();
  localStorage.setItem(KEYS.transactions, JSON.stringify(defaults));
  return defaults;
}

export function setTransactions(txs: TransactionRecord[]): void {
  localStorage.setItem(KEYS.transactions, JSON.stringify(txs));
}

export function getHistory(): RiskHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.history);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const defaults = defaultHistory();
  localStorage.setItem(KEYS.history, JSON.stringify(defaults));
  return defaults;
}

export function addHistoryEntry(entry: RiskHistoryEntry): void {
  const history = getHistory();
  history.unshift(entry);
  localStorage.setItem(KEYS.history, JSON.stringify(history.slice(0, 200)));
}

export function clearHistory(): void {
  localStorage.removeItem(KEYS.history);
  localStorage.removeItem(KEYS.analyses);
  localStorage.removeItem(KEYS.alerts);
  localStorage.removeItem(KEYS.transactions);
}

export interface AppSettings {
  securityNotifications: boolean;
  riskAlerts: boolean;
  emailNotifications: boolean;
  saveHistory: boolean;
  darkMode: boolean;
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.settings);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSettings();
}

export function setSettings(settings: AppSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

function defaultSettings(): AppSettings {
  return {
    securityNotifications: true,
    riskAlerts: true,
    emailNotifications: false,
    saveHistory: true,
    darkMode: true,
  };
}

// ── Demo Data ─────────────────────────────────────────────────

function defaultTransactions(): TransactionRecord[] {
  return [
    {
      id: crypto.randomUUID(),
      transaction: 'Amazon Order Payment',
      recipient: 'amazon@okaxis',
      amount: 2499,
      date: '2026-09-04',
      riskScore: 12,
      status: 'SAFE',
      factors: [
        { title: 'Known Recipient', description: 'You have transacted with this recipient before.', scoreContribution: 2 },
        { title: 'Normal Amount', description: 'Amount is within typical spending range.', scoreContribution: 5 },
        { title: 'Normal Time', description: 'Transaction during normal hours.', scoreContribution: 5 },
      ],
      recommendation: 'Transaction appears safe. Proceed normally.',
      threatType: 'No Threat Detected',
    },
    {
      id: crypto.randomUUID(),
      transaction: 'Unknown UPI Request',
      recipient: 'unknown.payment@upi',
      amount: 18500,
      date: '2026-09-04',
      riskScore: 91,
      status: 'BLOCKED',
      factors: [
        { title: 'New Recipient', description: 'First transaction with this recipient.', scoreContribution: 22 },
        { title: 'High Amount', description: '₹18,500 is above average.', scoreContribution: 20 },
        { title: 'Suspicious UPI ID', description: 'Contains "unknown" pattern.', scoreContribution: 20 },
        { title: 'Unusual Time', description: 'Initiated at 11:47 PM.', scoreContribution: 16 },
        { title: 'High-Risk Category', description: 'Payment Request category.', scoreContribution: 13 },
      ],
      recommendation: 'Do not proceed. Verify the recipient independently before sending money.',
      threatType: 'New Recipient + High Value',
    },
    {
      id: crypto.randomUUID(),
      transaction: 'Electricity Bill',
      recipient: 'mseb@okhdfcbank',
      amount: 3200,
      date: '2026-09-03',
      riskScore: 18,
      status: 'SAFE',
      factors: [
        { title: 'Known Recipient', description: 'Regular bill payment recipient.', scoreContribution: 5 },
        { title: 'Normal Amount', description: 'Within expected bill range.', scoreContribution: 8 },
        { title: 'Normal Time', description: 'During business hours.', scoreContribution: 5 },
      ],
      recommendation: 'Transaction appears safe. Proceed normally.',
      threatType: 'No Threat Detected',
    },
    {
      id: crypto.randomUUID(),
      transaction: 'Investment Scheme',
      recipient: 'double-money@upi',
      amount: 10000,
      date: '2026-09-03',
      riskScore: 78,
      status: 'HIGH RISK',
      factors: [
        { title: 'Suspicious Recipient', description: 'Contains "double-money" pattern.', scoreContribution: 20 },
        { title: 'High-Risk Category', description: 'Investment category.', scoreContribution: 14 },
        { title: 'Elevated Amount', description: '₹10,000 above everyday range.', scoreContribution: 10 },
        { title: 'New Recipient', description: 'No prior history.', scoreContribution: 22 },
        { title: 'Unusual Time', description: 'Initiated at 1:30 AM.', scoreContribution: 12 },
      ],
      recommendation: 'High risk transaction. Verify independently before proceeding.',
      threatType: 'Investment Scam Pattern',
    },
    {
      id: crypto.randomUUID(),
      transaction: 'Food Delivery',
      recipient: 'zomato@okaxis',
      amount: 450,
      date: '2026-09-02',
      riskScore: 8,
      status: 'SAFE',
      factors: [
        { title: 'Known Merchant', description: 'Regular food delivery recipient.', scoreContribution: 3 },
        { title: 'Low Amount', description: 'Within normal food order range.', scoreContribution: 3 },
        { title: 'Normal Time', description: 'During evening hours.', scoreContribution: 2 },
      ],
      recommendation: 'Transaction appears safe. Proceed normally.',
      threatType: 'No Threat Detected',
    },
    {
      id: crypto.randomUUID(),
      transaction: 'KYC Verification Link',
      recipient: 'sbi-verify@upi',
      amount: 0,
      date: '2026-09-02',
      riskScore: 85,
      status: 'HIGH RISK',
      factors: [
        { title: 'Brand Impersonation', description: 'Claims to be SBI with non-official handle.', scoreContribution: 24 },
        { title: 'KYC Keyword', description: 'Uses KYC verification language.', scoreContribution: 18 },
        { title: 'Suspicious Pattern', description: 'Contains "verify" in recipient.', scoreContribution: 20 },
        { title: 'New Recipient', description: 'No prior history.', scoreContribution: 18 },
      ],
      recommendation: 'Do not proceed. This appears to be a KYC impersonation scam.',
      threatType: 'KYC Impersonation Scam',
    },
    {
      id: crypto.randomUUID(),
      transaction: 'Friend Transfer',
      recipient: 'rahul@okhdfcbank',
      amount: 2000,
      date: '2026-09-01',
      riskScore: 15,
      status: 'SAFE',
      factors: [
        { title: 'Known Recipient', description: 'Frequent transfers to this contact.', scoreContribution: 5 },
        { title: 'Normal Amount', description: 'Within typical range.', scoreContribution: 5 },
        { title: 'Normal Time', description: 'During evening hours.', scoreContribution: 5 },
      ],
      recommendation: 'Transaction appears safe. Proceed normally.',
      threatType: 'No Threat Detected',
    },
    {
      id: crypto.randomUUID(),
      transaction: 'Lottery Prize Claim',
      recipient: 'winner-claim@upi',
      amount: 5000,
      date: '2026-08-31',
      riskScore: 88,
      status: 'BLOCKED',
      factors: [
        { title: 'Lottery Scam Pattern', description: 'Contains "winner" pattern.', scoreContribution: 22 },
        { title: 'High-Risk Category', description: 'Lottery/prize category.', scoreContribution: 14 },
        { title: 'New Recipient', description: 'No prior history.', scoreContribution: 22 },
        { title: 'Elevated Amount', description: '₹5,000 processing fee request.', scoreContribution: 10 },
        { title: 'Suspicious Note', description: 'Claims lottery winnings.', scoreContribution: 20 },
      ],
      recommendation: 'Do not proceed. This is a classic lottery scam pattern.',
      threatType: 'Lottery Prize Scam',
    },
    {
      id: crypto.randomUUID(),
      transaction: 'Netflix Subscription',
      recipient: 'netflix@okaxis',
      amount: 649,
      date: '2026-08-30',
      riskScore: 10,
      status: 'SAFE',
      factors: [
        { title: 'Known Merchant', description: 'Regular subscription payment.', scoreContribution: 4 },
        { title: 'Normal Amount', description: 'Standard subscription price.', scoreContribution: 4 },
        { title: 'Normal Time', description: 'During business hours.', scoreContribution: 2 },
      ],
      recommendation: 'Transaction appears safe. Proceed normally.',
      threatType: 'No Threat Detected',
    },
    {
      id: crypto.randomUUID(),
      transaction: 'OTP Sharing Request',
      recipient: 'support-verify@upi',
      amount: 0,
      date: '2026-08-29',
      riskScore: 94,
      status: 'BLOCKED',
      factors: [
        { title: 'OTP Request', description: 'Requests OTP sharing.', scoreContribution: 20 },
        { title: 'Suspicious Handle', description: 'Contains "verify" pattern.', scoreContribution: 20 },
        { title: 'New Recipient', description: 'No prior history.', scoreContribution: 22 },
        { title: 'Brand Impersonation', description: 'Claims to be customer support.', scoreContribution: 18 },
        { title: 'Unusual Time', description: 'Initiated at 2:15 AM.', scoreContribution: 14 },
      ],
      recommendation: 'Do not share OTP. Report this as fraud immediately.',
      threatType: 'OTP Harvesting Scam',
    },
  ];
}

function defaultAlerts(): AlertRecord[] {
  return [
    {
      id: crypto.randomUUID(),
      category: 'Critical',
      icon: 'ShieldAlert',
      title: 'Critical Phishing Attempt Detected',
      description: 'A message impersonating SBI Bank was flagged with a 94/100 risk score. Urgency manipulation and suspicious URL detected.',
      time: '2 hours ago',
      riskScore: 94,
      read: false,
      dismissed: false,
      source: 'Message Analysis',
    },
    {
      id: crypto.randomUUID(),
      category: 'Critical',
      icon: 'CreditCard',
      title: 'High-Risk Transaction Blocked',
      description: 'A ₹18,500 transaction to unknown.payment@upi was flagged and blocked. New recipient with suspicious UPI pattern.',
      time: '5 hours ago',
      riskScore: 91,
      read: false,
      dismissed: false,
      source: 'Transaction Analysis',
    },
    {
      id: crypto.randomUUID(),
      category: 'High',
      icon: 'Link',
      title: 'Suspicious Payment Link',
      description: 'A payment link with lookalike domain structure was detected. Multiple hyphens and financial keyword clustering.',
      time: '8 hours ago',
      riskScore: 82,
      read: false,
      dismissed: false,
      source: 'Link Analysis',
    },
    {
      id: crypto.randomUUID(),
      category: 'High',
      icon: 'QrCode',
      title: 'Suspicious QR Payment Request',
      description: 'A QR code requesting ₹12,999 to an unverified recipient was flagged. High amount with no transaction history.',
      time: '1 day ago',
      riskScore: 76,
      read: true,
      dismissed: false,
      source: 'QR Analysis',
    },
    {
      id: crypto.randomUUID(),
      category: 'Medium',
      icon: 'MessageSquare',
      title: 'Investment Scheme Message',
      description: 'A WhatsApp message promising guaranteed returns was flagged. Financial lure with investment keywords.',
      time: '1 day ago',
      riskScore: 64,
      read: true,
      dismissed: false,
      source: 'Message Analysis',
    },
    {
      id: crypto.randomUUID(),
      category: 'Medium',
      icon: 'Bell',
      title: 'Unusual Login Activity',
      description: 'A new device accessed your account. If this was you, no action is needed.',
      time: '2 days ago',
      riskScore: 45,
      read: true,
      dismissed: false,
      source: 'System',
    },
    {
      id: crypto.randomUUID(),
      category: 'Low',
      icon: 'Info',
      title: 'Weekly Security Report Ready',
      description: 'Your weekly security summary is available. 3 threats detected and blocked this week.',
      time: '3 days ago',
      riskScore: 20,
      read: true,
      dismissed: false,
      source: 'System',
    },
  ];
}

function defaultHistory(): RiskHistoryEntry[] {
  return [
    { id: crypto.randomUUID(), date: '2026-09-04', riskScore: 94, riskLevel: 'CRITICAL', threatType: 'Phishing', inputType: 'message', label: 'SBI KYC Phishing Message' },
    { id: crypto.randomUUID(), date: '2026-09-04', riskScore: 91, riskLevel: 'CRITICAL', threatType: 'New Recipient', inputType: 'transaction', label: 'Unknown UPI ₹18,500' },
    { id: crypto.randomUUID(), date: '2026-09-03', riskScore: 82, riskLevel: 'HIGH', threatType: 'Phishing URL', inputType: 'url', label: 'Lookalike Payment Link' },
    { id: crypto.randomUUID(), date: '2026-09-03', riskScore: 76, riskLevel: 'HIGH', threatType: 'Suspicious QR', inputType: 'qr', label: 'QR ₹12,999 Unknown' },
    { id: crypto.randomUUID(), date: '2026-09-02', riskScore: 64, riskLevel: 'SUSPICIOUS', threatType: 'Investment Lure', inputType: 'message', label: 'WhatsApp Investment Scheme' },
    { id: crypto.randomUUID(), date: '2026-09-02', riskScore: 85, riskLevel: 'HIGH', threatType: 'KYC Impersonation', inputType: 'transaction', label: 'SBI KYC Verification' },
    { id: crypto.randomUUID(), date: '2026-09-01', riskScore: 12, riskLevel: 'SAFE', threatType: 'No Threat', inputType: 'transaction', label: 'Amazon Payment' },
    { id: crypto.randomUUID(), date: '2026-09-01', riskScore: 15, riskLevel: 'LOW', threatType: 'No Threat', inputType: 'message', label: 'Friend Transfer Request' },
    { id: crypto.randomUUID(), date: '2026-08-31', riskScore: 88, riskLevel: 'CRITICAL', threatType: 'Lottery Scam', inputType: 'transaction', label: 'Lottery Prize Claim' },
    { id: crypto.randomUUID(), date: '2026-08-31', riskScore: 8, riskLevel: 'SAFE', threatType: 'No Threat', inputType: 'transaction', label: 'Food Delivery' },
    { id: crypto.randomUUID(), date: '2026-08-30', riskScore: 10, riskLevel: 'LOW', threatType: 'No Threat', inputType: 'url', label: 'Netflix Subscription Link' },
    { id: crypto.randomUUID(), date: '2026-08-30', riskScore: 94, riskLevel: 'CRITICAL', threatType: 'OTP Harvesting', inputType: 'transaction', label: 'OTP Sharing Request' },
    { id: crypto.randomUUID(), date: '2026-08-29', riskScore: 18, riskLevel: 'LOW', threatType: 'No Threat', inputType: 'transaction', label: 'Electricity Bill' },
    { id: crypto.randomUUID(), date: '2026-08-28', riskScore: 72, riskLevel: 'HIGH', threatType: 'Fake Support', inputType: 'message', label: 'Fake Customer Support Call' },
    { id: crypto.randomUUID(), date: '2026-08-27', riskScore: 35, riskLevel: 'LOW', threatType: 'Minor Lure', inputType: 'message', label: 'Cashback Offer Message' },
  ];
}

export const DEMO_SCAM_MESSAGE =
  'URGENT: Your SBI account will be blocked today due to incomplete KYC verification. Click the link below immediately to verify your account and avoid suspension: http://sbi-verify-security-example.com';

export const DEMO_LINK = 'http://secure-sbi-payment-verification-example.com';

export const DEMO_QR = {
  upiId: 'unknown.payment@upi',
  recipientName: 'Unknown Recipient',
  amount: 12999,
  note: 'Urgent verification payment',
};

export const DEMO_TRANSACTION = {
  amount: 18500,
  recipient: 'unknown@upi',
  category: 'Payment Request',
  time: '11:47 PM',
  isNewRecipient: true,
  previousFrequency: 0,
};

export interface ScamGuide {
  id: string;
  category: string;
  title: string;
  shortDescription: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  howItWorks: string;
  warningSigns: string[];
  whatToDo: string[];
  whatNotToDo: string[];
}

export const SCAM_GUIDES: ScamGuide[] = [
  {
    id: 'upi-scams',
    category: 'UPI Scams',
    title: 'UPI Payment Request Scams',
    shortDescription: 'Fraudsters send UPI collect requests disguised as payments, tricking you into approving money out of your account.',
    riskLevel: 'HIGH',
    howItWorks:
      'Scammers send a UPI "collect" request instead of sending you money. When you approve it thinking you are receiving funds, money actually leaves your account. They often combine this with a phone call claiming to be from a bank or customer support.',
    warningSigns: [
      'You receive a "collect" or "request" instead of a payment',
      'The recipient UPI ID is unfamiliar',
      'Caller pressures you to approve quickly',
      'The amount matches something you were expecting to receive',
    ],
    whatToDo: [
      'Always check whether it says "Send" or "Receive" before approving',
      'Verify the recipient UPI ID and name',
      'Decline any unsolicited collect request',
      'Report the UPI ID to your bank and the National Cyber Crime portal',
    ],
    whatNotToDo: [
      'Do not approve requests while on a phone call with a stranger',
      'Do not share your UPI PIN or OTP',
      'Do not assume a request is safe because the amount looks familiar',
    ],
  },
  {
    id: 'qr-scams',
    category: 'QR Code Scams',
    title: 'Malicious QR Code Payments',
    shortDescription: 'Scammers share QR codes that initiate payment requests, not payments. Scanning can drain your account.',
    riskLevel: 'HIGH',
    howItWorks:
      'You are sent a QR code, often via WhatsApp or SMS, that looks like a payment you will receive. When you scan it and enter your PIN, money is actually debited from your account to the scammer.',
    warningSigns: [
      'A stranger asks you to scan a QR code to receive money',
      'The QR prompts a "pay" screen, not a "receive" screen',
      'You are asked to enter your UPI PIN to "receive" money',
      'The amount or recipient looks unfamiliar',
    ],
    whatToDo: [
      'Check whether the screen says "Pay" or "Receive" before entering your PIN',
      'Verify the recipient name and amount',
      'Never enter your PIN to receive money',
      'Report suspicious QR codes to the cyber crime helpline 1930',
    ],
    whatNotToDo: [
      'Do not scan QR codes from unknown senders',
      'Do not enter your UPI PIN unless you are intentionally sending money',
      'Do not forward suspicious QR codes to others',
    ],
  },
  {
    id: 'phishing',
    category: 'Phishing',
    title: 'Phishing Messages and Emails',
    shortDescription: 'Fake messages with malicious links designed to steal your credentials and financial information.',
    riskLevel: 'CRITICAL',
    howItWorks:
      'Fraudsters send messages or emails that look like they come from your bank, a delivery service, or a government agency. The messages contain links to fake websites that capture your login credentials, OTP, or card details.',
    warningSigns: [
      'Urgent language demanding immediate action',
      'Links with misspelled or lookalike domains',
      'Requests for OTP, CVV, or password',
      'Generic greetings instead of your name',
      'Threats of account suspension',
    ],
    whatToDo: [
      'Access your bank account only through the official app or website',
      'Verify any urgent request by calling the official helpline',
      'Report phishing messages to your bank',
      'Delete suspicious messages without clicking any links',
    ],
    whatNotToDo: [
      'Do not click links in unsolicited messages',
      'Do not enter credentials on pages reached via links',
      'Do not share OTP or CVV with anyone',
    ],
  },
  {
    id: 'financial-impersonation',
    category: 'Financial Impersonation',
    title: 'Bank and RBI Impersonation',
    shortDescription: 'Criminals pose as bank officials or RBI representatives to extract money or sensitive information.',
    riskLevel: 'CRITICAL',
    howItWorks:
      'Scammers call or message claiming to be from your bank or the Reserve Bank of India. They warn about account suspension, KYC expiry, or suspicious activity, then ask you to transfer money to a "safe account" or share OTP to "verify" your identity.',
    warningSigns: [
      'Caller claims to be from RBI or your bank',
      'Threats of account suspension or KYC expiry',
      'Requests to transfer money to a "safe" or "verification" account',
      'Requests for OTP, PIN, or card details',
      'Pressure to act immediately',
    ],
    whatToDo: [
      'Hang up and call your bank using the number on the back of your card',
      'RBI never calls individuals for KYC or verification',
      'Report the number to the cyber crime helpline 1930',
      'Block the caller',
    ],
    whatNotToDo: [
      'Do not share OTP, PIN, or CVV with anyone, ever',
      'Do not transfer money to accounts someone gives you over the phone',
      'Do not install any app a caller asks you to install',
    ],
  },
  {
    id: 'investment-scams',
    category: 'Investment Scams',
    title: 'Fake Investment and Trading Schemes',
    shortDescription: 'Promises of guaranteed high returns through crypto, forex, or stock tips that vanish with your money.',
    riskLevel: 'HIGH',
    howItWorks:
      'Scammers contact you via WhatsApp or Telegram with promises of guaranteed returns from crypto, forex, or stock trading. They show fake profits, ask you to invest more, and eventually disappear. Some use fake trading apps that show balances you can never withdraw.',
    warningSigns: [
      'Guaranteed or unusually high returns',
      'Pressure to invest quickly',
      'Unregulated or unverified trading platforms',
      'Requests to pay via UPI or crypto',
      'WhatsApp or Telegram groups with "investment tips"',
    ],
    whatToDo: [
      'Verify the platform is SEBI-registered for Indian investments',
      'Be skeptical of any guaranteed returns',
      'Research the company and read independent reviews',
      'Report to the cyber crime helpline 1930 if defrauded',
    ],
    whatNotToDo: [
      'Do not invest based on messages from strangers',
      'Do not send money via UPI to unverified investment platforms',
      'Do not share your bank or trading account details',
    ],
  },
  {
    id: 'otp-scams',
    category: 'OTP Scams',
    title: 'OTP and Credential Theft',
    shortDescription: 'Fraudsters trick you into sharing OTPs that let them authorize transactions from your account.',
    riskLevel: 'CRITICAL',
    howItWorks:
      'A scammer calls pretending to be from your bank, a delivery service, or a utility company. They create a fake reason to need your OTP — "to confirm a delivery", "to verify your number", or "to cancel a transaction". The OTP is actually for a transaction they are initiating on your account.',
    warningSigns: [
      'Anyone asks you to share an OTP over a call or message',
      'You receive an OTP you did not request',
      'Caller creates urgency around sharing the OTP',
      'Claims that sharing the OTP will "cancel" or "reverse" a transaction',
    ],
    whatToDo: [
      'Never share any OTP with anyone for any reason',
      'If you receive an unexpected OTP, check your banking app immediately',
      'Report the caller to 1930',
      'Change your banking password if you shared an OTP',
    ],
    whatNotToDo: [
      'Do not read out or forward OTPs to anyone',
      'Do not believe claims that OTP sharing will cancel a transaction',
      'Do not install screen-sharing apps at a caller request',
    ],
  },
  {
    id: 'job-scams',
    category: 'Job Scams',
    title: 'Fake Job Offer and Work-From-Home Scams',
    shortDescription: 'Fraudulent job offers that require upfront payments for registration, training, or equipment.',
    riskLevel: 'HIGH',
    howItWorks:
      'Scammers post fake job listings or message you on WhatsApp/Telegram offering high-paying work-from-home jobs. They ask for upfront fees for registration, training, or equipment. After payment, they disappear or assign fake tasks that never result in payment.',
    warningSigns: [
      'Job offers requiring upfront payment',
      'Unsolicited job offers via WhatsApp or Telegram',
      'Vague job descriptions with high pay',
      'Requests for registration or security deposits',
      "No verifiable company website or presence",
    ],
    whatToDo: [
      'Verify the company through official channels',
      'Never pay for a job — legitimate employers do not charge fees',
      'Research the company on LinkedIn and official registries',
      'Report to the cyber crime helpline 1930',
    ],
    whatNotToDo: [
      'Do not pay any registration or training fees',
      'Do not share your Aadhaar, PAN, or bank details with unverified recruiters',
      'Do not accept jobs that require you to use your personal bank account for transfers',
    ],
  },
  {
    id: 'fake-support',
    category: 'Fake Customer Support Scams',
    title: 'Fake Customer Support and Refund Scams',
    shortDescription: 'Scammers pose as customer support from known companies to gain remote access or steal payment details.',
    riskLevel: 'HIGH',
    howItWorks:
      'Fraudsters find you through fake customer support numbers on search engines or social media. They pose as support agents for banks, e-commerce, or telecom companies, then ask you to install remote access apps, share OTPs, or "verify" your card details for a fake refund.',
    warningSigns: [
      'Customer support numbers found on social media or search, not official websites',
      'Requests to install AnyDesk, TeamViewer, or similar remote access apps',
      'Requests for card details, CVV, or OTP for a "refund"',
      'Pressure to act quickly to avoid losing a refund',
    ],
    whatToDo: [
      'Only use customer support numbers from official websites or app',
      'Never install remote access apps at a support agent request',
      'Verify refund status through the official app or website',
      'Report fake support numbers to 1930',
    ],
    whatNotToDo: [
      'Do not call numbers found in social media comments or posts',
      'Do not install screen-sharing or remote access apps',
      'Do not share CVV, OTP, or card details for refunds',
    ],
  },
];
