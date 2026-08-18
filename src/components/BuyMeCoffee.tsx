'use client';

import React, { useState, useEffect } from 'react';
import { Coffee, Heart, X, Sparkles, ShieldCheck, IndianRupee, Loader2, Info } from 'lucide-react';
import { useToast } from '@/components/Toast';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface BuyMeCoffeeProps {
  /** Floating button position */
  position?: 'bottom-right' | 'bottom-left';
}

const PRESET_AMOUNTS = [10, 30, 50, 100];

export default function BuyMeCoffee({ position = 'bottom-right' }: BuyMeCoffeeProps) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Dynamically load Razorpay checkout script safely
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => {
        console.error('Failed to load Razorpay Checkout SDK');
      };
      document.body.appendChild(script);
    } else if (window.Razorpay) {
      setScriptLoaded(true);
    }
  }, []);

  const activeAmount = isCustom ? Number(customAmount) || 0 : amount;

  const handleSelectPreset = (val: number) => {
    setIsCustom(false);
    setAmount(val);
    setCustomAmount('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCustom(true);
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(val);
  };

  const handlePay = async () => {
    if (activeAmount < 1) {
      showToast('Please enter an amount of at least ₹1.', 'error');
      return;
    }

    if (!window.Razorpay) {
      showToast('Payment system is initializing. Please try again in a moment.', 'info');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create Order on Backend (Amount in Paise)
      const amountInPaise = Math.round(activeAmount * 100);
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          notes: {
            donor_name: name.trim() || 'Anonymous Student',
            donor_message: message.trim() || 'Keep up the good work!',
          },
        }),
      });

      const orderData = await res.json();

      if (!res.ok || !orderData.order_id) {
        throw new Error(orderData.error || 'Failed to create payment order.');
      }

      // Step 2: Open Razorpay Standard Checkout Modal
      const razorpayKey =
        orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'BioArchive',
        description: 'Buy Us a Coffee/Chai',
        image: '/favicon-32x32.png',
        order_id: orderData.order_id,
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            // Step 3: Verify Payment Signature on Backend
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              setIsOpen(false);
              showToast(
                '🎉 Thank you for supporting us! Your contribution means a lot.',
                'success'
              );
            } else {
              showToast(
                verifyData.error || 'Payment verification failed. Please contact support.',
                'error'
              );
            }
          } catch (verifyErr) {
            console.error('Verification error:', verifyErr);
            showToast('Payment received but verification check failed. Please reach out to us.', 'error');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: name.trim() || 'Supporter',
          contact: '9999999999', // Prefills contact to bypass mandatory phone prompt
          email: 'support@bioarchive.org',
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Instant UPI (Scan & Pay)',
                instruments: [
                  {
                    method: 'upi',
                  },
                ],
              },
              other: {
                name: 'Cards & Other Methods',
                instruments: [
                  {
                    method: 'card',
                  },
                  {
                    method: 'netbanking',
                  },
                ],
              },
            },
            sequence: ['block.upi', 'block.other'],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        theme: {
          color: '#0ea5e9', // Matches BioArchive ocean cyan
        },
        modal: {
          confirm_close: false,
          ondismiss: function () {
            setLoading(false);
            showToast('Payment cancelled.', 'info');
          },
        },
      };


      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        showToast(
          response.error?.description || 'Payment could not be completed. Please try again.',
          'error'
        );
        setLoading(false);
      });

      rzp.open();
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      showToast(err.message || 'Unable to start payment. Please try again.', 'error');
      setLoading(false);
    }
  };

  const positionClasses =
    position === 'bottom-right'
      ? 'bottom-6 right-6'
      : 'bottom-6 left-6';

  return (
    <>
      {/* Floating Action Button */}
      <div
        className={`fixed ${positionClasses} z-40 flex items-center group`}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Hover Tooltip */}
        <div className="hidden sm:flex items-center gap-1.5 mr-3 px-3 py-1.5 rounded-full text-xs font-medium bg-[#07122a]/95 text-amber-200 border border-amber-500/25 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] pointer-events-none transform translate-x-2 group-hover:translate-x-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Support BioArchive</span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Support BioArchive with a Coffee/Chai"
          className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 via-[#07122a] to-amber-900/30 border border-amber-500/35 text-amber-400 shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:scale-110 hover:border-amber-400 hover:text-amber-300 transition-all duration-300 backdrop-blur-xl group-hover:shadow-[0_0_25px_rgba(245,158,11,0.35)]"
        >
          {/* Subtle Ambient Pulse Ring */}
          <span className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping opacity-25 pointer-events-none" />

          <Coffee className="w-5 h-5 transform group-hover:rotate-12 transition-transform duration-300" />
        </button>
      </div>

      {/* Donation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div
            className="relative w-full max-w-md bg-[#07122a]/95 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl text-slate-100 font-sans"
            style={{
              boxShadow:
                '0 20px 50px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 30px rgba(14, 165, 233, 0.1)',
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => !loading && setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Buy Us a Coffee/Chai!
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                </h3>
                <p className="text-xs text-slate-400">
                  Help keep BioArchive free for everyone.
                </p>
              </div>
            </div>

            {/* Amount Selection */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Select Amount (INR)
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2.5">
                {PRESET_AMOUNTS.map((val) => {
                  const isSelected = !isCustom && amount === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectPreset(val)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-0.5 ${isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                        : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>{val}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Amount Input */}
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                  ₹
                </span>
                <input
                  type="text"
                  placeholder="Or enter custom amount (e.g. 150)"
                  value={customAmount}
                  onChange={handleCustomChange}
                  className={`w-full pl-8 pr-4 py-2 text-sm bg-slate-900/70 border rounded-xl placeholder-slate-500 text-white focus:outline-none transition-all ${isCustom
                    ? 'border-amber-400 ring-1 ring-amber-400/30'
                    : 'border-slate-800 focus:border-slate-600'
                    }`}
                />
              </div>
            </div>

            {/* Optional Donor Info */}
            <div className="space-y-2.5 mb-5">
              <div>
                <input
                  type="text"
                  placeholder="Your Name (Optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-900/60 border border-slate-800 rounded-xl placeholder-slate-500 text-white focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Leave a short note or message (Optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-900/60 border border-slate-800 rounded-xl placeholder-slate-500 text-white focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Privacy & Mobile Number Notice */}
            <div className="mb-4 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-start gap-2 text-[11px] text-sky-200/90 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-sky-300">Razorpay will ask for mobile number.</strong> Razorpay requires a 10-digit number solely to send the official bank SMS receipt and generate the UPI QR. BioArchive never stores or spams your contact.
              </span>
            </div>

            {/* Pay Button with Razorpay Trigger */}
            <button
              type="button"
              disabled={loading || activeAmount < 1}
              onClick={handlePay}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm shadow-[0_4px_20px_rgba(245,158,11,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <IndianRupee className="w-4 h-4" />
                  <span>Pay {activeAmount || 0} via UPI / Cards</span>
                </>
              )}
            </button>

            {/* Security Badge */}
            <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Secured by Razorpay · 100% UPI, Cards & NetBanking</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
