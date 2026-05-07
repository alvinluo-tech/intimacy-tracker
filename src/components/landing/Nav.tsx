"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#020617]/85 backdrop-blur-xl border-b border-white/[0.05]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo + Beta */}
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center transition-transform group-hover:scale-105">
            <svg
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <span className="font-semibold text-base tracking-tight">Encounter</span>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border border-rose-500/30 bg-rose-500/10 text-rose-400">
            Beta
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Features", href: "#features" },
            { label: "How it Works", href: "#how-it-works" },
            { label: "Pricing", href: "#pricing" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[14px] text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-[14px] text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-rose-500 hover:bg-rose-600 text-white text-[14px] font-medium rounded-lg transition-colors"
          >
            Try Beta Free
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 -mr-2 text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.05] bg-[#020617]/95 backdrop-blur-xl">
          <nav className="px-6 py-4 flex flex-col gap-4">
            {["Features", "How it Works", "Pricing"].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(" ", "-")}`}
                onClick={() => setMobileOpen(false)}
                className="text-[15px] text-[#94a3b8] hover:text-[#f8fafc] transition-colors py-1"
              >
                {label}
              </a>
            ))}
            <hr className="border-white/[0.05]" />
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="text-[15px] text-[#94a3b8] hover:text-[#f8fafc] transition-colors py-1"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-rose-500 hover:bg-rose-600 text-white text-[15px] font-medium rounded-lg transition-colors"
            >
              Try Beta Free
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
