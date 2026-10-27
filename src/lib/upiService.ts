/**
 * UPI Linking & Payment Gateway Service
 * Supports PhonePe, Google Pay (GPay), Paytm, and NPCI Universal UPI Deep Links & QR Codes.
 */
import QRCode from 'qrcode';

export type UpiProvider = 'phonepe' | 'gpay' | 'paytm' | 'bhim';

export interface LinkedUpiAccount {
  upiId: string;
  provider: UpiProvider;
  accountHolderName: string;
  bankName: string;
  isVerified: boolean;
  linkedAt: string;
  phoneNumber?: string;
}

export interface UpiPaymentIntent {
  vpa: string;
  name: string;
  amount: number;
  note: string;
  transactionRef: string;
  currency: string;
}

const STORAGE_KEY_PREFIX = 'spendwise_linked_upi_';

export const UPI_PROVIDERS: Array<{
  id: UpiProvider;
  name: string;
  brandColor: string;
  bgLight: string;
  borderLight: string;
  defaultHandle: string;
  deepLinkPrefix: string;
  appScheme: string;
  description: string;
}> = [
  {
    id: 'phonepe',
    name: 'PhonePe',
    brandColor: '#5f259f',
    bgLight: 'bg-purple-50',
    borderLight: 'border-purple-200',
    defaultHandle: '@ybl',
    deepLinkPrefix: 'phonepe://pay',
    appScheme: 'phonepe://',
    description: 'Direct PhonePe Payment Gateway & UPI Intent',
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    brandColor: '#1a73e8',
    bgLight: 'bg-blue-50',
    borderLight: 'border-blue-200',
    defaultHandle: '@okaxis',
    deepLinkPrefix: 'tez://upi/pay',
    appScheme: 'tez://',
    description: 'Direct Google Pay (Tez) Payment Gateway & UPI Intent',
  },
  {
    id: 'paytm',
    name: 'Paytm UPI',
    brandColor: '#00b9f5',
    bgLight: 'bg-cyan-50',
    borderLight: 'border-cyan-200',
    defaultHandle: '@paytm',
    deepLinkPrefix: 'paytmmp://pay',
    appScheme: 'paytmmp://',
    description: 'Paytm Wallet & UPI Gateway',
  },
  {
    id: 'bhim',
    name: 'BHIM / Any UPI',
    brandColor: '#00796b',
    bgLight: 'bg-teal-50',
    borderLight: 'border-teal-200',
    defaultHandle: '@upi',
    deepLinkPrefix: 'upi://pay',
    appScheme: 'upi://',
    description: 'National Payments Corporation of India (NPCI) Standard',
  },
];

export function getLinkedUpiAccount(userId: string): LinkedUpiAccount | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load linked UPI account:', e);
  }
  return null;
}

export function saveLinkedUpiAccount(userId: string, account: LinkedUpiAccount): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(account));
  } catch (e) {
    console.error('Failed to save linked UPI account:', e);
  }
}

export function removeLinkedUpiAccount(userId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
  } catch (e) {
    console.error('Failed to remove linked UPI account:', e);
  }
}

/**
 * Builds the standard NPCI UPI Intent URI compatible with all Indian UPI Apps
 * Format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...&tr=...
 */
export function buildUniversalUpiUri(intent: UpiPaymentIntent): string {
  const params = new URLSearchParams();
  params.set('pa', intent.vpa);
  params.set('pn', intent.name || 'SpendWise User');
  if (intent.amount > 0) {
    params.set('am', intent.amount.toFixed(2));
  }
  params.set('cu', intent.currency || 'INR');
  params.set('tn', intent.note || 'SpendWise UPI Balance Top-up');
  if (intent.transactionRef) {
    params.set('tr', intent.transactionRef);
  }
  return `upi://pay?${params.toString()}`;
}

/**
 * Builds app-specific gateway deep links (PhonePe, Google Pay, Paytm)
 */
export function buildProviderGatewayUri(provider: UpiProvider, intent: UpiPaymentIntent): string {
  const universal = buildUniversalUpiUri(intent);
  const query = universal.split('?')[1] || '';

  switch (provider) {
    case 'phonepe':
      return `phonepe://pay?${query}`;
    case 'gpay':
      return `tez://upi/pay?${query}`;
    case 'paytm':
      return `paytmmp://pay?${query}`;
    default:
      return universal;
  }
}

/**
 * Generates high-resolution base64 QR Code image string for scanning with PhonePe / Google Pay
 */
export async function generateUpiQrCode(upiUri: string): Promise<string> {
  try {
    return await QRCode.toDataURL(upiUri, {
      width: 260,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate UPI QR code:', err);
    throw err;
  }
}
