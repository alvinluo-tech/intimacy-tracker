'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function FAQ() {
  const t = useTranslations('landing');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ5'), a: t('faqA5') },
    { q: t('faqQ6'), a: t('faqA6') },
  ];

  return (
    <section id="faq" className="py-24 md:py-32 px-6 bg-gray-50/50 dark:bg-white/[0.01]">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <p className="text-[13px] font-medium text-rose-500 dark:text-rose-400 tracking-wide mb-3">
            {t('faqKicker')}
          </p>
          <h2 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-gray-900 dark:text-[#f8fafc] mb-4">
            {t('faqHeading')}{' '}
            <span className="text-rose-500 dark:text-rose-400">{t('faqHeadingHighlight')}</span>
          </h2>
          <p className="text-gray-500 dark:text-[#94a3b8] max-w-xl mx-auto">
            {t('faqSubtitle')}
          </p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className={cn(
                  'w-full text-left rounded-xl border transition-colors',
                  openIndex === index
                    ? 'bg-white dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.1]'
                    : 'bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.1]'
                )}
              >
                <div className="flex items-center justify-between p-5">
                  <span className="text-[15px] font-medium text-gray-900 dark:text-[#f8fafc] pr-4">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-gray-400 dark:text-[#64748b] shrink-0 transition-transform duration-200',
                      openIndex === index && 'rotate-180'
                    )}
                  />
                </div>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-[14px] text-gray-500 dark:text-[#94a3b8] leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
