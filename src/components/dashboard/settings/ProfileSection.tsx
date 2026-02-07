import React from "react";
import { User as UserIcon, Mail } from "lucide-react";

interface ProfileSectionProps {
  name: string;
  email: string;
}

export function ProfileSection({ name, email }: ProfileSectionProps) {
  return (
    <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-via/10 flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-brand-via" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Personal Profile</h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Your account information</p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="user-name" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" aria-hidden="true" />
              <input 
                id="user-name"
                type="text"
                value={name}
                readOnly
                className="w-full h-12 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-xl pl-12 pr-4 text-sm font-bold text-zinc-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="user-email" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" aria-hidden="true" />
              <input 
                id="user-email"
                type="email"
                value={email}
                readOnly
                className="w-full h-12 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-xl pl-12 pr-4 text-sm font-bold text-zinc-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
        <p className="text-[10px] font-bold text-zinc-400 italic">
          * Profile editing is managed via your identity provider.
        </p>
      </div>
    </section>
  );
}
