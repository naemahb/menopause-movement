'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { tokens } from '@/lib/tokens'

export default function Home() {
  const router = useRouter()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: tokens.colors.background }}
    >
      <div className="w-full max-w-[480px] text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <p
            className="mb-4"
            style={{
              fontSize: tokens.typography.scale.sm,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: tokens.colors.foregroundMuted,
            }}
          >
            Menopause Movement
          </p>

          <h1
            className="mb-4 text-balance"
            style={{
              fontSize: tokens.typography.scale['3xl'],
              fontWeight: 700,
              color: tokens.colors.foreground,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            Exercise that works with your hormones.
          </h1>

          <p
            className="mb-10"
            style={{
              fontSize: tokens.typography.scale.lg,
              color: tokens.colors.foregroundMuted,
              lineHeight: 1.6,
            }}
          >
            Answer 10 questions. Get a personalized weekly workout plan built for your stage, your body, and your life.
          </p>

          <motion.button
            type="button"
            onClick={() => router.push('/quiz')}
            className="px-8 py-4 font-medium"
            style={{
              backgroundColor: tokens.colors.accent,
              color: tokens.colors.accentForeground,
              borderRadius: tokens.radius.pill,
              fontSize: tokens.typography.scale.base,
            }}
            whileTap={{ scale: 0.98 }}
          >
            Take the quiz — it takes 4 minutes
          </motion.button>

          <p
            className="mt-6"
            style={{
              fontSize: tokens.typography.scale.xs,
              color: tokens.colors.foregroundMuted,
            }}
          >
            Based on research by Dr. Stacy Sims, Dr. Mary Claire Haver & Dr. Vonda Wright
          </p>
        </motion.div>
      </div>
    </div>
  )
}
