'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { tokens } from '@/lib/tokens'

// =============================================================================
// Icons
// =============================================================================

function IconFlag() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 3v14M4 3h9l-2 4 2 4H4" stroke={tokens.colors.foreground} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconScience() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M7 3v6l-3 6h12l-3-6V3M6 3h8" stroke={tokens.colors.foreground} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="13" r="1" fill={tokens.colors.success} />
      <circle cx="12" cy="14.5" r="0.75" fill={tokens.colors.success} />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="5" width="14" height="12" rx="2" stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <path d="M3 9h14M7 3v4M13 3v4" stroke={tokens.colors.foreground} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconTarget() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <circle cx="10" cy="10" r="3.5" stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <circle cx="10" cy="10" r="1" fill={tokens.colors.foreground} />
    </svg>
  )
}

function IconProtein() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 3c-3.866 0-7 3.134-7 7s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7z" stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <path d="M7 10c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3" stroke={tokens.colors.foreground} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="10" r="1" fill={tokens.colors.foreground} />
    </svg>
  )
}

// Activity type icons for day cards
function IconStrength() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 8h2M12 8h2M4 8h8M4 6v4M12 6v4M1 7v2M15 7v2" stroke={tokens.colors.foreground} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconWalk() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="3" r="1.5" fill={tokens.colors.foreground} />
      <path d="M5 6.5l3 1.5 2-2M6 8.5L5 12M10 8l1 4M6 13l-1 2M10 12l1 2" stroke={tokens.colors.foreground} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function IconRest() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 9c0-2.761 2.239-5 5-5 .35 0 .693.036 1.024.104A4 4 0 0113 8v.5a1.5 1.5 0 01-3 0V8a2.5 2.5 0 00-5 0v1H3V9z" stroke={tokens.colors.foregroundMuted} strokeWidth="1.3" />
      <path d="M2 12h12" stroke={tokens.colors.foregroundMuted} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

// =============================================================================
// Parsing helpers
// =============================================================================

type DayEntry = {
  day: string
  activity: string
  type: 'strength' | 'walk' | 'rest' | 'optional' | 'other'
}

function parseDayEntries(text: string): DayEntry[] {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const entries: DayEntry[] = []

  for (const day of DAYS) {
    const pattern = new RegExp(`${day}[:\\s–-]+(.+?)(?=\\n(?:${DAYS.join('|')})|$)`, 'is')
    const match = text.match(pattern)
    if (match) {
      const activity = match[1].trim().replace(/\n/g, ' ')
      const lower = activity.toLowerCase()
      let type: DayEntry['type'] = 'other'
      if (lower.includes('rest') || lower.includes('stretch')) type = 'rest'
      else if (lower.includes('walk') || lower.includes('zone 2') || lower.includes('incline')) type = 'walk'
      else if (lower.includes('strength') || lower.includes('resistance') || lower.includes('dumbbell') || lower.includes('gym')) type = 'strength'
      else if (lower.includes('optional')) type = 'optional'
      entries.push({ day, activity, type })
    }
  }

  return entries
}

function extractProteinNumber(text: string): { display: string; note: string } {
  const rangeMatch = text.match(/(\d+)[–\-–](\d+)\s*g/i)
  const singleMatch = text.match(/(\d+)\s*g/i)

  let display = ''
  let note = text

  if (rangeMatch) {
    display = `${rangeMatch[1]}–${rangeMatch[2]}g`
    note = text.replace(rangeMatch[0], '').trim().replace(/^[.,\s]+/, '')
  } else if (singleMatch) {
    display = `${singleMatch[1]}g`
    note = text.replace(singleMatch[0], '').trim().replace(/^[.,\s]+/, '')
  }

  return { display, note }
}

// =============================================================================
// Section renderers
// =============================================================================

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div
        style={{
          width: 32, height: 32, borderRadius: '50%',
          backgroundColor: tokens.colors.surface,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <p style={{
        fontSize: tokens.typography.scale.xs,
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: tokens.colors.foregroundMuted,
      }}>
        {label}
      </p>
    </div>
  )
}

function StartingPointCard({ content }: { content: string }) {
  return (
    <div style={{
      backgroundColor: tokens.colors.foreground,
      borderRadius: tokens.radius.card,
      padding: '28px 24px',
    }}>
      <SectionHeader
        icon={<IconFlag />}
        label="Your Starting Point"
      />
      <p style={{
        fontSize: tokens.typography.scale.lg,
        color: 'white',
        lineHeight: 1.6,
        fontWeight: 400,
      }}>
        {content}
      </p>
    </div>
  )
}

function WhyCard({ content }: { content: string }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: tokens.radius.card,
      border: `1px solid ${tokens.colors.border}`,
      padding: '24px',
    }}>
      <SectionHeader icon={<IconScience />} label="Why This Is Happening" />
      <p style={{
        fontSize: tokens.typography.scale.base,
        color: tokens.colors.foreground,
        lineHeight: 1.7,
      }}>
        {content}
      </p>
    </div>
  )
}

const activityColors: Record<DayEntry['type'], string> = {
  strength: tokens.colors.surfaceSage,
  walk: '#EAF0F8',
  rest: tokens.colors.surface,
  optional: tokens.colors.surface,
  other: tokens.colors.surface,
}

const activityDotColors: Record<DayEntry['type'], string> = {
  strength: '#3D7A5C',
  walk: '#4A7FAA',
  rest: tokens.colors.border,
  optional: tokens.colors.border,
  other: tokens.colors.border,
}

function WeeklyPlanCard({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)
  const days = parseDayEntries(content)
  const hasDays = days.length > 0

  // Summary counts
  const counts = days.reduce(
    (acc, d) => {
      if (d.type === 'strength') acc.strength++
      else if (d.type === 'walk' || d.type === 'other') acc.walk++
      else acc.rest++
      return acc
    },
    { strength: 0, walk: 0, rest: 0 }
  )

  const summaryParts = [
    counts.strength > 0 && `${counts.strength}× strength`,
    counts.walk > 0 && `${counts.walk}× walking`,
    counts.rest > 0 && `${counts.rest}× rest`,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: tokens.radius.card,
      border: `1px solid ${tokens.colors.border}`,
      overflow: 'hidden',
    }}>
      {/* Header — always visible */}
      <div style={{ padding: '24px 24px 20px' }}>
        <SectionHeader icon={<IconCalendar />} label="Your Weekly Plan" />

        {/* Day dot strip */}
        {hasDays && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {days.map((entry) => (
              <div key={entry.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: '100%', height: 6, borderRadius: 9999,
                  backgroundColor: activityDotColors[entry.type],
                }} />
                <span style={{
                  fontSize: '10px', fontWeight: 600,
                  color: tokens.colors.foregroundMuted,
                  letterSpacing: '0.04em',
                }}>
                  {entry.day.slice(0, 2).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Summary line + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: tokens.typography.scale.sm, color: tokens.colors.foregroundMuted, fontWeight: 500 }}>
            {summaryParts}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: tokens.typography.scale.xs, fontWeight: 600,
              color: tokens.colors.foreground, background: 'none', border: 'none',
              cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            {expanded ? 'Hide details' : 'See details'}
            <motion.svg
              width="14" height="14" viewBox="0 0 14 14" fill="none"
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <path d="M3 5l4 4 4-4" stroke={tokens.colors.foreground} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          </button>
        </div>
      </div>

      {/* Expandable day-by-day */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              borderTop: `1px solid ${tokens.colors.border}`,
              padding: '16px 24px 24px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {hasDays ? days.map((entry) => (
                <div key={entry.day} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  backgroundColor: activityColors[entry.type],
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', backgroundColor: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    {entry.type === 'strength' && <IconStrength />}
                    {(entry.type === 'walk' || entry.type === 'other') && <IconWalk />}
                    {(entry.type === 'rest' || entry.type === 'optional') && <IconRest />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: tokens.typography.scale.xs, fontWeight: 700,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: tokens.colors.foregroundMuted, marginBottom: 3,
                    }}>
                      {entry.day}
                    </p>
                    <p style={{ fontSize: tokens.typography.scale.sm, color: tokens.colors.foreground, lineHeight: 1.5 }}>
                      {entry.activity}
                    </p>
                  </div>
                </div>
              )) : (
                <p style={{ fontSize: tokens.typography.scale.base, color: tokens.colors.foreground, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {content}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FirstWeekCard({ content }: { content: string }) {
  return (
    <div style={{
      backgroundColor: tokens.colors.surfaceBlush,
      borderRadius: tokens.radius.card,
      padding: '24px',
    }}>
      <SectionHeader icon={<IconTarget />} label="Your First Week Focus" />
      <p style={{
        fontSize: tokens.typography.scale.base,
        color: tokens.colors.foreground,
        lineHeight: 1.7,
      }}>
        {content}
      </p>
    </div>
  )
}

function ProteinCard({ content }: { content: string }) {
  const { display, note } = extractProteinNumber(content)

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: tokens.radius.card,
      border: `1px solid ${tokens.colors.border}`,
      padding: '24px',
    }}>
      <SectionHeader icon={<IconProtein />} label="Your Protein Target" />
      {display && (
        <div style={{ marginBottom: 12 }}>
          <span style={{
            fontSize: '52px',
            fontWeight: 700,
            color: tokens.colors.foreground,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}>
            {display}
          </span>
          <span style={{
            fontSize: tokens.typography.scale.sm,
            color: tokens.colors.foregroundMuted,
            marginLeft: 8,
            fontWeight: 500,
          }}>
            per day
          </span>
        </div>
      )}
      {note && (
        <p style={{
          fontSize: tokens.typography.scale.sm,
          color: tokens.colors.foregroundMuted,
          lineHeight: 1.6,
        }}>
          {note}
        </p>
      )}
    </div>
  )
}

// =============================================================================
// Section parser
// =============================================================================

type Section = { heading: string; content: string }

const SECTION_HEADINGS = [
  'Your Starting Point',
  'Why This Is Happening',
  'Your Weekly Plan',
  'Your First Week Focus',
  'Your Protein Target',
]

function parseSections(text: string): Section[] {
  const sections: Section[] = []
  for (const heading of SECTION_HEADINGS) {
    const pattern = new RegExp(`##\\s*${heading}\\s*\\n([\\s\\S]*?)(?=##|$)`, 'i')
    const match = text.match(pattern)
    if (match) sections.push({ heading, content: match[1].trim() })
  }
  return sections
}

function renderSection(section: Section, index: number) {
  return (
    <motion.div
      key={section.heading}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      {section.heading === 'Your Starting Point' && <StartingPointCard content={section.content} />}
      {section.heading === 'Why This Is Happening' && <WhyCard content={section.content} />}
      {section.heading === 'Your Weekly Plan' && <WeeklyPlanCard content={section.content} />}
      {section.heading === 'Your First Week Focus' && <FirstWeekCard content={section.content} />}
      {section.heading === 'Your Protein Target' && <ProteinCard content={section.content} />}
    </motion.div>
  )
}

// =============================================================================
// Page
// =============================================================================

// =============================================================================
// Email gate
// =============================================================================

function EmailGate({ onUnlock }: { onUnlock: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) { setFieldError('Please enter a valid email address.'); return }
    setFieldError('')
    setSubmitting(true)
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })
    } catch {
      // Don't block the user if the API call fails
    }
    localStorage.setItem('mm_email_captured', '1')
    setSubmitting(false)
    onUnlock()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    fontSize: tokens.typography.scale.base,
    borderRadius: tokens.radius.input,
    border: `1px solid ${tokens.colors.border}`,
    backgroundColor: 'white',
    color: tokens.colors.foreground,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        backgroundColor: tokens.colors.foreground,
        borderRadius: tokens.radius.card,
        padding: '32px 28px',
        gridColumn: '1 / -1',
      }}
    >
      <p style={{
        fontSize: tokens.typography.scale.xs,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 10,
      }}>
        Your plan is ready
      </p>
      <h2 style={{
        fontSize: tokens.typography.scale.xl,
        fontWeight: 700,
        color: 'white',
        lineHeight: 1.2,
        marginBottom: 8,
        letterSpacing: '-0.02em',
      }}>
        Unlock your weekly workout plan
      </h2>
      <p style={{
        fontSize: tokens.typography.scale.sm,
        color: 'rgba(255,255,255,0.65)',
        lineHeight: 1.6,
        marginBottom: 24,
      }}>
        Enter your email to see your full plan — including your personalized weekly schedule, first week focus, and daily protein target.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="text"
          placeholder="First name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        {fieldError && (
          <p style={{ fontSize: tokens.typography.scale.xs, color: tokens.colors.warning }}>{fieldError}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{
            backgroundColor: tokens.colors.success,
            color: 'white',
            padding: '16px',
            borderRadius: tokens.radius.pill,
            fontSize: tokens.typography.scale.base,
            fontWeight: 600,
            border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            marginTop: 4,
          }}
        >
          {submitting ? 'One moment…' : 'See my full plan'}
        </button>
      </form>

      <p style={{
        fontSize: tokens.typography.scale.xs,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 16,
        textAlign: 'center',
      }}>
        No spam. Unsubscribe any time.
      </p>
    </motion.div>
  )
}

// =============================================================================
// Main page
// =============================================================================

export default function ResultsPage() {
  const router = useRouter()
  const [streamedText, setStreamedText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailUnlocked, setEmailUnlocked] = useState(false)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (localStorage.getItem('mm_email_captured') === '1') setEmailUnlocked(true)
  }, [])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const raw = sessionStorage.getItem('quizAnswers')
    if (!raw) { router.push('/quiz'); return }

    const answers = JSON.parse(raw)

    async function fetchPlan() {
      try {
        const response = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(answers),
        })

        if (!response.ok || !response.body) throw new Error('Failed to generate plan')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        setIsLoading(false)

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          setStreamedText((prev) => prev + decoder.decode(value, { stream: true }))
        }
      } catch {
        setError('Something went wrong. Please try again.')
        setIsLoading(false)
      }
    }

    fetchPlan()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: tokens.colors.foreground }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          {['Reading your profile', 'Applying exercise science', 'Building your weekly plan', 'Personalizing your recommendations'].map((line, i) => (
            <motion.div
              key={line}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.6, duration: 0.4 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}
            >
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: tokens.colors.success, flexShrink: 0 }}
              />
              <p style={{ fontSize: tokens.typography.scale.sm, color: 'rgba(255,255,255,0.7)' }}>{line}</p>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: tokens.colors.background }}>
        <p style={{ color: tokens.colors.destructive, marginBottom: 16 }}>{error}</p>
        <button onClick={() => router.push('/quiz')} style={{
          backgroundColor: tokens.colors.accent, color: tokens.colors.accentForeground,
          borderRadius: tokens.radius.pill, padding: '12px 24px', fontSize: tokens.typography.scale.sm, fontWeight: 500,
        }}>
          Try again
        </button>
      </div>
    )
  }

  const sections = parseSections(streamedText)

  const previewSections = sections.filter(s =>
    s.heading === 'Your Starting Point' || s.heading === 'Why This Is Happening'
  )
  const lockedSections = sections.filter(s =>
    s.heading === 'Your Weekly Plan' || s.heading === 'Your First Week Focus' || s.heading === 'Your Protein Target'
  )

  // Show the gate once at least one preview section has streamed in
  const showGate = previewSections.length > 0 && !emailUnlocked

  return (
    <div className="min-h-screen" style={{ backgroundColor: tokens.colors.background }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 32px 64px' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ marginBottom: 40 }}>
          <p style={{
            fontSize: tokens.typography.scale.xs, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: tokens.colors.foregroundMuted, marginBottom: 6,
          }}>
            Your Plan
          </p>
          <h1 style={{
            fontSize: tokens.typography.scale['2xl'], fontWeight: 700,
            color: tokens.colors.foreground, letterSpacing: '-0.02em', lineHeight: 1.15,
          }}>
            Your personalized movement plan
          </h1>
        </motion.div>

        {/* Sections */}
        {sections.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
            {/* Left column — always visible */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {previewSections.map((section, i) => renderSection(section, i))}
            </div>

            {/* Right column — locked behind email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {showGate
                ? <EmailGate onUnlock={() => setEmailUnlocked(true)} />
                : lockedSections.map((section, i) => renderSection(section, i + 2))
              }
            </div>
          </div>
        ) : streamedText.length > 0 ? (
          <div style={{
            backgroundColor: 'white', borderRadius: tokens.radius.card,
            border: `1px solid ${tokens.colors.border}`, padding: '24px',
            fontSize: tokens.typography.scale.base, color: tokens.colors.foreground,
            lineHeight: 1.65, whiteSpace: 'pre-wrap',
          }}>
            {streamedText}
          </div>
        ) : null}

        {/* Footer */}
        {sections.length === SECTION_HEADINGS.length && emailUnlocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            style={{ marginTop: 40, paddingTop: 32, borderTop: `1px solid ${tokens.colors.border}` }}>
            <p style={{ fontSize: tokens.typography.scale.xs, color: tokens.colors.foregroundMuted, marginBottom: 14 }}>
              Based on research by Dr. Stacy Sims, Dr. Mary Claire Haver, Dr. Vonda Wright, ACE Fitness & The Menopause Society.
            </p>
            <button onClick={() => router.push('/quiz')} style={{
              fontSize: tokens.typography.scale.sm, color: tokens.colors.foregroundMuted,
              textDecoration: 'underline', textUnderlineOffset: '3px', background: 'none', border: 'none', cursor: 'pointer',
            }}>
              Retake the quiz
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
