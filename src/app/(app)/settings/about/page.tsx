"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function AboutPage() {
  const t = useTranslations("about");

  const aboutContent = `# ${t("title")}

## ${t("developerInfo")}

${t("description")}

### ${t("version")}
- ${t("currentVersion")}
- ${t("builtWith")}

### ${t("contact")}
- ${t("github")}
- ${t("personalBlog")}
- ${t("email")}
- ${t("supportNote")}

---

## ${t("letterToUsers")}

${t("dearUser")}

${t("thankYou")}

### ${t("philosophy")}

We believe that:
- ${t("privacyParamount")}
- ${t("selfReflection")}
- ${t("simplicity")}

### ${t("whatWeBuilt")}

Encounter includes:
- ${t("partnerManagement")}
- ${t("encounterLogging")}
- ${t("analytics")}
- ${t("privacyControls")}
- ${t("secureStorage")}

### ${t("yourData")}

${t("privacyProtection")}
${t("encryption")}
${t("pinLock")}
${t("locationTracking")}
${t("dataExport")}
${t("dataDeletion")}

### ${t("continuousImprovement")}

${t("earlyVersion")}

### ${t("thankYouSection")}

${t("thankYouMessage")}

${t("withGratitude")}
${t("team")}

---

*${t("lastUpdated")}*
`;
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="relative mx-auto max-w-3xl px-4 py-8 md:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(168,85,247,0.16),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(244,63,94,0.16),transparent_30%)]" />

        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-rose-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-[14px]">{t("backToSettings")}</span>
        </Link>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8">
          <h1 className="mb-6 text-[28px] font-light tracking-[0.01em] text-slate-100">{t("title")}</h1>

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
