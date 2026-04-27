'use client'

import { motion } from 'framer-motion'
import { tokens } from '@/lib/tokens'

type ContinueButtonProps = {
  onClick: () => void
  disabled?: boolean
  label?: string
}

export function ContinueButton({ onClick, disabled, label = 'Continue' }: ContinueButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-6 py-3 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: tokens.colors.accent,
        color: tokens.colors.accentForeground,
        borderRadius: tokens.radius.pill,
      }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      {label}
    </motion.button>
  )
}
