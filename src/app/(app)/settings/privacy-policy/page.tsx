import Link from "next/link";
import { ArrowLeft, Shield, Lock, MapPin, Database } from "lucide-react";

export default function PrivacyPolicyPage() {
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
            <h1 className="text-[32px] font-light text-slate-100">Privacy Policy</h1>
            <p className="mt-2 text-[14px] text-slate-500">Last Updated: April 2026</p>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                  <Database size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">1. Data We Collect</h2>
              </div>
              <div className="space-y-4 text-[15px] text-slate-300 leading-relaxed">
                <div>
                  <h3 className="mb-2 text-[16px] font-medium text-slate-200">Personal Information</h3>
                  <p className="text-slate-400">Account details (email) handled by Supabase Auth.</p>
                </div>
                <div>
                  <h3 className="mb-2 text-[16px] font-medium text-slate-200">Encounter Data</h3>
                  <p className="text-slate-400">Notes, ratings, and mood logs are end-to-end encrypted (AES-256) where possible.</p>
                </div>
                <div>
                  <h3 className="mb-2 text-[16px] font-medium text-slate-200">Location Data</h3>
                  <p className="text-slate-400">We only access location when you explicitly enable "Location Tracking". You can choose "Vague Location" to mask exact coordinates.</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                  <Shield size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">2. How We Use Data</h2>
              </div>
              <div className="space-y-4 text-[15px] text-slate-300 leading-relaxed">
                <p className="text-slate-400">We do NOT sell your data. Data is used exclusively to:</p>
                <ul className="ml-4 list-disc space-y-2 text-slate-400">
                  <li>Provide your personal dashboard and "Year Overview"</li>
                  <li>Sync records across your authorized devices via Supabase</li>
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                  <Lock size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">3. Data Storage & Security</h2>
              </div>
              <div className="space-y-4 text-[15px] text-slate-300 leading-relaxed">
                <p className="text-slate-400">Your data resides in Supabase's secure cloud. Sensitive notes are encrypted before leaving your device. We do not hold the keys to your private reflections.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                  <MapPin size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">4. Third-Party Services</h2>
              </div>
              <div className="space-y-4 text-[15px] text-slate-300 leading-relaxed">
                <p className="text-slate-400">We use Mapbox for footprint visualization. Mapbox receives anonymized coordinates to render your maps but does not link them to your identity.</p>
              </div>
            </section>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
            <p className="text-[13px] text-slate-500">
              Questions about your privacy? Contact us at{" "}
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
