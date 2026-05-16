'use client';

import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Alex & Sarah',
    role: 'Together 3 years',
    avatar: 'A',
    color: 'from-rose-500 to-pink-600',
    rating: 5,
    text: 'Finally an app that respects our privacy. The map feature is beautiful — we can see all our adventures together without worrying about who else can see them.',
  },
  {
    name: 'Marcus',
    role: 'Using since beta',
    avatar: 'M',
    color: 'from-violet-500 to-purple-600',
    rating: 5,
    text: 'The analytics are surprisingly insightful. Being able to see patterns over time has actually helped us communicate better about our relationship.',
  },
  {
    name: 'J & L',
    role: 'Long distance couple',
    avatar: 'J',
    color: 'from-emerald-500 to-teal-600',
    rating: 5,
    text: 'The partner sync feature is a game changer for long distance. We can share moments together even when we are apart. And the PIN lock gives us peace of mind.',
  },
  {
    name: 'Chen Wei',
    role: 'Early adopter',
    avatar: 'C',
    color: 'from-sky-500 to-blue-600',
    rating: 5,
    text: 'Clean design, works offline, and the developer is super responsive. This is how privacy-first apps should be built. Love the PWA approach.',
  },
  {
    name: 'Sophie',
    role: 'Beta tester',
    avatar: 'S',
    color: 'from-amber-500 to-orange-600',
    rating: 5,
    text: 'I tried several apps before this one. Encounter is the only one that feels both beautiful and trustworthy. The mood tracking feature is a lovely touch.',
  },
  {
    name: 'R & K',
    role: 'Together 1 year',
    avatar: 'R',
    color: 'from-pink-500 to-rose-600',
    rating: 5,
    text: 'The timeline view is gorgeous. Looking back at our memories together on the map is so special. Great job on making something so personal feel so premium.',
  },
];

// Double the array for seamless infinite scroll
const doubledTestimonials = [...testimonials, ...testimonials, ...testimonials];

export function Testimonials() {
  const t = useTranslations('landing');

  return (
    <section className="py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-16">
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

      {/* 3D Carousel Container */}
      <div className="relative" style={{ perspective: '1200px' }}>
        {/* Gradient fades */}
        <div className="absolute left-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-r from-white dark:from-[#020617] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-l from-white dark:from-[#020617] to-transparent z-10 pointer-events-none" />

        {/* Auto-scrolling track */}
        <div className="flex gap-5 animate-scroll hover:pause-animation">
          {doubledTestimonials.map((item, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[300px] md:w-[340px] group"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="relative h-full rounded-2xl overflow-hidden transition-all duration-500 group-hover:scale-[1.02] group-hover:-translate-y-2"
                style={{
                  transform: 'rotateY(2deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Glass background */}
                <div className="absolute inset-0 bg-white/80 dark:bg-white/[0.05] backdrop-blur-xl" />
                <div className="absolute inset-0 border border-gray-200/60 dark:border-white/[0.08] rounded-2xl" />
                
                {/* Glow effect on hover */}
                <div className="absolute -inset-1 bg-gradient-to-br from-rose-500/0 to-violet-500/0 group-hover:from-rose-500/10 group-hover:to-violet-500/10 rounded-2xl blur-xl transition-all duration-500" />

                {/* Content */}
                <div className="relative p-6 flex flex-col h-full">
                  {/* Decorative gradient orb */}
                  <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${item.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />

                  {/* Quote icon */}
                  <Quote className="w-8 h-8 text-rose-500/15 dark:text-rose-400/15 mb-4" />

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
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-semibold text-sm shadow-lg`}>
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
