import React from "react";
import Image from "next/image";
import { 
  ShieldCheck, 
  Smartphone, 
  RefreshCcw, 
  QrCode 
} from "lucide-react";

interface MFASectionProps {
  mfaEnabled: boolean;
  qrCodeUrl: string;
  mfaSecret: string;
  mfaToken: string;
  setMfaToken: (token: string) => void;
  isSettingUpMFA: boolean;
  isVerifyingMFA: boolean;
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
  isSettingUpMFA,
  isVerifyingMFA,
  handleSetupMFA,
  handleVerifyMFA,
  handleDisableMFA,
  setQrCodeUrl,
  setMfaSecret,
}: MFASectionProps) {
  return (
    <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-via/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-brand-via" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Security</h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Two-factor authentication & account security</p>
          </div>
        </div>
        {mfaEnabled && (
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
            MFA Protected
          </span>
        )}
      </div>

      <div className="p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">Multi-Factor Authentication</h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight leading-relaxed max-w-md">
              Add an extra layer of security to your account by requiring a code from your authenticator app when you log in.
            </p>
          </div>
          
          {!mfaEnabled && !qrCodeUrl && (
            <button
              onClick={handleSetupMFA}
              disabled={isSettingUpMFA}
              className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-black/5"
            >
              {isSettingUpMFA ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Smartphone className="w-3 h-3" />}
              Setup 2FA
            </button>
          )}

          {mfaEnabled && (
            <button
              onClick={handleDisableMFA}
              className="px-6 py-3 border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Disable 2FA
            </button>
          )}
        </div>

        {qrCodeUrl && !mfaEnabled && (
          <div className="mt-8 p-6 bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="space-y-4 flex-shrink-0">
                <div className="w-48 h-48 bg-white p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-6">
                  <Image 
                    src={qrCodeUrl} 
                    alt="MFA QR Code" 
                    width={192} 
                    height={192} 
                    className="w-full h-full"
                    unoptimized
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Backup Code</p>
                  <code className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 block bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                    {mfaSecret}
                  </code>
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
                  <div className="flex gap-3">
                    <button
                      onClick={handleVerifyMFA}
                      disabled={isVerifyingMFA || mfaToken.length !== 6}
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
    </section>
  );
}
