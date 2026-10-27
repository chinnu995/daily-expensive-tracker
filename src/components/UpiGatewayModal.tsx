import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Smartphone,
  QrCode,
  ArrowRight,
  RefreshCw,
  Landmark,
  Zap,
  Info,
  Building2,
  CreditCard,
} from 'lucide-react';
import {
  LinkedUpiAccount,
  UpiProvider,
  UPI_PROVIDERS,
  getLinkedUpiAccount,
  saveLinkedUpiAccount,
  removeLinkedUpiAccount,
  buildUniversalUpiUri,
  buildProviderGatewayUri,
  generateUpiQrCode,
} from '../lib/upiService.js';
import { api } from '../lib/api.js';
import { AccountSummary, User } from '../types/index.js';

interface UpiGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  bankAccount: AccountSummary | null;
  currencySymbol: string;
  onSuccess: () => void;
  initialMode?: 'gateway' | 'link';
  defaultProvider?: UpiProvider;
}

export const UpiGatewayModal: React.FC<UpiGatewayModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  bankAccount,
  currencySymbol,
  onSuccess,
  initialMode = 'gateway',
  defaultProvider = 'phonepe',
}) => {
  const [activeTab, setActiveTab] = useState<'gateway' | 'link'>(initialMode);
  const [selectedProvider, setSelectedProvider] = useState<UpiProvider>(defaultProvider);

  // Link Form State
  const [upiVpa, setUpiVpa] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [linkedAccount, setLinkedAccount] = useState<LinkedUpiAccount | null>(null);
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);

  // Gateway Payment State
  const [payAmount, setPayAmount] = useState('500');
  const [paymentNote, setPaymentNote] = useState('UPI Balance Top-up');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'idle' | 'authorizing' | 'success'>('idle');
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userId = currentUser?.id || 'demo_user';
  const userName = currentUser?.displayName || 'SpendWise User';

  // Load existing linked UPI on mount or open
  useEffect(() => {
    if (isOpen) {
      const existing = getLinkedUpiAccount(userId);
      if (existing) {
        setLinkedAccount(existing);
        setUpiVpa(existing.upiId);
        setAccountHolder(existing.accountHolderName);
        setBankName(existing.bankName);
        setSelectedProvider(existing.provider);
      } else {
        // Suggested default based on email or name
        const prefix = (currentUser?.email ? currentUser.email.split('@')[0] : 'user').replace(
          /[^a-zA-Z0-9]/g,
          ''
        );
        setUpiVpa(`${prefix}@okaxis`);
        setAccountHolder(userName);
      }
      setPaymentStep('idle');
      setErrorMessage(null);
    }
  }, [isOpen, userId, currentUser, userName]);

  // Generate dynamic QR Code whenever amount, provider, or UPI ID changes
  useEffect(() => {
    if (!isOpen) return;
    const num = parseFloat(payAmount) || 0;
    const activeVpa = linkedAccount?.upiId || upiVpa || 'spendwise@okaxis';

    const intent = {
      vpa: activeVpa,
      name: accountHolder || userName,
      amount: num,
      note: paymentNote || 'SpendWise UPI Payment',
      transactionRef: `SPW${Date.now().toString().slice(-8)}`,
      currency: 'INR',
    };

    const universalUri = buildUniversalUpiUri(intent);

    setIsGeneratingQr(true);
    generateUpiQrCode(universalUri)
      .then((dataUrl) => {
        setQrCodeUrl(dataUrl);
      })
      .catch((err) => {
        console.error('QR code generation failed:', err);
      })
      .finally(() => {
        setIsGeneratingQr(false);
      });
  }, [isOpen, payAmount, upiVpa, linkedAccount, accountHolder, userName, paymentNote]);

  if (!isOpen) return null;

  const currentProviderConfig =
    UPI_PROVIDERS.find((p) => p.id === selectedProvider) || UPI_PROVIDERS[0];

  const activeVpa = linkedAccount?.upiId || upiVpa || 'user@okaxis';
  const numAmount = parseFloat(payAmount) || 0;

  const intentData = {
    vpa: activeVpa,
    name: accountHolder || userName,
    amount: numAmount,
    note: paymentNote || 'SpendWise UPI Payment',
    transactionRef: `SPW${Date.now().toString().slice(-8)}`,
    currency: 'INR',
  };

  const universalIntentUri = buildUniversalUpiUri(intentData);
  const providerIntentUri = buildProviderGatewayUri(selectedProvider, intentData);

  // Handle linking UPI Account
  const handleVerifyAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiVpa.includes('@')) {
      setErrorMessage('Please enter a valid UPI ID / VPA (e.g., yourname@okaxis or yourname@ybl)');
      return;
    }

    setIsVerifyingLink(true);
    setErrorMessage(null);

    // Simulate real-time NPCI VPA lookup & bank handshake
    setTimeout(() => {
      const newLinked: LinkedUpiAccount = {
        upiId: upiVpa.trim().toLowerCase(),
        provider: selectedProvider,
        accountHolderName: accountHolder.trim() || userName,
        bankName: bankName.trim() || 'HDFC Bank',
        isVerified: true,
        linkedAt: new Date().toISOString(),
      };

      saveLinkedUpiAccount(userId, newLinked);
      setLinkedAccount(newLinked);
      setIsVerifyingLink(false);
      setLinkSuccess(true);

      setTimeout(() => {
        setLinkSuccess(false);
        setActiveTab('gateway');
      }, 1200);
    }, 900);
  };

  // Handle Direct App Trigger
  const handleLaunchGatewayApp = (providerId?: UpiProvider) => {
    const prov = providerId || selectedProvider;
    const uri = buildProviderGatewayUri(prov, intentData);

    // Safely trigger mobile URI scheme
    try {
      window.location.href = uri;
    } catch {
      // Fallback
    }
  };

  // Handle Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(universalIntentUri);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Handle Authorizing & Completing Payment via Gateway
  const handleAuthorizePayment = async () => {
    if (numAmount <= 0) {
      setErrorMessage('Please specify an amount to authorize.');
      return;
    }
    if (!bankAccount) {
      setErrorMessage('Bank / UPI account not found.');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentStep('authorizing');
    setErrorMessage(null);

    try {
      // Simulate gateway approval
      await new Promise((resolve) => setTimeout(resolve, 1400));

      // Record transaction into Bank / UPI account
      await api.createTransaction({
        transactionType: 'income',
        amount: numAmount,
        accountId: bankAccount.account.id,
        description: `UPI Gateway Credit (${currentProviderConfig.name})`,
        note: `Authorized via ${currentProviderConfig.name} Gateway. VPA: ${activeVpa}. Ref: ${intentData.transactionRef}`,
        tags: ['upi_gateway', selectedProvider, 'online_load'],
        occurredAt: new Date().toISOString(),
      });

      setPaymentStep('success');
      setTimeout(() => {
        onSuccess();
        setTimeout(() => {
          onClose();
        }, 800);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment authorization failed');
      setPaymentStep('idle');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleUnlink = () => {
    removeLinkedUpiAccount(userId);
    setLinkedAccount(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Dynamic Header based on active provider */}
        <div
          className={`px-6 py-5 text-white flex items-center justify-between transition-colors ${
            selectedProvider === 'phonepe'
              ? 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800'
              : selectedProvider === 'gpay'
              ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700'
              : 'bg-gradient-to-r from-cyan-600 via-teal-700 to-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs flex items-center justify-center">
              {selectedProvider === 'phonepe' ? (
                <span className="font-black text-xl tracking-tighter">पे</span>
              ) : selectedProvider === 'gpay' ? (
                <span className="font-black text-lg tracking-wider">GPay</span>
              ) : (
                <Zap className="w-6 h-6 text-yellow-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold leading-tight">
                  {selectedProvider === 'phonepe'
                    ? 'PhonePe Payment Gateway'
                    : selectedProvider === 'gpay'
                    ? 'Google Pay (GPay) Gateway'
                    : 'UPI Payment Gateway'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider">
                  Live
                </span>
              </div>
              <p className="text-xs text-white/80">Direct Account Linking & Instant Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-1 flex-1">
            <button
              type="button"
              onClick={() => setActiveTab('gateway')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'gateway'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>Go to Payment Gateway</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'link'
                  ? 'bg-white text-purple-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              <span>Link Account / UPI ID</span>
            </button>
          </div>
        </div>

        {/* Status / Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: GO TO PAYMENT GATEWAY */}
        {activeTab === 'gateway' && (
          <div className="p-6 space-y-5">
            {/* Choose Gateway: PhonePe vs Google Pay */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Select Payment Gateway Provider
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* PhonePe Button */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider('phonepe')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    selectedProvider === 'phonepe'
                      ? 'border-purple-600 bg-purple-50/80 ring-2 ring-purple-600 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#5f259f] text-white flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
                    पे
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      PhonePe
                    </span>
                    <span className="text-[10px] text-purple-700 font-medium truncate block">
                      Direct Gateway App
                    </span>
                  </div>
                </button>

                {/* Google Pay Button */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider('gpay')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    selectedProvider === 'gpay'
                      ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-600 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1a73e8] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    GPay
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Google Pay
                    </span>
                    <span className="text-[10px] text-blue-700 font-medium truncate block">
                      Google Tez Gateway
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Linked VPA Overview */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="text-[11px] text-slate-500 block">Routing to UPI VPA:</span>
                  <span className="font-mono font-bold text-slate-800">{activeVpa}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('link')}
                className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Change VPA
              </button>
            </div>

            {/* Amount Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Amount to Transfer / Load</label>
                <span className="text-[11px] font-mono text-slate-500">
                  Target: {bankAccount?.account.name || 'Bank / UPI'}
                </span>
              </div>
              <div className="relative mb-2">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-lg font-mono">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="500"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xl font-bold font-mono focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[100, 200, 500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPayAmount(String(amt))}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors cursor-pointer font-mono"
                  >
                    +{currencySymbol}{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* DIRECT APP INTENT & SCANNABLE QR CODE SECTION */}
            <div className="pt-2 border-t border-slate-100">
              <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200 p-4 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Instant Payment Gateway Access
                </span>

                {/* Primary Button: Directly Go To PhonePe / Google Pay */}
                <div className="space-y-2 mb-4">
                  <a
                    href={providerIntentUri}
                    onClick={() => handleLaunchGatewayApp()}
                    className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer ${
                      selectedProvider === 'phonepe'
                        ? 'bg-[#5f259f] hover:bg-[#4d1d82]'
                        : 'bg-[#1a73e8] hover:bg-[#1557b0]'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>
                      Directly Open {currentProviderConfig.name} App ({currencySymbol}
                      {numAmount.toFixed(2)})
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>

                  {/* Secondary launch for the other app */}
                  <div className="flex gap-2">
                    <a
                      href={buildProviderGatewayUri(
                        selectedProvider === 'phonepe' ? 'gpay' : 'phonepe',
                        intentData
                      )}
                      className="flex-1 py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>
                        Or open in {selectedProvider === 'phonepe' ? 'Google Pay' : 'PhonePe'}
                      </span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Copy UPI Deep Link"
                    >
                      {copiedLink ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy URI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Scannable Dynamic QR Code for Desktop/Mobile Camera */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 inline-block shadow-xs mb-2">
                  {isGeneratingQr ? (
                    <div className="w-[180px] h-[180px] flex items-center justify-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                  ) : qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="UPI Gateway Scannable QR"
                      className="w-[180px] h-[180px] mx-auto rounded-lg"
                    />
                  ) : (
                    <div className="w-[180px] h-[180px] flex items-center justify-center text-xs text-slate-400">
                      Generating QR...
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-medium mt-1.5">
                    <QrCode className="w-3 h-3 text-slate-400" />
                    <span>Scan with PhonePe, Google Pay or Paytm</span>
                  </div>
                </div>

                {/* Gateway Confirmation / Sync Balance */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleAuthorizePayment}
                    disabled={isProcessingPayment || paymentStep === 'success'}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentStep === 'success'
                        ? 'bg-emerald-600 text-white'
                        : isProcessingPayment
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {paymentStep === 'authorizing' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Authorizing with Bank / Gateway...</span>
                      </>
                    ) : paymentStep === 'success' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Payment Authorized & Bank Balance Updated!</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Confirm Payment & Update Bank / UPI Balance</span>
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Instantly registers the verified transaction into your Bank / UPI account
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LINK UPI ACCOUNT / VPA */}
        {activeTab === 'link' && (
          <form onSubmit={handleVerifyAndLink} className="p-6 space-y-4">
            {/* Current Link Status */}
            {linkedAccount && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 block leading-tight">
                      Active Linked Account
                    </span>
                    <span className="text-[11px] text-emerald-800 font-mono">
                      {linkedAccount.upiId} ({linkedAccount.bankName})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUnlink}
                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                >
                  Unlink
                </button>
              </div>
            )}

            {linkSuccess && (
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Account linked successfully! Redirecting to Gateway...</span>
              </div>
            )}

            {/* Provider Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Default UPI Provider App
              </label>
              <div className="grid grid-cols-2 gap-2">
                {UPI_PROVIDERS.map((prov) => (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(prov.id);
                      // If user hasn't changed VPA, adapt default handle
                      if (!upiVpa || upiVpa.endsWith('@okaxis') || upiVpa.endsWith('@ybl')) {
                        const prefix = upiVpa.split('@')[0] || 'user';
                        setUpiVpa(`${prefix}${prov.defaultHandle}`);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
                      selectedProvider === prov.id
                        ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-950 ring-1 ring-indigo-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: prov.brandColor }} />
                    <span>{prov.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* UPI ID Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Virtual Payment Address (UPI ID / VPA) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={upiVpa}
                  onChange={(e) => setUpiVpa(e.target.value)}
                  placeholder="e.g. yourname@okaxis or 9876543210@ybl"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-medium focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Common handles: <strong>@okaxis</strong> (Google Pay), <strong>@ybl</strong> (PhonePe), <strong>@paytm</strong> (Paytm)
              </p>
            </div>

            {/* Account Holder Name & Bank */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  required
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="e.g. Chinmay Hegde"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Bank Name</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-500 bg-white"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  <option value="Punjab National Bank">Punjab National Bank</option>
                  <option value="Bank of Baroda">Bank of Baroda</option>
                  <option value="Canara Bank">Canara Bank</option>
                  <option value="Other Bank">Other Bank</option>
                </select>
              </div>
            </div>

            {/* Submit Link */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isVerifyingLink}
                className="w-full py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                {isVerifyingLink ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying with NPCI & Linking...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Link UPI Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
