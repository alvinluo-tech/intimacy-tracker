"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const aboutContent = `# About Encounter

## Developer Information

**Encounter** is a personal intimacy tracking application designed to help you understand and reflect on your intimate relationships and experiences.

### Version
- Current Version: 0.1.0
- Built with: Next.js, React, Supabase

### Contact
- GitHub: [alvinluo-tech/intimacy-tracker](https://github.com/alvinluo-tech/intimacy-tracker)
- For support or inquiries, please use the feedback feature in the app.

---

## A Letter to Our Users

Dear Encounter User,

Thank you for choosing Encounter to be part of your personal journey. This application was born from a simple belief: that understanding our intimate experiences can lead to greater self-awareness and healthier relationships.

### Our Philosophy

We believe that:
- **Privacy is paramount**: Your intimate data is yours alone. We've built robust encryption and privacy features to ensure your information stays secure.
- **Self-reflection matters**: Tracking patterns and trends in your intimate life can provide valuable insights into your wellbeing and relationship dynamics.
- **Simplicity is key**: The app is designed to be intuitive and non-intrusive, allowing you to focus on what matters most—your experiences.

### What We've Built

Encounter includes:
- **Partner Management**: Keep track of your partners and their details
- **Encounter Logging**: Record your intimate experiences with rich details
- **Analytics & Insights**: Visualize patterns and trends in your data
- **Privacy Controls**: PIN protection, location privacy settings, and data export options
- **Secure Storage**: All data is encrypted and stored securely

### Your Data, Your Control

We've implemented multiple layers of privacy protection:
- End-to-end encryption for sensitive data
- PIN lock functionality
- Configurable location tracking (off, city-level, or exact)
- Full data export capabilities
- Complete data deletion option

### Continuous Improvement

This is an early version of Encounter, and we're committed to making it better. Your feedback is invaluable in shaping the future of this application. Please don't hesitate to share your thoughts, suggestions, or report any issues through our feedback feature.

### Thank You

Thank you for trusting us with your personal data. We take that responsibility seriously and will continue to work hard to earn and keep that trust.

With gratitude,
The Encounter Team

---

*Last updated: April 2026*
`;

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="relative mx-auto max-w-3xl px-4 py-8 md:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(168,85,247,0.16),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(244,63,94,0.16),transparent_30%)]" />

        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-rose-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-[14px]">Back to Settings</span>
        </Link>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8">
          <h1 className="mb-6 text-[28px] font-light tracking-[0.01em] text-slate-100">About Encounter</h1>

          <div className="prose prose-invert prose-slate max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="mb-4 text-[24px] font-light text-slate-100">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-3 mt-6 text-[20px] font-light text-rose-300">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-4 text-[18px] font-light text-slate-200">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="mb-4 text-[15px] leading-relaxed text-slate-400">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 ml-4 list-disc space-y-2 text-[15px] text-slate-400">{children}</ul>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-medium text-slate-200">{children}</strong>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    className="text-rose-400 transition-colors hover:text-rose-300 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                hr: () => (
                  <hr className="my-6 border-slate-800" />
                ),
                em: ({ children }) => (
                  <em className="text-slate-300">{children}</em>
                ),
              }}
            >
              {aboutContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
