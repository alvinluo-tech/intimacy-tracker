'use client';

import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Alex & Sarah',
    role: 'Together 3 years',
    avatar: 'A',
    color: 'bg-rose-500',
    rating: 5,
    text: 'Finally an app that respects our privacy. The map feature is beautiful — we can see all our adventures together without worrying about who else can see them.',
  },
  {
    name: 'Marcus',
    role: 'Using since beta',
    avatar: 'M',
    color: 'bg-violet-500',
    rating: 5,
    text: 'The analytics are surprisingly insightful. Being able to see patterns over time has actually helped us communicate better about our relationship.',
  },
  {
    name: 'J & L',
    role: 'Long distance couple',
    avatar: 'J',
    color: 'bg-emerald-500',
    rating: 5,
    text: 'The partner sync feature is a game changer for long distance. We can share moments together even when we are apart. And the PIN lock gives us peace of mind.',
  },
  {
    name: 'Chen Wei',
    role: 'Early adopter',
    avatar: 'C',
    color: 'bg-sky-500',
    rating: 5,
    text: 'Clean design, works offline, and the developer is super responsive. This is how privacy-first apps should be built. Love the PWA approach.',
  },
  {
    name: 'Sophie',
    role: 'Beta tester',
    avatar: 'S',
    color: 'bg-amber-500',
    rating: 5,
    text: 'I tried several apps before this one. Encounter is the only one that feels both beautiful and trustworthy. The mood tracking feature is a lovely touch.',
  },
  {
    name: 'R & K',
    role: 'Together 1 year',
    avatar: 'R',
    color: 'bg-pink-500',
    rating: 5,
    text: 'The timeline view is gorgeous. Looking back at our memories together on the map is so special. Great job on making something so personal feel so premium.',
  },
];

export function Testimonials() {
  const t = useTranslations('landing');

  return (
    <section className="py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <p className="text-[13px] font-medium text-rose-500 dark:text-rose-400 tracking-wide mb-3">
            {t('testimonialsKicker')}
          </p>
          <h2 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-gray-900 dark:text-[#f8fafc] mb-4">
            {t('testimonialsHeading')}{' '}
            <span className="text-rose-500 dark:text-rose-400">{t('testimonialsHeadingHighlight')}</span>
          </h2>
          <p className="text-gray-500 dark:text-[#94a3b8] max-w-xl mx-auto">
            {t('testimonialsSubtitle')}
          </p>
        </motion.div>
      </div>

      {/* Horizontal scroll container */}
      <div className="relative">
        {/* Gradient fades */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-white dark:from-[#020617] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-white dark:from-[#020617] to-transparent z-10 pointer-events-none" />

        <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide px-6 md:px-12 pb-4 snap-x snap-mandatory">
          {testimonials.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex-shrink-0 w-[300px] md:w-[340px] snap-start"
            >
              <div className="h-full bg-white dark:bg-white/[0.02] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6 flex flex-col">
                {/* Quote icon */}
                <Quote className="w-8 h-8 text-rose-500/20 dark:text-rose-400/20 mb-4" />

                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: item.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-sm text-gray-600 dark:text-[#94a3b8] leading-relaxed flex-1 mb-6">
                  "{item.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center text-white font-semibold text-sm`}>
                    {item.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-[#f8fafc]">
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-[#64748b]">
                      {item.role}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
