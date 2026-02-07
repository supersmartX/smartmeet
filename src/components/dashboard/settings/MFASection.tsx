import React, { useState } from "react";
import Image from "next/image";
import { 
  ShieldCheck, 
  Smartphone, 
  RefreshCcw, 
  QrCode,
  Eye,
  EyeOff
} from "lucide-react";

interface MFASectionProps {
  mfaEnabled: boolean;
  qrCodeUrl: string;
  mfaSecret: string;
  mfaToken: string;
  setMfaToken: (token: string) => void;
  mfaPassword?: string;
  setMfaPassword?: (password: string) => void;
  isSettingUpMFA: boolean;
  isVerifyingMFA: boolean;
  isDisablingMFA: boolean;
  showDisableConfirm: boolean;
  setShowDisableConfirm: (show: boolean) => void;
  handleSetupMFA: () => void;
  handleVerifyMFA: () => void;
  handleDisableMFA: () => void;
  setQrCodeUrl: (url: string) => void;
  setMfaSecret: (secret: string) => void;
}

export function MFASection({
  mfaEnabled,
  qrCodeUrl,
  mfaSecret,
  mfaToken,
  setMfaToken,
  mfaPassword,
  setMfaPassword,
  isSettingUpMFA,
  isVerifyingMFA,
  isDisablingMFA,
  showDisableConfirm,
  setShowDisableConfirm,
  handleSetupMFA,
  handleVerifyMFA,
  handleDisableMFA,
  setQrCodeUrl,
  setMfaSecret,
}: MFASectionProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);

  const toggleSecret = () => {
    if (!showSecret) {
      setShowRevealConfirm(true);
    } else {
      setShowSecret(false);
    }
  };

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-via/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-brand-via" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Security</h2>
            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">Two-factor authentication & account security</p>
          </div>
        </div>
        {mfaEnabled && (
          <span className="px-4 py-2 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
            MFA Protected
          </span>
        )}
      </div>

      <div className="p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">Multi-Factor Authentication</h3>
            <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-tight leading-relaxed max-w-md">
              Add an extra layer of security to your account by requiring a code from your authenticator app when you log in.
            </p>
          </div>
          
          {!mfaEnabled && !qrCodeUrl && (
            <button
              onClick={handleSetupMFA}
              disabled={isSettingUpMFA}
              aria-label="Setup Two-Factor Authentication"
              className="px-6 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-black/5"
            >
              {isSettingUpMFA ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Smartphone className="w-3 h-3" />}
              Setup 2FA
            </button>
          )}

          {mfaEnabled && !showDisableConfirm && (
            <button
              onClick={() => setShowDisableConfirm(true)}
              aria-label="Disable Two-Factor Authentication"
              className="px-6 py-4 border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Disable 2FA
            </button>
          )}
        </div>

        {/* Disable Confirmation Flow */}
        {mfaEnabled && showDisableConfirm && (
          <div className="mt-8 p-6 bg-red-50/50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 animate-in slide-in-from-top-4 duration-300">
            <div className="max-w-md space-y-6">
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-red-600 dark:text-red-400">Confirm Deactivation</h4>
                <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight leading-relaxed">
                  Enter your 6-digit authenticator code or a recovery code to disable MFA.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="ENTER MFA CODE"
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value.toUpperCase())}
                    className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="password"
                    placeholder="ENTER PASSWORD"
                    value={mfaPassword}
                    onChange={(e) => setMfaPassword?.(e.target.value)}
                    className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleDisableMFA}
                    disabled={isDisablingMFA || !mfaToken}
                    aria-label="Confirm disabling Two-Factor Authentication"
                    className="flex-1 h-12 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDisablingMFA ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                    Confirm Disable
                  </button>
                  <button
                    onClick={() => {
                      setShowDisableConfirm(false)
                      setMfaToken("")
                    }}
                    aria-label="Cancel disabling Two-Factor Authentication"
                    className="px-6 h-12 border border-zinc-200 dark:border-zinc-800 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {qrCodeUrl && !mfaEnabled && (
          <div className="mt-8 p-6 bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="space-y-4 flex-shrink-0">
                <div className="w-48 h-48 bg-white p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-6 relative group overflow-hidden">
                  <div className={`transition-all duration-300 ${showSecret ? 'blur-0' : 'blur-xl grayscale'}`}>
                    <Image 
                      src={qrCodeUrl} 
                      alt="MFA QR Code" 
                      fill
                      sizes="192px" 
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  </div>
                  
                  {!showSecret && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/10 dark:bg-black/20 backdrop-blur-sm transition-all">
                      <button
                        onClick={toggleSecret}
                        className="p-4 bg-white dark:bg-zinc-900 rounded-full shadow-2xl hover:scale-110 transition-transform text-zinc-900 dark:text-white"
                        title="Reveal QR Code"
                      >
                        <Eye size={24} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Backup Code</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 block bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded flex-1">
                      {showSecret ? mfaSecret : "•••• •••• •••• ••••"}
                    </code>
                    <button 
                      onClick={toggleSecret}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500"
                      title={showSecret ? "Hide secret" : "Show secret"}
                    >
                      {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Verify Setup</h4>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight leading-relaxed">
                    Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code below to confirm.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="000 000"
                      value={mfaToken}
                      onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ""))}
                      className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 text-sm font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-brand-via/20"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={handleVerifyMFA}
                      disabled={isVerifyingMFA || mfaToken.length !== 6}
                      aria-label="Verify and Activate Two-Factor Authentication"
                      className="flex-1 h-12 bg-brand-via text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isVerifyingMFA ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                      Verify & Activate
                    </button>
                    <button
                      onClick={() => {
                        setQrCodeUrl("")
                        setMfaSecret("")
                        setMfaToken("")
                      }}
                      aria-label="Cancel Two-Factor Authentication Setup"
                      className="px-6 h-12 border border-zinc-200 dark:border-zinc-800 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reveal Confirmation Modal */}
      {showRevealConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center">
                <Eye className="w-8 h-8 text-amber-500" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Reveal Secret?</h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight leading-relaxed">
                  Make sure nobody is looking at your screen. The QR code and secret key will be visible.
                </p>
              </div>

              <div className="flex flex-col w-full gap-4">
                <button
                  onClick={() => {
                    setShowSecret(true);
                    setShowRevealConfirm(false);
                  }}
                  className="w-full h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
                >
                  Reveal MFA Details
                </button>
                <button
                  onClick={() => setShowRevealConfirm(false)}
                  className="w-full h-14 border border-zinc-200 dark:border-zinc-800 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
