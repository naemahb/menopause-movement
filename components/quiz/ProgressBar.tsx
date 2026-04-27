'use client'

import { motion } from 'framer-motion'
import { tokens } from '@/lib/tokens'

type ProgressBarProps = {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const progress = Math.min((current / total) * 100, 100)

  return (
    <div className="h-1 w-full overflow-hidden" style={{ backgroundColor: tokens.colors.border }}>
      <motion.div
        className="h-full"
        style={{ backgroundColor: tokens.colors.foreground }}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  )
}
