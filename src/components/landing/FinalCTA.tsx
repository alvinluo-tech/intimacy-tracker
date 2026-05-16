'use client';

import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function FinalCTA() {
  const t = useTranslations('landing');

  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-violet-600 dark:from-rose-600 dark:to-violet-700" />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />

          {/* Content */}
          <div className="relative px-8 py-16 md:px-16 md:py-20 text-center">
            <h2 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-white mb-4">
              {t('ctaHeading')}
              <span className="text-white/80"> {t('ctaHeadingHighlight')}</span>
              {t('ctaHeadingSuffix')}
            </h2>
            <p className="text-white/70 text-[15px] md:text-[16px] max-w-lg mx-auto mb-8">
              {t('ctaSubtitle')}
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 h-12 px-8 bg-white text-gray-900 rounded-full text-[15px] font-semibold hover:bg-white/90 transition-colors shadow-lg shadow-black/20"
            >
              {t('ctaButton')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-white/50 text-[12px] mt-4">
              {t('ctaNote')}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
