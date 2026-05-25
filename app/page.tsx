'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { tokens } from '@/lib/tokens'

const FOREST_GREEN = '#1B2D1B'

function IllustrationBotanical() {
  return (
    <svg viewBox="0 0 220 300" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M110 285 C110 230 96 195 76 162 C56 129 34 106 18 68" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <path d="M110 285 C110 220 126 180 148 148 C170 116 198 94 214 52" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <path d="M76 162 C50 148 32 130 38 112 C44 94 74 106 76 162" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.45" />
      <path d="M56 130 C32 118 18 98 26 82 C34 66 62 80 56 130" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.35" />
      <path d="M148 148 C174 136 192 116 184 96 C176 76 150 90 148 148" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.45" />
      <path d="M168 112 C192 102 208 82 198 64 C188 46 164 62 168 112" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.35" />
      <circle cx="18" cy="66" r="4" stroke="white" strokeWidth="1.2" opacity="0.4" />
      <circle cx="214" cy="50" r="4" stroke="white" strokeWidth="1.2" opacity="0.4" />
      <path d="M76 162 C60 148 42 132 38 112" stroke="white" strokeWidth="0.75" strokeLinecap="round" opacity="0.2" />
      <path d="M148 148 C166 134 184 114 184 96" stroke="white" strokeWidth="0.75" strokeLinecap="round" opacity="0.2" />
    </svg>
  )
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1], delay }}
    >
      {children}
    </motion.div>
  )
}

const WHAT_YOU_GET = [
  {
    bg: tokens.colors.surfaceSage,
    label: 'Weekly Schedule',
    body: 'A 7-day plan with the right mix of strength, cardio, and recovery — timed to support your hormones, not fight them.',
  },
  {
    bg: '#DAE4EE',
    label: 'Strength Sessions',
    body: 'Full exercise breakdowns for each strength day, including what to lift, how many sets, and why each movement matters.',
  },
  {
    bg: tokens.colors.surface,
    label: 'Protein Targets',
    body: 'Your daily protein goal and the best sources to hit it — calibrated to your weight and stage.',
  },
  {
    bg: tokens.colors.surfaceBlush,
    label: 'Sleep Protocol',
    body: 'Evidence-based guidelines for improving sleep quality, including timing, temperature, and what to avoid after 3pm.',
  },
]

const HOW_IT_WORKS = [
  {
    num: '01',
    title: 'Answer 16 questions',
    body: 'Tell us where you are in your journey, what your symptoms are like, how you sleep, how you handle stress, and what equipment you have.',
  },
  {
    num: '02',
    title: 'We build your plan',
    body: 'Our system weighs your cortisol load, hormonal stage, and goals against the research to build a protocol that actually fits your life.',
  },
  {
    num: '03',
    title: 'You get everything',
    body: 'Your full weekly schedule, strength guide, protein targets, and sleep protocol — all in one place, based on your answers.',
  },
]

const WHO_ITS_FOR = [
  {
    title: 'Perimenopause',
    body: 'Your cycles are shifting and your body is responding differently to exercise. High intensity all the time is no longer the answer — this plan works with your changing hormones, not against them.',
  },
  {
    title: 'Postmenopause',
    body: 'Estrogen has dropped and the rules have changed. Muscle mass, bone density, and metabolic health all need deliberate attention now. This plan prioritizes what matters most at this stage.',
  },
]

const RESEARCHERS = [
  {
    name: 'Dr. Stacy Sims',
    role: 'Exercise physiologist & nutrition scientist',
    detail: 'Author of ROAR and Next Level. Pioneer in sex-specific exercise research showing why women — especially in perimenopause — need to train differently than men.',
  },
  {
    name: 'Dr. Mary Claire Haver',
    role: 'OB-GYN & menopause specialist',
    detail: 'Author of The New Menopause. Known for translating the science of hormonal health into practical guidance on nutrition and movement for midlife women.',
  },
  {
    name: 'Dr. Vonda Wright',
    role: 'Orthopedic surgeon & sports medicine physician',
    detail: 'Research focuses on musculoskeletal aging and the critical role of resistance training for women over 40 in preserving bone density and physical function.',
  },
  {
    name: 'Dr. Gabrielle Lyon',
    role: 'Physician & muscle-health researcher',
    detail: 'Pioneer of muscle-centric medicine. Her work on skeletal muscle as a longevity organ — and on leucine thresholds for protein synthesis — directly informs how this plan approaches nutrition and progressive overload.',
  },
  {
    name: 'Dr. Jen Gunter',
    role: 'OB-GYN & author',
    detail: 'Author of The Menopause Manifesto. One of the most prominent voices correcting the science around HRT safety and cutting through the misinformation that has left millions of women undertreated.',
  },
  {
    name: 'Dr. Lisa Mosconi',
    role: 'Neuroscientist, Weill Cornell Medicine',
    detail: 'Directs the Alzheimer\'s Prevention Program at Weill Cornell. Her research on the brain-hormone connection shows that exercise in midlife is one of the most powerful tools for protecting long-term cognitive function.',
  },
]

export default function Home() {
  const router = useRouter()

  return (
    <div style={{ backgroundColor: tokens.colors.background }}>

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: FOREST_GREEN, minHeight: '100vh', display: 'flex', alignItems: 'flex-end', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{ position: 'absolute', right: 0, bottom: 0, width: 260, opacity: 0.55, pointerEvents: 'none' }}
          className="landing-botanical"
        >
          <IllustrationBotanical />
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(80px, 10vh, 140px) 32px 80px', width: '100%' }}>
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.32, 0.72, 0, 1] }}
          >
            <p style={{ fontSize: tokens.typography.scale.xs, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 28 }}>
              Menopause Movement
            </p>
            <h1 style={{ fontSize: 'clamp(38px, 5.5vw, 76px)', color: 'white', lineHeight: 1.05, letterSpacing: '-0.025em', maxWidth: 680, marginBottom: 24 }}>
              Exercise that works with your hormones.
            </h1>
            <p style={{ fontSize: tokens.typography.scale.lg, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, maxWidth: 460, marginBottom: 44 }}>
              Answer 16 questions. Get a complete weekly workout plan built for your stage, your body, and your life — based on the latest exercise science for women in menopause.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <motion.button
                type="button"
                onClick={() => router.push('/quiz')}
                style={{
                  backgroundColor: 'white',
                  color: FOREST_GREEN,
                  borderRadius: tokens.radius.pill,
                  fontSize: tokens.typography.scale.base,
                  fontWeight: 600,
                  padding: '14px 28px',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                whileTap={{ scale: 0.98 }}
              >
                Take the quiz — it takes 5 minutes
              </motion.button>
              <span className="hero-cta-tagline" style={{ fontSize: tokens.typography.scale.sm, color: 'rgba(255,255,255,0.4)' }}>
                Free · No signup required
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── WHAT YOU GET ──────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
          <FadeIn>
            <p style={{ fontSize: tokens.typography.scale.xs, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: tokens.colors.foregroundMuted, marginBottom: 16 }}>
              Your plan includes
            </p>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', color: tokens.colors.foreground, lineHeight: 1.15, letterSpacing: '-0.025em', marginBottom: 48 }}>
              A complete protocol, not just a workout.
            </h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {WHAT_YOU_GET.map((card, i) => (
              <FadeIn key={card.label} delay={i * 0.07}>
                <div style={{ backgroundColor: card.bg, borderRadius: tokens.radius.card, padding: '28px 24px 32px', height: '100%', boxSizing: 'border-box' }}>
                  <p style={{ fontSize: tokens.typography.scale.xs, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: tokens.colors.foregroundMuted, marginBottom: 12 }}>
                    {card.label}
                  </p>
                  <p style={{ fontSize: tokens.typography.scale.base, color: tokens.colors.foreground, lineHeight: 1.65 }}>
                    {card.body}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: tokens.colors.background }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
          <FadeIn>
            <p style={{ fontSize: tokens.typography.scale.xs, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: tokens.colors.foregroundMuted, marginBottom: 16 }}>
              How it works
            </p>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', color: tokens.colors.foreground, lineHeight: 1.15, letterSpacing: '-0.025em', marginBottom: 56 }}>
              Three steps to a plan that actually fits.
            </h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40 }}>
            {HOW_IT_WORKS.map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.1}>
                <div>
                  <p style={{ fontSize: 'clamp(52px, 5vw, 68px)', color: tokens.colors.border, lineHeight: 1, marginBottom: 20, fontFamily: 'var(--font-serif)', letterSpacing: '-0.04em' }}>
                    {step.num}
                  </p>
                  <h3 style={{ color: tokens.colors.foreground, marginBottom: 12 }}>{step.title}</h3>
                  <p style={{ fontSize: tokens.typography.scale.base, color: tokens.colors.foregroundMuted, lineHeight: 1.65 }}>{step.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ──────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: tokens.colors.surfaceSage }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
          <FadeIn>
            <p style={{ fontSize: tokens.typography.scale.xs, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: tokens.colors.foregroundMuted, marginBottom: 16 }}>
              Built for
            </p>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', color: tokens.colors.foreground, lineHeight: 1.15, letterSpacing: '-0.025em', marginBottom: 48, maxWidth: 560 }}>
              Women who are done being told to just work harder.
            </h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {WHO_ITS_FOR.map((card, i) => (
              <FadeIn key={card.title} delay={i * 0.1}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: tokens.radius.card, padding: '32px 28px' }}>
                  <h3 style={{ color: tokens.colors.foreground, marginBottom: 14 }}>{card.title}</h3>
                  <p style={{ fontSize: tokens.typography.scale.base, color: tokens.colors.foreground, lineHeight: 1.65 }}>{card.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE SCIENCE ───────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
          <FadeIn>
            <p style={{ fontSize: tokens.typography.scale.xs, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: tokens.colors.foregroundMuted, marginBottom: 16 }}>
              The research
            </p>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', color: tokens.colors.foreground, lineHeight: 1.15, letterSpacing: '-0.025em', marginBottom: 56 }}>
              Built on the work of leading researchers.
            </h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {RESEARCHERS.map((person, i) => (
              <FadeIn key={person.name} delay={i * 0.08}>
                <div style={{ borderTop: `2px solid ${tokens.colors.border}`, paddingTop: 24 }}>
                  <h4 style={{ color: tokens.colors.foreground, marginBottom: 6 }}>{person.name}</h4>
                  <p style={{ fontSize: tokens.typography.scale.sm, color: tokens.colors.foregroundMuted, marginBottom: 14, fontWeight: 500 }}>{person.role}</p>
                  <p style={{ fontSize: tokens.typography.scale.base, color: tokens.colors.foreground, lineHeight: 1.65 }}>{person.detail}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ────────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: FOREST_GREEN }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 32px', textAlign: 'center' }}>
          <FadeIn>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 52px)', color: 'white', lineHeight: 1.1, letterSpacing: '-0.025em', maxWidth: 520, margin: '0 auto 20px' }}>
              Ready to find out what your body actually needs?
            </h2>
            <p style={{ fontSize: tokens.typography.scale.lg, color: 'rgba(255,255,255,0.5)', marginBottom: 40 }}>
              Free. Takes 5 minutes. No signup required.
            </p>
            <motion.button
              type="button"
              onClick={() => router.push('/quiz')}
              style={{
                backgroundColor: 'white',
                color: FOREST_GREEN,
                borderRadius: tokens.radius.pill,
                fontSize: tokens.typography.scale.base,
                fontWeight: 600,
                padding: '14px 32px',
                border: 'none',
                cursor: 'pointer',
              }}
              whileTap={{ scale: 0.98 }}
            >
              Take the quiz
            </motion.button>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#f5f3ef', borderTop: '1px solid #d9d5ce', padding: '28px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#6b6b6b' }}>
          © {new Date().getFullYear()} Menopause Movement · For informational purposes only. Not medical advice.{' '}
          <a href="/privacy" style={{ color: '#6b6b6b', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            Privacy Policy
          </a>
        </p>
      </footer>

    </div>
  )
}
