'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { tokens } from '@/lib/tokens'

type SelectOptionProps = {
  label: string
  subtext?: string
  selected: boolean
  onSelect: () => void
  multi?: boolean
}

export function SelectOption({ label, subtext, selected, onSelect, multi = false }: SelectOptionProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className="w-full text-left px-4 py-4 flex items-center justify-between gap-3"
      whileTap={{ scale: 0.995 }}
    >
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: tokens.typography.scale.base, fontWeight: 500, color: tokens.colors.foreground }}>
          {label}
        </div>
        {subtext && (
          <div style={{ fontSize: tokens.typography.scale.sm, color: tokens.colors.foregroundMuted, marginTop: 4 }}>
            {subtext}
          </div>
        )}
      </div>
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: selected ? 'none' : `2px solid ${tokens.colors.border}`,
          backgroundColor: selected ? tokens.colors.foreground : 'transparent',
          transition: 'background-color 0.15s ease, border 0.15s ease',
        }}
      >
        {selected && multi && <Check size={14} color="white" strokeWidth={2.5} />}
        {selected && !multi && (
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'white' }} />
        )}
      </div>
    </motion.button>
  )
}
