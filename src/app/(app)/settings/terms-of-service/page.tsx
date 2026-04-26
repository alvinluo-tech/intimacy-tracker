import Link from "next/link";
import { ArrowLeft, FileText, ShieldAlert, Lock, AlertTriangle } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-[100svh] bg-[#020617]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft size={16} />
          Back to Settings
        </Link>

        <div className="space-y-8">
          <div>
            <h1 className="text-[32px] font-light text-slate-100">Terms of Service</h1>
            <p className="mt-2 text-[14px] text-slate-500">Last Updated: April 2026</p>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                  <FileText size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">1. Acceptance of Terms</h2>
              </div>
              <div className="text-[15px] text-slate-300 leading-relaxed">
                <p className="text-slate-400">By using Encounter, you agree to these terms. This app is designed for personal, private use between consenting individuals.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                  <ShieldAlert size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">2. Eligibility</h2>
              </div>
              <div className="text-[15px] text-slate-300 leading-relaxed">
                <p className="text-slate-400">You must be at least 18 years old to use this service due to the sensitive and intimate nature of the content recorded.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                  <Lock size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">3. User Responsibility</h2>
              </div>
              <div className="text-[15px] text-slate-300 leading-relaxed">
                <p className="text-slate-400">You are solely responsible for the content you log. Encounter is a "passive tool"; we do not monitor or verify the accuracy of your records. You are responsible for keeping your device and PIN/Password secure.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                  <FileText size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">4. Data Ownership</h2>
              </div>
              <div className="text-[15px] text-slate-300 leading-relaxed">
                <p className="text-slate-400">You own 100% of your data. You may export or delete your records at any time. If you delete your account, all cloud-synced data will be purged from our Supabase instance.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                  <AlertTriangle size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">5. Disclaimer of Liability</h2>
              </div>
              <div className="text-[15px] text-slate-300 leading-relaxed">
                <p className="text-slate-400">Encounter is provided "as is". We are not liable for any emotional distress, relationship outcomes, or data loss resulting from the use of the application.</p>
              </div>
            </section>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
            <p className="text-[13px] text-slate-500">
              Questions about these terms? Contact us at{" "}
              <a href="mailto:support@encounter.app" className="text-rose-400 hover:text-rose-300">
                support@encounter.app
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
