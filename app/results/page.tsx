'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { tokens } from '@/lib/tokens'
import { jsPDF } from 'jspdf'

const FOREST_GREEN = '#1B2D1B'

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
    // Match just the header line — handles both "Monday: Title" and "**MONDAY — Title**"
    const pattern = new RegExp(`\\*{0,2}${day}\\b[^\\n]*`, 'i')
    const match = text.match(pattern)
    if (!match) continue
    const activity = match[0]
      .replace(/\*\*/g, '')
      // Strip day name then any non-alphanumeric separator chars (handles —, –, -, :, spaces, etc.)
      .replace(new RegExp(`^${day}\\b[^a-z0-9]+`, 'i'), '')
      .trim()
    const lower = activity.toLowerCase()
    let type: DayEntry['type'] = 'other'
    // Check strength first so "Lower Body Strength + Loaded Walk" → strength not walk
    if (lower.includes('strength') || lower.includes('resistance') || lower.includes('upper body') || lower.includes('lower body') || lower.includes('total body') || lower.includes('full body') || lower.includes('density')) type = 'strength'
    else if (lower.includes('walk') || lower.includes('zone 2') || lower.includes('incline')) type = 'walk'
    else if (lower.includes('rest') || lower.includes('recovery') || lower.includes('stretch') || lower.includes('mobility')) type = 'rest'
    else if (lower.includes('optional')) type = 'optional'
    entries.push({ day, activity, type })
  }
  return entries
}

function formatActivitySentences(text: string): string[] {
  return text
    .replace(/ [—–] /g, ', ')
    .replace(/\bThis is not a workout\.?\s*/gi, '')
    .replace(/\bIt is your /gi, 'Your ')
    .replace(/\bThis supports\b/gi, 'Good for')
    .replace(/\bThis helps\b/gi, 'Helps')
    .replace(/\bwithout taxing\b/gi, 'without stressing')
    .replace(/\bfat metabolism\b/gi, 'fat burning')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// Renders inline **bold** and *italic* markers as React elements
function inlineMd(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\*([^*\n]+?)\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] !== undefined) out.push(<strong key={m.index}>{m[1]}</strong>)
    else out.push(<em key={m.index}>{m[2]}</em>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

// Block markdown renderer: handles paragraphs, **bold**, *italic*, and --- horizontal rules
function RenderMd({ text, pStyle }: { text: string; pStyle?: React.CSSProperties }) {
  const blocks = text.split(/\n{2,}|\n---\n|^---$/m)
  return (
    <>
      {blocks.map((block, i) => {
        const trimmed = block.trim()
        if (!trimmed || trimmed === '---') {
          return <hr key={i} style={{ border: 'none', borderTop: `1px solid ${tokens.colors.border}`, margin: '16px 0', opacity: 0.4 }} />
        }
        return (
          <p key={i} style={{ margin: i > 0 ? '14px 0 0' : 0, ...pStyle }}>
            {inlineMd(trimmed)}
          </p>
        )
      })}
    </>
  )
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

type Section = { heading: string; content: string }

type ExerciseDetail = { name: string; sets: string; description: string; youtubeSearch: string }
type StrengthSession = { day: string; title: string; exercises: ExerciseDetail[] }

function parseStrengthSessions(weeklyContent: string): StrengthSession[] {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const sessions: StrengthSession[] = []
  for (const day of DAYS) {
    // Capture the rest of the header line + the block until the next day header
    const pattern = new RegExp(
      `\\*{0,2}${day}\\b([^\\n]*)\\n([\\s\\S]*?)(?=\\*{0,2}(?:${DAYS.join('|')})\\b|$)`,
      'i'
    )
    const match = weeklyContent.match(pattern)
    if (!match) continue
    // Extract clean title from the header remainder (e.g., " — Lower Body Strength**" → "Lower Body Strength")
    const title = match[1]
      .replace(/\*\*/g, '')
      .replace(/^[\s:—–\-]+/, '')
      .replace(/[\s:—–\-]+$/, '')
      .trim()
    const blockText = match[2]
    const lower = (title + ' ' + blockText).toLowerCase()
    if (
      !lower.includes('strength') && !lower.includes('resistance') &&
      !lower.includes('dumbbell') && !lower.includes('gym') &&
      !lower.includes('upper body') && !lower.includes('lower body') &&
      !lower.includes('total body') && !lower.includes('full body') &&
      !lower.includes('density') && !lower.includes('squat') &&
      !lower.includes('deadlift') && !lower.includes('press') &&
      !lower.includes('lunge') && !lower.includes('row')
    ) continue
    const lines = blockText.split('\n').map((l) => l.trim()).filter(Boolean)
    const exercises: ExerciseDetail[] = []
    for (const line of lines) {
      if (!/^[•\-]/.test(line)) continue
      // Strip bullet and bold markers
      const clean = line.replace(/^[•\-]\s*/, '').replace(/\*\*/g, '')
      // "Name: N sets × M–P reps. Description." OR "Name: N sets of M–P reps. Description."
      const colonFmt = clean.match(/^([^:]+):\s*(\d+\s+sets?[^.]{0,60})\.?\s*(.*)/)
      // Mock format: "Name — N sets of M–P reps. Description."
      const dashFmt = clean.match(/^(.+?)\s*[—–-]\s*(\d+\s+sets?\s+of\s+[\d–-]+(?:\s+per\s+\w+)?)\.?\s*(.*)/)
      const m = colonFmt ?? dashFmt
      if (!m) continue
      const youtubeM = clean.match(/\(search\s+"([^"]+)"\s+on\s+YouTube\)/i)
      const desc = (m[3] ?? '').replace(/\s*\(search[^)]+\)/gi, '').trim().replace(/\.$/, '')
      exercises.push({ name: m[1].trim(), sets: m[2].trim(), description: desc, youtubeSearch: youtubeM?.[1] ?? '' })
    }
    if (exercises.length > 0) sessions.push({ day, title: title || day, exercises })
  }
  return sessions
}

const SECTION_HEADINGS = [
  'Your Starting Point',
  'Why This Is Happening',
  'Your Weekly Plan',
  'Your First Week Focus',
  'Your 4-Week Progression',
  'Your Protein Target',
  'Your Stress & Cortisol',
  'Your Sleep & Recovery',
]

function parseSections(text: string): Section[] {
  const sections: Section[] = []
  for (const heading of SECTION_HEADINGS) {
    // Terminated section: content ends at the next ## heading
    const donePattern = new RegExp(`##\\s*${heading}\\s*\\n([\\s\\S]*?)(?=##)`, 'i')
    // In-progress section: heading present but no following ## yet (still streaming)
    const livePattern = new RegExp(`##\\s*${heading}\\s*\\n([\\s\\S]*)$`, 'i')
    const match = text.match(donePattern) ?? text.match(livePattern)
    if (match && match[1].trim()) sections.push({ heading, content: match[1].trim() })
  }
  return sections
}

// =============================================================================
// SVG Illustrations
// =============================================================================

function IllustrationBotanical() {
  return (
    <svg viewBox="0 0 220 300" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Main stems */}
      <path d="M110 285 C110 230 96 195 76 162 C56 129 34 106 18 68" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <path d="M110 285 C110 220 126 180 148 148 C170 116 198 94 214 52" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      {/* Left leaves */}
      <path d="M76 162 C50 148 32 130 38 112 C44 94 74 106 76 162" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.45" />
      <path d="M56 130 C32 118 18 98 26 82 C34 66 62 80 56 130" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.35" />
      {/* Right leaves */}
      <path d="M148 148 C174 136 192 116 184 96 C176 76 150 90 148 148" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.45" />
      <path d="M168 112 C192 102 208 82 198 64 C188 46 164 62 168 112" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.35" />
      {/* Tips */}
      <circle cx="18" cy="66" r="4" stroke="white" strokeWidth="1.2" opacity="0.4" />
      <circle cx="214" cy="50" r="4" stroke="white" strokeWidth="1.2" opacity="0.4" />
      {/* Veins */}
      <path d="M76 162 C60 148 42 132 38 112" stroke="white" strokeWidth="0.75" strokeLinecap="round" opacity="0.2" />
      <path d="M148 148 C166 134 184 114 184 96" stroke="white" strokeWidth="0.75" strokeLinecap="round" opacity="0.2" />
    </svg>
  )
}

function IllustrationWave() {
  return (
    <svg viewBox="0 0 340 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M24 48 C48 20 72 76 96 50 C120 24 134 68 158 60 C182 52 196 90 224 102 C252 114 280 122 316 134"
        stroke={tokens.colors.foreground} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="134" x2="316" y2="134" stroke={tokens.colors.border} strokeWidth="1" strokeDasharray="4 4" />
      <circle cx="24" cy="48" r="3.5" fill={tokens.colors.success} />
      <circle cx="316" cy="134" r="3.5" fill={tokens.colors.foreground} opacity="0.25" />
      <text x="24" y="150" fill={tokens.colors.foregroundMuted} fontSize="10" fontFamily="Inter, system-ui, sans-serif">Perimenopause</text>
      <text x="258" y="150" fill={tokens.colors.foregroundMuted} fontSize="10" fontFamily="Inter, system-ui, sans-serif">Post</text>
    </svg>
  )
}

function IllustrationSeedling() {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M40 92 L40 42" stroke={FOREST_GREEN} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M40 60 C26 52 14 40 20 28 C26 16 40 30 40 60" stroke={FOREST_GREEN} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M40 52 C54 44 66 32 60 20 C54 8 40 22 40 52" stroke={FOREST_GREEN} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M40 60 C30 48 20 36 20 28" stroke={FOREST_GREEN} strokeWidth="0.75" strokeLinecap="round" opacity="0.45" />
      <path d="M40 52 C52 42 62 30 60 20" stroke={FOREST_GREEN} strokeWidth="0.75" strokeLinecap="round" opacity="0.45" />
      <line x1="22" y1="92" x2="58" y2="92" stroke={FOREST_GREEN} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    </svg>
  )
}

// =============================================================================
// Day type config
// =============================================================================

const DAY_CONFIG = {
  strength: { bg: tokens.colors.surfaceSage, dot: '#2E5E3E', label: 'Strength' },
  walk:     { bg: '#DAE4EE',                 dot: '#3A6080', label: 'Walk' },
  rest:     { bg: tokens.colors.surface,     dot: tokens.colors.foreground, label: 'Rest' },
  optional: { bg: tokens.colors.surface,     dot: tokens.colors.foreground, label: 'Optional' },
  other:    { bg: tokens.colors.surface,     dot: tokens.colors.foreground, label: 'Active' },
}

// =============================================================================
// Fade-in wrapper
// =============================================================================

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1], delay }}
    >
      {children}
    </motion.div>
  )
}

// =============================================================================
// Skeleton components
// =============================================================================

function Sk({ w = '100%', h = 14, r = 4, c, style }: { w?: string | number; h?: number; r?: number; c?: string; style?: React.CSSProperties }) {
  return <div className="sk" style={{ width: w, height: h, borderRadius: r, backgroundColor: c ?? '#e2ddd8', flexShrink: 0, ...style }} />
}

function SkHero() {
  const b = 'rgba(255,255,255,0.13)'
  return (
    <section style={{ backgroundColor: FOREST_GREEN }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px 100px', display: 'grid', gridTemplateColumns: '1fr 200px', gap: 48, alignItems: 'center' }} className="results-hero-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Sk w={130} h={9} r={3} c={b} />
          <Sk w="68%" h={46} r={8} c={b} style={{ marginBottom: 4 }} />
          <Sk w="52%" h={46} r={8} c={b} style={{ marginBottom: 14 }} />
          <Sk w="93%" h={14} r={4} c={b} />
          <Sk w="86%" h={14} r={4} c={b} />
          <Sk w="74%" h={14} r={4} c={b} />
        </div>
        <div style={{ opacity: 0.15 }}><IllustrationBotanical /></div>
      </div>
    </section>
  )
}

function SkWhy() {
  const b = '#e2ddd8'
  return (
    <section style={{ backgroundColor: tokens.colors.background }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }} className="results-two-col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Sk w={80} h={9} r={3} c={b} />
          <Sk w={220} h={34} r={7} c={b} style={{ marginBottom: 6 }} />
          {[93, 100, 87, 94, 80, 89].map((w, i) => <Sk key={i} w={`${w}%`} h={14} r={4} c={b} />)}
        </div>
        <div style={{ opacity: 0.22 }}><IllustrationWave /></div>
      </div>
    </section>
  )
}

function SkWeekly() {
  const c = '#ddd9d3'
  return (
    <section style={{ backgroundColor: 'white' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
        <Sk w={80} h={9} r={3} style={{ marginBottom: 16 }} />
        <Sk w={140} h={32} r={7} style={{ marginBottom: 40 }} />
        <div style={{ display: 'grid', gap: 8, marginBottom: 8 }} className="week-grid-4">
          {[0,1,2,3].map(i => <div key={i} className="sk" style={{ height: 190, backgroundColor: c, borderRadius: 14 }} />)}
        </div>
        <div style={{ display: 'grid', gap: 8 }} className="week-grid-3">
          {[0,1,2].map(i => <div key={i} className="sk" style={{ height: 190, backgroundColor: c, borderRadius: 14 }} />)}
        </div>
      </div>
    </section>
  )
}

function SkStrength() {
  const b = 'rgba(0,0,0,0.08)'
  return (
    <section style={{ backgroundColor: tokens.colors.surfaceSage }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 52 }}>
          <Sk w={80} h={9} r={3} c={b} />
          <Sk w={280} h={34} r={7} c={b} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[0,1,2,3].map(i => <div key={i} className="sk" style={{ height: 130, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 14 }} />)}
        </div>
      </div>
    </section>
  )
}

function SkFirstWeek() {
  const b = '#e2ddd8'
  return (
    <section style={{ backgroundColor: tokens.colors.background }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px', display: 'grid', gridTemplateColumns: '160px 1fr', gap: 64, alignItems: 'center' }} className="results-two-col">
        <div style={{ display: 'flex', justifyContent: 'center', opacity: 0.18 }}><div style={{ width: 80, height: 100 }}><IllustrationSeedling /></div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Sk w={60} h={9} r={3} c={b} />
          <Sk w={260} h={32} r={7} c={b} style={{ marginBottom: 6 }} />
          {[95, 100, 87, 91, 82].map((w, i) => <Sk key={i} w={`${w}%`} h={14} r={4} c={b} />)}
        </div>
      </div>
    </section>
  )
}

function SkProgression() {
  return (
    <section style={{ backgroundColor: 'white' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
        <Sk w={80} h={9} r={3} style={{ marginBottom: 16 }} />
        <Sk w={180} h={32} r={7} style={{ marginBottom: 40 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[0,1,2,3].map(i => <div key={i} className="sk" style={{ height: 170, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 14 }} />)}
        </div>
      </div>
    </section>
  )
}

function SkProtein() {
  const b = 'rgba(0,0,0,0.08)'
  return (
    <section style={{ backgroundColor: tokens.colors.surfaceSage }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 64, alignItems: 'start', marginBottom: 40 }} className="results-two-col">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Sk w={80} h={9} r={3} c={b} />
            <Sk w={260} h={34} r={7} c={b} style={{ marginBottom: 6 }} />
            <Sk w={110} h={56} r={10} c={b} />
            <Sk w={60} h={10} r={3} c={b} />
          </div>
          <div className="sk" style={{ width: 200, height: 170, backgroundColor: b, borderRadius: 12 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[0,1,2].map(i => <div key={i} className="sk" style={{ height: 130, backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 14 }} />)}
        </div>
      </div>
    </section>
  )
}

function SkCortisol() {
  const b = 'rgba(0,0,0,0.08)'
  return (
    <section style={{ backgroundColor: tokens.colors.surfaceBlush }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 48, alignItems: 'center', marginBottom: 52 }} className="results-two-col">
          <div className="sk" style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: b, margin: '0 auto' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Sk w={80} h={9} r={3} c={b} />
            <Sk w={280} h={34} r={7} c={b} />
          </div>
        </div>
        <Sk w="80%" h={14} r={4} c={b} style={{ marginBottom: 32 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {[0,1,2].map(i => <div key={i} className="sk" style={{ height: 130, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 14 }} />)}
        </div>
      </div>
    </section>
  )
}

function SkSleep() {
  const b = 'rgba(255,255,255,0.12)'
  return (
    <section style={{ backgroundColor: FOREST_GREEN }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 52 }}>
          <Sk w={80} h={9} r={3} c={b} />
          <Sk w={260} h={34} r={7} c={b} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {[0,1,2,3].map(i => <div key={i} className="sk" style={{ height: 150, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14 }} />)}
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// Profile banner — built client-side from sessionStorage answers
// =============================================================================

type ProfileGroup = { label: string; values: string[] }

function ProfileBanner() {
  const [groups, setGroups] = useState<ProfileGroup[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('quizAnswers')
      if (!raw) return
      const a = JSON.parse(raw)
      const built: ProfileGroup[] = []

      // Stage & Age
      const stageMap: Record<string, string> = { perimenopause: 'Perimenopause', postmenopause: 'Postmenopause', not_sure: 'Not sure' }
      const ageMap: Record<string, string> = { under_45: 'Under 45', '45_49': '45–49', '50_54': '50–54', '55_59': '55–59', '60_plus': '60+' }
      const aboutVals: string[] = []
      if (a.stage && stageMap[a.stage]) aboutVals.push(stageMap[a.stage])
      if (a.age && ageMap[a.age]) aboutVals.push(ageMap[a.age])
      if (aboutVals.length) built.push({ label: 'Stage & age', values: aboutVals })

      // Goal
      const goalMap: Record<string, string> = { strength_muscle: 'Build strength', weight_body_comp: 'Body composition', energy_mood: 'Energy & mood', health_longevity: 'Longevity' }
      if (a.primaryGoal && goalMap[a.primaryGoal]) built.push({ label: 'Goal', values: [goalMap[a.primaryGoal]] })

      // Symptoms
      const symVals: string[] = []
      const stressMap: Record<string, string> = { low: 'Low stress', moderate: 'Moderate stress', high: 'High stress', overwhelming: 'Overwhelming stress' }
      if (a.stressLevel && stressMap[a.stressLevel]) symVals.push(stressMap[a.stressLevel])
      const sleepMap: Record<string, string> = { good: 'Good sleep', interrupted: 'Interrupted sleep', poor: 'Poor sleep', very_poor: 'Very poor sleep' }
      if (a.sleepQuality && sleepMap[a.sleepQuality]) symVals.push(sleepMap[a.sleepQuality])
      const flashMap: Record<string, string> = { mild: 'Mild hot flashes', moderate: 'Moderate hot flashes', severe: 'Severe hot flashes' }
      if (a.hotFlashSeverity && a.hotFlashSeverity !== 'none' && flashMap[a.hotFlashSeverity]) symVals.push(flashMap[a.hotFlashSeverity])
      if (symVals.length) built.push({ label: 'Symptoms', values: symVals })

      // Setup
      const setupVals: string[] = []
      const equipMap: Record<string, string> = { full_gym: 'Full gym', home_dumbbells: 'Home dumbbells', minimal: 'Bands & bodyweight', outdoor_only: 'Outdoors only' }
      if (a.equipment && equipMap[a.equipment]) setupVals.push(equipMap[a.equipment])
      const timeMap: Record<string, string> = { under_3hr: 'Under 3 hrs/wk', '3_5hr': '3–5 hrs/wk', '5hr_plus': '5+ hrs/wk' }
      if (a.timeAvailable && timeMap[a.timeAvailable]) setupVals.push(timeMap[a.timeAvailable])
      if (setupVals.length) built.push({ label: 'Setup', values: setupVals })

      // Health
      const condMap: Record<string, string> = { arthritis_knees: 'Knee arthritis', arthritis_back: 'Back arthritis', arthritis_hips: 'Hip arthritis', osteopenia_osteoporosis: 'Osteoporosis', hypertension: 'Hypertension', diabetes: 'Type 2 diabetes', prediabetes: 'Pre-diabetes', thyroid: 'Thyroid', autoimmune: 'Autoimmune' }
      const condVals = (a.medicalConditions ?? []).map((c: string) => condMap[c]).filter(Boolean)
      if (condVals.length) built.push({ label: 'Health', values: condVals })

      setGroups(built)
    } catch {}
  }, [])

  if (!groups.length) return null

  const summary = groups.flatMap(g => g.values.slice(0, 1)).join(' · ')

  return (
    <div style={{ backgroundColor: FOREST_GREEN, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Collapsed header — always visible */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 16,
            padding: '14px 32px', background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
              Your profile
            </span>
            {!expanded && (
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {summary}
              </span>
            )}
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
            {expanded ? 'Hide' : 'View details'}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}>
              <path d="M2 4l4 4 4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {/* Expandable details */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '4px 32px 20px' }}>
                <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }} className="profile-groups">
                  {groups.map((group, i) => (
                    <div
                      key={group.label}
                      className={`profile-group${group.label === 'Health' ? ' profile-group-full' : ''}`}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 6,
                        paddingLeft: i === 0 ? 0 : 28, paddingRight: 28,
                        borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.12)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
                        {group.label}
                      </span>
                      <div style={
                        group.label === 'Health' && group.values.length > 2
                          ? { display: 'grid', gridTemplateColumns: 'repeat(3, auto)', columnGap: 20, rowGap: 2 }
                          : { display: 'flex', flexDirection: 'column', gap: 2 }
                      }>
                        {group.values.map((v) => (
                          <span key={v} style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.72)', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// =============================================================================
// Sections
// =============================================================================

function HeroSection({ content }: { content: string }) {
  return (
    <section style={{ backgroundColor: FOREST_GREEN }}>
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '80px 32px 100px',
          display: 'grid',
          gridTemplateColumns: '1fr 200px',
          gap: 48,
          alignItems: 'center',
        }}
        className="results-hero-grid"
      >
        <div>
          <p style={{
            fontSize: tokens.typography.scale.xs,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: 20,
          }}>
            Your personalized plan
          </p>
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 60px)',
            color: 'white',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: 28,
            maxWidth: 520,
          }}>
            Your movement plan is ready.
          </h1>
          <div style={{ maxWidth: 500 }}>
            <RenderMd text={content} pStyle={{ fontSize: 'clamp(17px, 2vw, 20px)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }} />
          </div>
        </div>
        <div style={{ opacity: 0.65 }}>
          <IllustrationBotanical />
        </div>
      </div>
    </section>
  )
}

function WhySection({ content }: { content: string }) {
  return (
    <section style={{ backgroundColor: tokens.colors.background }}>
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '80px 32px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 72,
          alignItems: 'center',
        }}
        className="results-two-col"
      >
        <div>
          <p style={{
            fontSize: tokens.typography.scale.xs,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: tokens.colors.foregroundMuted,
            marginBottom: 16,
          }}>
            The science
          </p>
          <h2 style={{
            fontSize: 'clamp(28px, 3vw, 42px)',
            color: tokens.colors.foreground,
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            marginBottom: 24,
          }}>
            Why this is happening
          </h2>
          <div>
            <RenderMd text={content} pStyle={{ fontSize: tokens.typography.scale.lg, color: tokens.colors.foreground, lineHeight: 1.75 }} />
          </div>
        </div>
        <div>
          <IllustrationWave />
          <p style={{
            fontSize: tokens.typography.scale.xs,
            color: tokens.colors.foregroundMuted,
            marginTop: 14,
            textAlign: 'center',
          }}>
            Estrogen levels across the menopause transition
          </p>
        </div>
      </div>
    </section>
  )
}

function ActivityIllustration({ type, color }: { type: DayEntry['type']; color: string }) {
  if (type === 'strength') {
    return (
      <svg width="96" height="56" viewBox="0 0 96 56" fill="none" aria-hidden="true">
        {/* Left plate */}
        <rect x="2" y="12" width="16" height="32" rx="4" stroke={color} strokeWidth="1.5" />
        <rect x="6" y="19" width="8" height="18" rx="2" stroke={color} strokeWidth="1" opacity="0.3" />
        {/* Left collar */}
        <rect x="18" y="21" width="5" height="14" rx="2" stroke={color} strokeWidth="1.4" />
        {/* Bar */}
        <line x1="23" y1="28" x2="73" y2="28" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {/* Right collar */}
        <rect x="73" y="21" width="5" height="14" rx="2" stroke={color} strokeWidth="1.4" />
        {/* Right plate */}
        <rect x="78" y="12" width="16" height="32" rx="4" stroke={color} strokeWidth="1.5" />
        <rect x="82" y="19" width="8" height="18" rx="2" stroke={color} strokeWidth="1" opacity="0.3" />
      </svg>
    )
  }
  if (type === 'walk') {
    return (
      <svg width="72" height="88" viewBox="0 0 72 88" fill="none" aria-hidden="true">
        {/* Left footprint — heel narrow, ball wide, slight arch indent on left side */}
        <path d="
          M 20 6
          C 24 4 30 6 32 12
          C 34 18 32 26 30 32
          C 28 38 26 42 22 44
          C 18 46 14 44 12 40
          C 10 36 10 30 12 24
          C 14 16 16 8 20 6 Z
        " stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
        {/* toes — 5 small circles across the top */}
        <circle cx="16" cy="8"  r="2" stroke={color} strokeWidth="1" fill="none" />
        <circle cx="21" cy="5"  r="2.2" stroke={color} strokeWidth="1" fill="none" />
        <circle cx="27" cy="5"  r="2" stroke={color} strokeWidth="1" fill="none" />
        <circle cx="32" cy="8"  r="1.8" stroke={color} strokeWidth="1" fill="none" />
        <circle cx="35" cy="12" r="1.5" stroke={color} strokeWidth="1" fill="none" />

        {/* Right footprint — offset diagonally down-right */}
        <path d="
          M 44 42
          C 48 40 54 42 56 48
          C 58 54 56 62 54 68
          C 52 74 50 78 46 80
          C 42 82 38 80 36 76
          C 34 72 34 66 36 60
          C 38 52 40 44 44 42 Z
        " stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
        {/* toes */}
        <circle cx="40" cy="44" r="2"   stroke={color} strokeWidth="1" fill="none" />
        <circle cx="45" cy="41" r="2.2" stroke={color} strokeWidth="1" fill="none" />
        <circle cx="51" cy="41" r="2"   stroke={color} strokeWidth="1" fill="none" />
        <circle cx="56" cy="44" r="1.8" stroke={color} strokeWidth="1" fill="none" />
        <circle cx="59" cy="48" r="1.5" stroke={color} strokeWidth="1" fill="none" />
      </svg>
    )
  }
  // rest / optional / other → moon
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <path d="M42 12 C30 14 22 28 24 42 C26 56 38 64 52 62 C40 70 24 62 18 48 C12 34 20 18 34 13 C37 12 40 12 42 12Z"
        stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="56" cy="22" r="2" fill={color} opacity="0.5" />
      <circle cx="62" cy="36" r="1.5" fill={color} opacity="0.35" />
      <circle cx="50" cy="10" r="1.5" fill={color} opacity="0.3" />
    </svg>
  )
}

function StrengthCardSummary({ activity }: { activity: string }) {
  const parts = activity.split(/\s*•\s*/)
  const titleFull = parts[0].trim()
  const subtitleM = titleFull.match(/[—–-]\s*(.+)/)
  const subtitle = subtitleM ? subtitleM[1].trim() : titleFull
  const names = parts.slice(1)
    .map((p) => p.match(/^(.+?)\s*[—–-]/)?.[1]?.trim())
    .filter(Boolean) as string[]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: tokens.typography.scale.base, color: tokens.colors.foreground, fontWeight: 500 }}>{subtitle}</p>
      {names.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {names.map((name, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: tokens.colors.foreground, opacity: 0.25, flexShrink: 0 }} />
              <span style={{ fontSize: tokens.typography.scale.base, color: tokens.colors.foreground, lineHeight: 1.5 }}>{name}</span>
            </div>
          ))}
        </div>
      )}
      <p style={{ fontSize: tokens.typography.scale.sm, color: tokens.colors.foregroundMuted, marginTop: 2 }}>
        Full details in exercise guide
      </p>
    </div>
  )
}

function DayCard({ entry }: { entry: DayEntry }) {
  const cfg = DAY_CONFIG[entry.type]
  return (
    <div style={{
      backgroundColor: cfg.bg,
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        flex: 1,
        padding: '24px 22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h4 style={{ color: tokens.colors.foreground, lineHeight: 1.2, margin: 0 }}>
              {entry.day}
            </h4>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: cfg.dot,
              backgroundColor: 'rgba(255,255,255,0.55)',
              borderRadius: 20,
              padding: '3px 10px',
              whiteSpace: 'nowrap',
            }}>
              {cfg.label}
            </span>
          </div>
          {entry.type === 'strength' ? (
            <StrengthCardSummary activity={entry.activity} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {formatActivitySentences(entry.activity).map((sentence, i) => (
                <p key={i} style={{ fontSize: tokens.typography.scale.base, color: tokens.colors.foreground, lineHeight: 1.6 }}>
                  {inlineMd(sentence)}
                </p>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, opacity: 0.65 }}>
          <ActivityIllustration type={entry.type} color={cfg.dot} />
        </div>
      </div>
    </div>
  )
}

function WeeklySection({ content }: { content: string }) {
  const days = parseDayEntries(content)

  if (!days.length) {
    return (
      <section style={{ backgroundColor: tokens.colors.background }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
          <div>
            <RenderMd text={content} pStyle={{ fontSize: tokens.typography.scale.base, color: tokens.colors.foreground, lineHeight: 1.7 }} />
          </div>
        </div>
      </section>
    )
  }

  const row1 = days.slice(0, 4)
  const row2 = days.slice(4)

  return (
    <section style={{ backgroundColor: 'white' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
        <p style={{
          fontSize: tokens.typography.scale.xs,
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: tokens.colors.foregroundMuted,
          marginBottom: 16,
        }}>
          Your schedule
        </p>
        <h2 style={{
          fontSize: 'clamp(28px, 3vw, 42px)',
          fontWeight: 700,
          color: tokens.colors.foreground,
          lineHeight: 1.15,
          letterSpacing: '-0.025em',
          marginBottom: 40,
        }}>
          Your week
        </h2>

        <div style={{ display: 'grid', gap: 8, marginBottom: 8 }} className="week-grid-4">
          {row1.map((entry) => <DayCard key={entry.day} entry={entry} />)}
        </div>
        {row2.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }} className="week-grid-3">
            {row2.map((entry) => <DayCard key={entry.day} entry={entry} />)}
          </div>
        )}
      </div>
    </section>
  )
}

// =============================================================================
// Strength Sessions detail
function IllustrationDumbbell() {
  return (
    <svg viewBox="0 0 120 130" fill="none" aria-hidden="true">
      {/* Bar */}
      <line x1="35" y1="66" x2="85" y2="66" stroke={tokens.colors.foreground} strokeWidth="2.8" strokeLinecap="round" />

      {/* Left weight */}
      <rect x="7" y="50" width="30" height="32" rx="5" stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <rect x="13" y="56" width="18" height="20" rx="3" stroke={tokens.colors.foreground} strokeWidth="1" opacity="0.3" />

      {/* Right weight */}
      <rect x="83" y="50" width="30" height="32" rx="5" stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <rect x="89" y="56" width="18" height="20" rx="3" stroke={tokens.colors.foreground} strokeWidth="1" opacity="0.3" />

      {/* Collars */}
      <rect x="33" y="58" width="7" height="16" rx="2" stroke={tokens.colors.foreground} strokeWidth="1.4" />
      <rect x="80" y="58" width="7" height="16" rx="2" stroke={tokens.colors.foreground} strokeWidth="1.4" />

      {/* Energy arc above dumbbell */}
      <path d="M42 50 Q60 36 78 50" stroke={tokens.colors.foreground} strokeWidth="1.1" strokeLinecap="round" opacity="0.22" fill="none" />

      {/* 4-pointed sparkle top-right */}
      <path d="M99 20 L101 27 L99 34 L97 27 Z" stroke={tokens.colors.foreground} strokeWidth="0.9" opacity="0.28" />
      {/* 4-pointed sparkle top-left */}
      <path d="M19 16 L21 22 L19 28 L17 22 Z" stroke={tokens.colors.foreground} strokeWidth="0.9" opacity="0.2" />

      {/* Dots scattered */}
      <circle cx="60" cy="20" r="2" fill={tokens.colors.foreground} opacity="0.18" />
      <circle cx="85" cy="14" r="1.5" fill={tokens.colors.foreground} opacity="0.14" />
      <circle cx="32" cy="12" r="1.5" fill={tokens.colors.foreground} opacity="0.14" />
      <circle cx="110" cy="48" r="1.5" fill={tokens.colors.foreground} opacity="0.14" />
      <circle cx="8" cy="44" r="1.2" fill={tokens.colors.foreground} opacity="0.12" />

      {/* Motion lines below */}
      <line x1="48" y1="92" x2="48" y2="100" stroke={tokens.colors.foreground} strokeWidth="1.1" strokeLinecap="round" opacity="0.18" />
      <line x1="60" y1="90" x2="60" y2="100" stroke={tokens.colors.foreground} strokeWidth="1.1" strokeLinecap="round" opacity="0.18" />
      <line x1="72" y1="92" x2="72" y2="100" stroke={tokens.colors.foreground} strokeWidth="1.1" strokeLinecap="round" opacity="0.18" />

      {/* Dashed horizon line */}
      <line x1="20" y1="112" x2="100" y2="112" stroke={tokens.colors.foreground} strokeWidth="0.8" strokeDasharray="3 4" opacity="0.12" strokeLinecap="round" />
    </svg>
  )
}

// =============================================================================

function StrengthSection({ content }: { content: string }) {
  const sessions = parseStrengthSessions(content)
  if (!sessions.length) return null

  return (
    <section style={{ backgroundColor: tokens.colors.surfaceSage }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
        {/* Header: text + dumbbell illustration */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 48, alignItems: 'center', marginBottom: 52 }}
          className="results-two-col"
        >
          <div>
            <p style={{
              fontSize: tokens.typography.scale.xs,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: tokens.colors.foregroundMuted,
              marginBottom: 16,
            }}>
              Exercise guide
            </p>
            <h2 style={{
              fontSize: 'clamp(28px, 3vw, 42px)',
              fontWeight: 700,
              color: tokens.colors.foreground,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
            }}>
              Your strength sessions
            </h2>
          </div>
          <div style={{ opacity: 0.7, width: 120, height: 130, marginLeft: 'auto' }}>
            <IllustrationDumbbell />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }}>
          {sessions.map((session) => (
            <div key={session.day}>
              {/* Day header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: tokens.colors.foregroundMuted,
                  flexShrink: 0,
                }}>
                  {session.day}
                </span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: DAY_CONFIG.strength.dot,
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  borderRadius: 20,
                  padding: '3px 10px',
                  flexShrink: 0,
                }}>
                  {session.title || 'Strength'}
                </span>
              </div>

              {/* Exercise cards */}
              <div style={{ display: 'grid', gap: 12 }} className="strength-ex-grid">
                {session.exercises.map((ex, i) => (
                  <div key={i} style={{
                    backgroundColor: 'rgba(255,255,255,0.55)',
                    borderRadius: 14,
                    padding: '20px 20px 22px',
                    border: `1px solid ${tokens.colors.border}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}>
                    {/* Name + sets row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <h4 style={{
                        color: tokens.colors.foreground,
                        lineHeight: 1.3,
                        margin: 0,
                      }}>
                        {ex.name}
                      </h4>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        color: DAY_CONFIG.strength.dot,
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        borderRadius: 20,
                        padding: '3px 9px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        marginTop: 2,
                      }}>
                        {ex.sets}
                      </span>
                    </div>

                    {/* Description */}
                    {ex.description && (
                      <p style={{
                        fontSize: tokens.typography.scale.base,
                        color: tokens.colors.foregroundMuted,
                        lineHeight: 1.65,
                      }}>
                        {ex.description}
                      </p>
                    )}

                    {/* YouTube button */}
                    {ex.youtubeSearch && (
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtubeSearch)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: tokens.typography.scale.sm,
                          fontWeight: 600,
                          color: tokens.colors.foreground,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 4,
                          backgroundColor: 'rgba(0,0,0,0.05)',
                          border: `1px solid ${tokens.colors.border}`,
                          borderRadius: tokens.radius.pill,
                          padding: '5px 12px',
                          alignSelf: 'flex-start',
                        }}
                      >
                        Watch on YouTube
                        <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                          <path d="M2 8L8 2M8 2H4M8 2V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FirstWeekSection({ content }: { content: string }) {
  return (
    <section style={{ backgroundColor: tokens.colors.background }}>
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '80px 32px',
          display: 'grid',
          gridTemplateColumns: '160px 1fr',
          gap: 64,
          alignItems: 'center',
        }}
        className="results-two-col"
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 80, height: 100 }}>
            <IllustrationSeedling />
          </div>
        </div>
        <div>
          <p style={{
            fontSize: tokens.typography.scale.xs,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: tokens.colors.foregroundMuted,
            marginBottom: 16,
          }}>
            Week one
          </p>
          <h2 style={{
            fontSize: 'clamp(28px, 3vw, 42px)',
            color: tokens.colors.foreground,
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            marginBottom: 24,
          }}>
            Your first week focus
          </h2>
          <div>
            <RenderMd text={content} pStyle={{ fontSize: tokens.typography.scale.lg, color: tokens.colors.foreground, lineHeight: 1.75 }} />
          </div>
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// 4-Week Progression section
// =============================================================================

function ProgressionSection({ content }: { content: string }) {
  const weeks = content
    .split(/\n+/)
    .map((line) => {
      const m = line.match(/^\*\*Week\s*(\d)\s*[—–-]\s*(.+?)\*\*[:\s]+(.+)$/)
      if (m) return { num: m[1], title: m[2].trim(), body: m[3].trim() }
      return null
    })
    .filter(Boolean) as { num: string; title: string; body: string }[]

  return (
    <section style={{ backgroundColor: 'white' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
        <p style={{ fontSize: tokens.typography.scale.xs, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: tokens.colors.foregroundMuted, marginBottom: 16 }}>
          Progression
        </p>
        <h2 style={{ fontSize: 'clamp(28px, 3vw, 42px)', color: tokens.colors.foreground, lineHeight: 1.15, letterSpacing: '-0.025em', marginBottom: 40 }}>
          Your 4-week plan
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {(weeks.length > 0 ? weeks : [{ num: '1', title: 'Foundation', body: content }]).map((week, i) => (
            <div key={i} style={{ backgroundColor: 'white', border: `1px solid ${tokens.colors.border}`, borderRadius: 14, padding: '28px 24px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)' }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: tokens.colors.foregroundMuted,
                display: 'block',
                marginBottom: 12,
              }}>
                {week.num.padStart(2, '0')}
              </span>
              <h4 style={{
                color: tokens.colors.foreground,
                marginBottom: 8,
                lineHeight: 1.3,
              }}>
                {week.title}
              </h4>
              <p style={{ fontSize: tokens.typography.scale.base, color: tokens.colors.foregroundMuted, lineHeight: 1.7 }}>
                {inlineMd(week.body)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// Bento box food illustrations
// =============================================================================

function FoodEgg() {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="44" rx="20" ry="26" stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <ellipse cx="40" cy="50" rx="10" ry="9" stroke={tokens.colors.foreground} strokeWidth="1.2" opacity="0.4" />
    </svg>
  )
}

function FoodChicken() {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path d="M18 42 C16 26 28 14 42 16 C56 18 66 30 62 44 C58 56 46 66 34 64 C20 62 18 56 18 42Z"
        stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <path d="M28 26 C32 34 34 46 30 58" stroke={tokens.colors.foreground} strokeWidth="0.85" opacity="0.3" strokeLinecap="round" />
      <path d="M42 20 C46 30 48 44 44 58" stroke={tokens.colors.foreground} strokeWidth="0.85" opacity="0.3" strokeLinecap="round" />
    </svg>
  )
}

function FoodFish() {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path d="M22 40 C26 26 44 20 58 28 C68 34 70 46 58 52 C44 60 26 56 22 44Z"
        stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <path d="M22 40 L10 30 L10 50 Z" stroke={tokens.colors.foreground} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="54" cy="32" r="2.5" fill={tokens.colors.foreground} opacity="0.4" />
      <path d="M40 24 C38 32 38 42 42 50" stroke={tokens.colors.foreground} strokeWidth="0.85" opacity="0.25" strokeLinecap="round" />
    </svg>
  )
}

function FoodYogurt() {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path d="M24 32 L56 32 L52 64 C51 66 49 68 47 68 L33 68 C31 68 29 66 28 64 Z"
        stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <rect x="20" y="22" width="40" height="12" rx="4" stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <path d="M30 50 L50 50" stroke={tokens.colors.foreground} strokeWidth="0.85" opacity="0.35" strokeLinecap="round" />
      <path d="M32 58 L48 58" stroke={tokens.colors.foreground} strokeWidth="0.85" opacity="0.25" strokeLinecap="round" />
    </svg>
  )
}

function FoodBeans() {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path d="M18 36 C16 24 24 16 34 20 C40 22 42 30 38 38 C34 46 20 48 18 36Z"
        stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <path d="M40 54 C38 42 48 36 56 40 C62 44 62 54 56 60 C50 66 40 64 40 54Z"
        stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <path d="M22 60 C22 50 30 46 38 50 C42 54 40 64 34 66 C28 68 22 66 22 60Z"
        stroke={tokens.colors.foreground} strokeWidth="1.5" opacity="0.5" />
    </svg>
  )
}

function FoodTofu() {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <rect x="12" y="22" width="56" height="36" rx="4" stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <line x1="12" y1="35" x2="68" y2="35" stroke={tokens.colors.foreground} strokeWidth="0.85" opacity="0.3" />
      <line x1="12" y1="47" x2="68" y2="47" stroke={tokens.colors.foreground} strokeWidth="0.85" opacity="0.3" />
      <line x1="30" y1="22" x2="30" y2="58" stroke={tokens.colors.foreground} strokeWidth="0.85" opacity="0.3" />
      <line x1="50" y1="22" x2="50" y2="58" stroke={tokens.colors.foreground} strokeWidth="0.85" opacity="0.3" />
    </svg>
  )
}

function FoodEdamame() {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path d="M22 50 C18 36 26 18 38 16 C50 14 62 24 62 38 C62 52 52 66 40 66 C28 66 22 62 22 50Z"
        stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <circle cx="36" cy="30" r="8" stroke={tokens.colors.foreground} strokeWidth="1.2" opacity="0.45" />
      <circle cx="46" cy="48" r="8" stroke={tokens.colors.foreground} strokeWidth="1.2" opacity="0.45" />
      <path d="M38 16 C36 10 32 8 30 10" stroke={tokens.colors.foreground} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

function FoodShake() {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path d="M26 30 L54 30 L58 68 C58 70 56 72 54 72 L26 72 C24 72 22 70 22 68 Z"
        stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <rect x="22" y="18" width="36" height="14" rx="4" stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <rect x="28" y="44" width="24" height="14" rx="2" stroke={tokens.colors.foreground} strokeWidth="0.85" opacity="0.3" />
      <line x1="28" y1="62" x2="52" y2="62" stroke={tokens.colors.foreground} strokeWidth="0.85" opacity="0.25" strokeLinecap="round" />
    </svg>
  )
}

function FoodNuts() {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path d="M18 44 C16 30 24 16 36 16 C46 16 54 24 52 36 C50 50 36 62 26 58 C18 54 18 52 18 44Z"
        stroke={tokens.colors.foreground} strokeWidth="1.5" />
      <path d="M44 60 C44 48 52 38 60 40 C66 42 66 52 62 60 C58 68 44 68 44 60Z"
        stroke={tokens.colors.foreground} strokeWidth="1.5" opacity="0.55" />
      <path d="M28 26 C30 34 32 44 28 54" stroke={tokens.colors.foreground} strokeWidth="0.85" opacity="0.25" strokeLinecap="round" />
    </svg>
  )
}

type BentoItem = { food: React.ReactNode; label: string; tall?: boolean }

function BentoBox({ dietary }: { dietary: string }) {
  const configs: Record<string, BentoItem[]> = {
    omnivore:    [
      { food: <FoodEgg />,     label: 'Eggs' },
      { food: <FoodChicken />, label: 'Chicken' },
      { food: <FoodFish />,    label: 'Salmon', tall: true },
      { food: <FoodYogurt />,  label: 'Greek yogurt' },
      { food: <FoodBeans />,   label: 'Legumes' },
    ],
    pescatarian: [
      { food: <FoodEgg />,      label: 'Eggs' },
      { food: <FoodFish />,     label: 'Salmon' },
      { food: <FoodYogurt />,   label: 'Greek yogurt', tall: true },
      { food: <FoodBeans />,    label: 'Legumes' },
      { food: <FoodEdamame />,  label: 'Edamame' },
    ],
    vegetarian:  [
      { food: <FoodEgg />,      label: 'Eggs' },
      { food: <FoodYogurt />,   label: 'Greek yogurt' },
      { food: <FoodTofu />,     label: 'Tofu', tall: true },
      { food: <FoodBeans />,    label: 'Legumes' },
      { food: <FoodEdamame />,  label: 'Edamame' },
    ],
    vegan:       [
      { food: <FoodTofu />,     label: 'Tofu' },
      { food: <FoodEdamame />,  label: 'Edamame' },
      { food: <FoodShake />,    label: 'Protein powder', tall: true },
      { food: <FoodBeans />,    label: 'Legumes' },
      { food: <FoodNuts />,     label: 'Nuts' },
    ],
  }

  const items = configs[dietary] ?? configs.omnivore

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1.15fr',
      gridTemplateRows: '1fr 1fr',
      gap: 8,
      width: '100%',
      maxWidth: 340,
    }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: '16px 12px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            gridRow: item.tall ? 'span 2' : undefined,
          }}
        >
          <div style={{ width: 56, height: 56 }}>
            {item.food}
          </div>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: tokens.colors.foregroundMuted,
            textAlign: 'center',
          }}>
            {item.label}
          </p>
        </div>
      ))}
    </div>
  )
}

function ProteinSection({ content }: { content: string }) {
  const { display } = extractProteinNumber(content)

  const dietary = (() => {
    try {
      const raw = sessionStorage.getItem('quizAnswers')
      return raw ? (JSON.parse(raw).dietaryPattern ?? 'omnivore') : 'omnivore'
    } catch { return 'omnivore' }
  })()

  const tips = content
    .split(/\n+/)
    .map((line) => {
      const match = line.match(/^\*\*(.+?)\*\*[:\s]+(.+)$/)
      if (match) return { title: match[1].trim(), body: match[2].trim() }
      return null
    })
    .filter(Boolean) as { title: string; body: string }[]

  return (
    <section style={{ backgroundColor: tokens.colors.surfaceSage }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 64, alignItems: 'start', marginBottom: 40 }} className="results-two-col">
          <div>
            <p style={{
              fontSize: tokens.typography.scale.xs,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: tokens.colors.foregroundMuted,
              marginBottom: 16,
            }}>
              Nutrition
            </p>
            <h2 style={{
              fontSize: 'clamp(28px, 3vw, 42px)',
              fontWeight: 700,
              color: tokens.colors.foreground,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              marginBottom: 20,
            }}>
              Your daily protein target
            </h2>
            {display && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{
                  fontSize: 'clamp(40px, 5vw, 64px)',
                  fontWeight: 700,
                  color: tokens.colors.foreground,
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}>
                  {display}
                </span>
                <span style={{
                  fontSize: tokens.typography.scale.sm,
                  color: tokens.colors.foregroundMuted,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  per day
                </span>
              </div>
            )}
          </div>
          <BentoBox dietary={dietary} />
        </div>

        {tips.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}>
            {tips.map((tip, i) => (
              <div key={i} style={{
                backgroundColor: 'rgba(255,255,255,0.55)',
                borderRadius: 14,
                padding: '20px 20px 22px',
                border: `1px solid ${tokens.colors.border}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)',
              }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  color: tokens.colors.foregroundMuted,
                  display: 'block',
                  marginBottom: 12,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h4 style={{
                  color: tokens.colors.foreground,
                  marginBottom: 6,
                  lineHeight: 1.3,
                }}>
                  {tip.title}
                </h4>
                <p style={{
                  fontSize: tokens.typography.scale.base,
                  color: tokens.colors.foregroundMuted,
                  lineHeight: 1.65,
                }}>
                  {inlineMd(tip.body)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// =============================================================================
// Stress & Cortisol section
// =============================================================================

function IllustrationBreathRings() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="60" cy="60" r="10" stroke={tokens.colors.foreground} strokeWidth="1.5" opacity="0.7" />
      <circle cx="60" cy="60" r="24" stroke={tokens.colors.foreground} strokeWidth="1.2" opacity="0.4" />
      <circle cx="60" cy="60" r="38" stroke={tokens.colors.foreground} strokeWidth="1" opacity="0.22" />
      <circle cx="60" cy="60" r="52" stroke={tokens.colors.foreground} strokeWidth="0.75" opacity="0.1" />
      <circle cx="60" cy="50" r="2" fill={tokens.colors.foreground} opacity="0.45" />
      <circle cx="70" cy="60" r="2" fill={tokens.colors.foreground} opacity="0.45" />
      <circle cx="60" cy="70" r="2" fill={tokens.colors.foreground} opacity="0.45" />
      <circle cx="50" cy="60" r="2" fill={tokens.colors.foreground} opacity="0.45" />
    </svg>
  )
}

function CortisolSection({ content }: { content: string }) {
  const lines = content.split(/\n+/)
  const intro = lines.find(l => !l.startsWith('**') && !l.startsWith('-') && l.length > 20)?.trim() ?? ''
  const tips = lines
    .map((line) => {
      const match = line.match(/^\*\*(.+?)\*\*[:\s]+(.+)$/)
      if (match) return { title: match[1].trim(), body: match[2].trim() }
      return null
    })
    .filter(Boolean) as { title: string; body: string }[]

  return (
    <section style={{ backgroundColor: tokens.colors.surfaceBlush }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 48, alignItems: 'center', marginBottom: 48 }}
          className="results-two-col"
        >
          <div>
            <p style={{
              fontSize: tokens.typography.scale.xs,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: tokens.colors.foregroundMuted,
              marginBottom: 16,
            }}>
              Cortisol & stress
            </p>
            <h2 style={{
              fontSize: 'clamp(28px, 3vw, 42px)',
              color: tokens.colors.foreground,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
            }}>
              Your stress & cortisol load
            </h2>
          </div>
          <div className="section-illus-right" style={{ display: 'flex', justifyContent: 'center', opacity: 0.55 }}>
            <div style={{ width: 100, height: 100 }}>
              <IllustrationBreathRings />
            </div>
          </div>
        </div>

        {intro && (
          <p style={{
            fontSize: tokens.typography.scale.lg,
            color: tokens.colors.foreground,
            lineHeight: 1.7,
            marginBottom: 36,
            maxWidth: 720,
          }}>
            {intro}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {tips.map((tip, i) => (
            <div key={i} style={{
              backgroundColor: 'rgba(255,255,255,0.6)',
              borderRadius: 14,
              padding: '22px 24px 28px',
              border: `1px solid ${tokens.colors.border}`,
              display: 'flex',
              flexDirection: 'column',
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: tokens.colors.foregroundMuted,
                opacity: 0.5,
                marginBottom: 10,
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {tip.title && (
                <h4 style={{ color: tokens.colors.foreground, marginBottom: 8, lineHeight: 1.3 }}>
                  {tip.title}
                </h4>
              )}
              <p style={{ fontSize: tokens.typography.scale.base, color: tokens.colors.foreground, lineHeight: 1.65 }}>
                {tip.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// Sleep & Recovery section
// =============================================================================

function IllustrationNightSky() {
  return (
    <svg viewBox="0 0 260 280" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Large crescent moon */}
      <path d="M155 44 C129 46 107 70 105 96 C103 122 120 144 146 150 C126 157 98 143 86 122 C74 101 80 72 98 58 C112 46 136 42 155 44Z"
        stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      {/* Moon glow rings */}
      <ellipse cx="126" cy="97" rx="54" ry="54" stroke="white" strokeWidth="0.5" fill="none" opacity="0.07" />
      <ellipse cx="126" cy="97" rx="72" ry="72" stroke="white" strokeWidth="0.3" fill="none" opacity="0.04" />
      {/* Stars — varied sizes */}
      <circle cx="38"  cy="30"  r="2.2" fill="white" opacity="0.65" />
      <circle cx="66"  cy="16"  r="1.5" fill="white" opacity="0.5" />
      <circle cx="22"  cy="70"  r="1.8" fill="white" opacity="0.45" />
      <circle cx="200" cy="28"  r="1.5" fill="white" opacity="0.55" />
      <circle cx="222" cy="52"  r="1"   fill="white" opacity="0.4" />
      <circle cx="206" cy="112" r="1.8" fill="white" opacity="0.5" />
      <circle cx="186" cy="174" r="1"   fill="white" opacity="0.35" />
      <circle cx="58"  cy="162" r="1"   fill="white" opacity="0.3" />
      <circle cx="28"  cy="132" r="1.5" fill="white" opacity="0.4" />
      <circle cx="244" cy="82"  r="1"   fill="white" opacity="0.35" />
      <circle cx="78"  cy="214" r="1.2" fill="white" opacity="0.25" />
      <circle cx="208" cy="202" r="1.5" fill="white" opacity="0.3" />
      <circle cx="170" cy="20"  r="1"   fill="white" opacity="0.4" />
      <circle cx="50"  cy="100" r="1"   fill="white" opacity="0.3" />
      <circle cx="88"  cy="26"  r="1.2" fill="white" opacity="0.42" />
      {/* 4-pointed sparkle */}
      <path d="M55 55 L57.5 62 L64 64.5 L57.5 67 L55 74 L52.5 67 L46 64.5 L52.5 62 Z"
        stroke="white" strokeWidth="0.8" fill="none" opacity="0.45" />
      {/* Small sparkle */}
      <path d="M200 155 L201 158 L204 159 L201 160 L200 163 L199 160 L196 159 L199 158 Z"
        stroke="white" strokeWidth="0.6" fill="none" opacity="0.35" />
      {/* Constellation lines */}
      <line x1="38" y1="30" x2="66" y2="16" stroke="white" strokeWidth="0.4" opacity="0.18" />
      <line x1="66" y1="16" x2="88" y2="26" stroke="white" strokeWidth="0.4" opacity="0.18" />
      {/* Shooting star */}
      <line x1="182" y1="40" x2="206" y2="25" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.38" />
      <line x1="176" y1="44" x2="182" y2="40" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.2" />
      {/* Horizon */}
      <line x1="20" y1="252" x2="240" y2="252" stroke="white" strokeWidth="0.5" opacity="0.1" strokeDasharray="3 7" />
    </svg>
  )
}

function SleepIconTemp() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <line x1="14" y1="4" x2="14" y2="16" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="14" cy="20" r="3.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" />
      <line x1="10.5" y1="9"   x2="8.5" y2="9"   stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round" />
      <line x1="10.5" y1="12.5" x2="8.5" y2="12.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function SleepIconSunrise() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M7 18 C7 14.1 10.1 11 14 11 C17.9 11 21 14.1 21 18"
        stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="14" y1="7"  x2="14" y2="5"      stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="19.7" y1="9.3" x2="21.1" y2="7.9" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="8.3"  y1="9.3" x2="6.9"  y2="7.9" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="5" y1="18" x2="23" y2="18" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function SleepIconBreath() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M3 14 C5.5 14 5.5 7 9 7 C12.5 7 12.5 21 16 21 C19.5 21 19.5 14 22.5 14 C24 14 25 14 25 14"
        stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function SleepIconMoon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M19 6 C13.5 7 10 12 11 17.5 C12 23 17.5 26 23 24 C17.5 26.5 11 23 8.5 17 C6 11 9 5.5 14.5 4 C16 3.5 18 4.5 19 6Z"
        stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <circle cx="22" cy="9"  r="1.5" fill="rgba(255,255,255,0.28)" />
      <circle cx="24" cy="15" r="1"   fill="rgba(255,255,255,0.2)" />
    </svg>
  )
}

function SleepSection({ content }: { content: string }) {
  const tips = content
    .split(/\n+/)
    .map((line) => {
      const match = line.match(/^\*\*(.+?)\*\*[:\s]+(.+)$/)
      if (match) return { title: match[1].trim(), body: match[2].trim() }
      const fallback = line.trim().replace(/^[-•]\s*/, '')
      return fallback.length > 20 ? { title: '', body: fallback } : null
    })
    .filter(Boolean) as { title: string; body: string }[]

  const cardIcons = [<SleepIconTemp key="temp" />, <SleepIconSunrise key="sun" />, <SleepIconBreath key="breath" />, <SleepIconMoon key="moon" />]

  return (
    <section style={{ backgroundColor: FOREST_GREEN }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>

        {/* Header: text left (desktop) / top (mobile), illustration right (desktop) / above text (mobile) */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 48, alignItems: 'center', marginBottom: 52 }}
          className="results-two-col"
        >
          <div>
            <p style={{
              fontSize: tokens.typography.scale.xs,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 16,
            }}>
              Recovery
            </p>
            <h2 style={{
              fontSize: 'clamp(28px, 3vw, 42px)',
              fontWeight: 700,
              color: 'white',
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
            }}>
              Your sleep & recovery
            </h2>
          </div>
          <div className="section-illus-right" style={{ display: 'flex', justifyContent: 'center', opacity: 0.75 }}>
            <div style={{ width: 120, height: 130 }}>
              <IllustrationNightSky />
            </div>
          </div>
        </div>

        {/* Tip cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {tips.map((tip, i) => (
            <div key={i} style={{
              backgroundColor: 'rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '22px 24px 28px',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}>
              {/* Number + icon */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  color: 'rgba(255,255,255,0.3)',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>{cardIcons[i % cardIcons.length]}</div>
              </div>
              {tip.title && (
                <h4 style={{
                  color: 'white',
                  marginBottom: 8,
                  lineHeight: 1.3,
                }}>
                  {tip.title}
                </h4>
              )}
              <p style={{
                fontSize: tokens.typography.scale.base,
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.7,
              }}>
                {tip.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// Email gate — full-width section
// =============================================================================

function EmailGate({ onUnlock }: { onUnlock: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) { setFieldError('Please enter a valid email.'); return }
    setFieldError('')
    setSubmitting(true)
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          quizAnswers: JSON.parse(sessionStorage.getItem('quizAnswers') ?? '{}'),
        }),
      })
    } catch {}
    localStorage.setItem('mm_email_captured', '1')
    setSubmitting(false)
    onUnlock()
  }

  const handleSkip = () => {
    localStorage.setItem('mm_email_captured', '1')
    onUnlock()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    fontSize: tokens.typography.scale.base,
    borderRadius: tokens.radius.input,
    border: 'none',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <section style={{ backgroundColor: FOREST_GREEN }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }} className="results-two-col">
        <div>
          <p style={{ fontSize: tokens.typography.scale.xs, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
            Almost there
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', color: 'white', lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 20 }}>
            Your plan is ready
          </h2>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ marginBottom: 14, opacity: 0.6 }}>
              {/* Stem */}
              <line x1="16" y1="28" x2="16" y2="14" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              {/* Left leaf */}
              <path d="M16 20 C12 18 8 14 10 10 C12 8 16 12 16 16" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {/* Right leaf */}
              <path d="M16 18 C20 16 24 12 22 8 C20 6 16 10 16 14" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {/* Top sprout */}
              <path d="M16 14 C16 10 14 7 16 5 C18 7 16 10 16 14" stroke="white" strokeWidth="1.1" fill="none" strokeLinecap="round" />
            </svg>
            <p style={{ fontSize: tokens.typography.scale.base, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
              Menopause Movement is a work in progress. If you want to share what resonated, what felt missing, or what could be clearer, leave your email and I'll reach out. Your input will directly shape where this goes next.
            </p>
          </div>
          <p style={{ fontSize: tokens.typography.scale.base, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            Your data is private. I will never sell or share it.
          </p>
        </div>
        <div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" placeholder="First name (optional)" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <input type="email" placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            {fieldError && (
              <p style={{ fontSize: tokens.typography.scale.xs, color: tokens.colors.warning }}>{fieldError}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: 'white',
                color: FOREST_GREEN,
                padding: '16px',
                borderRadius: tokens.radius.pill,
                fontSize: tokens.typography.scale.base,
                fontWeight: 700,
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                marginTop: 4,
              }}
            >
              {submitting ? 'One moment…' : 'See my full plan →'}
            </button>
          </form>
          <button
            onClick={handleSkip}
            style={{ display: 'block', width: '100%', marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: tokens.typography.scale.sm, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}
          >
            Skip for now, just show me my plan
          </button>
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// Loading
// =============================================================================

function LoadingScreen({ isComplete }: { isComplete: boolean }) {
  const lines = ['Reading your profile', 'Applying exercise science', 'Building your weekly plan', 'Personalizing your recommendations']
  const [done, setDone] = useState<Set<number>>(new Set())

  useEffect(() => {
    const mark = (i: number) => setDone(prev => { const next = new Set(prev); next.add(i); return next })
    const timers = [
      setTimeout(() => mark(0), 400),
      setTimeout(() => mark(1), 900),
      setTimeout(() => mark(2), 1500),
      setTimeout(() => mark(3), 2200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (!isComplete) return
    const t = setTimeout(() => setDone(new Set([0, 1, 2, 3])), 80)
    return () => clearTimeout(t)
  }, [isComplete])

  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: FOREST_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        {lines.map((line, i) => (
          <motion.div
            key={line}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.25, duration: 0.2 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}
          >
            <div style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AnimatePresence mode="wait">
                {done.has(i) ? (
                  <motion.svg
                    key="check"
                    width="18" height="18" viewBox="0 0 18 18" fill="none"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 18, duration: 0.11 }}
                  >
                    <motion.circle
                      cx="9" cy="9" r="7.5"
                      stroke={tokens.colors.success}
                      strokeWidth="1.4"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.16 }}
                    />
                    <motion.path
                      d="M5.5 9 L8 11.5 L12.5 6.5"
                      stroke={tokens.colors.success}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.11, delay: 0.1 }}
                    />
                  </motion.svg>
                ) : (
                  <motion.div
                    key="dot"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    exit={{ scale: 0, opacity: 0, transition: { duration: 0.08 } }}
                    transition={{ repeat: Infinity, duration: 0.75, delay: i * 0.15 }}
                    style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: tokens.colors.success }}
                  />
                )}
              </AnimatePresence>
            </div>
            <motion.p
              animate={{ color: done.has(i) ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.65)' }}
              transition={{ duration: 0.15 }}
              style={{ fontSize: tokens.typography.scale.sm }}
            >
              {line}
            </motion.p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// =============================================================================
// Page
// =============================================================================

function hexRgb(hex: string) {
  return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) }
}

const PDF_DAY_CONFIG: Record<string, { bg: string; dot: string; label: string }> = {
  strength: { bg: '#D6DDD0', dot: '#2E5E3E', label: 'Strength' },
  walk:     { bg: '#DAE4EE', dot: '#3A6080', label: 'Walk' },
  rest:     { bg: '#EDEAE3', dot: '#1A1A1A', label: 'Rest' },
  optional: { bg: '#EDEAE3', dot: '#6B6B6B', label: 'Optional' },
  other:    { bg: '#EDEAE3', dot: '#6B6B6B', label: 'Active' },
}

function downloadPDF(sections: Section[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 44
  const W = pageW - M * 2
  let y = M

  const guard = (h: number) => { if (y + h > pageH - M - 28) { doc.addPage(); y = M } }

  type RGB = [number, number, number]
  const f = (r: number, g: number, b: number) => doc.setFillColor(r, g, b)
  const d = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b)
  const t = (r: number, g: number, b: number) => doc.setTextColor(r, g, b)
  const card = (x: number, cy: number, w: number, h: number, bg: RGB) => {
    f(...bg); doc.roundedRect(x, cy, w, h, 6, 6, 'F')
  }

  // ── Header bar ──────────────────────────────────────────────────────────────
  f(27, 45, 27); doc.rect(0, 0, pageW, 58, 'F')
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); t(255, 255, 255)
  doc.text('Menopause Movement', M, 30)
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); t(150, 200, 150)
  doc.text('Your personalized movement plan', pageW - M, 30, { align: 'right' })
  doc.setFontSize(7.5); t(110, 160, 110)
  doc.text('Based on research by Dr. Stacy Sims, Dr. Mary Claire Haver & Dr. Vonda Wright', M, 46)
  y = 74

  // ── Section divider label ────────────────────────────────────────────────────
  const sectionLabel = (heading: string) => {
    y += 10  // breathing room before every section
    guard(60)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); t(27, 45, 27)
    doc.text(heading, M, y + 16)
    y += 30
    d(214, 221, 208); doc.setLineWidth(0.5)
    doc.line(M, y, M + W, y)
    y += 20
  }

  // ── Key/value line parser (shared by protein + sleep) ───────────────────────
  const parseKV = (content: string) =>
    content.split(/\n+/)
      .map((line: string) => { const m = line.match(/^\*\*(.+?)\*\*[:\s]+(.+)$/); return m ? { title: m[1].trim(), body: m[2].trim() } : null })
      .filter(Boolean) as { title: string; body: string }[]

  // ── 2-column tip card renderer ───────────────────────────────────────────────
  const twoColCards = (
    tips: { title: string; body: string }[],
    bgFn: (i: number) => RGB,
    titleColor: RGB,
    bodyColor: RGB,
    hasBorder: boolean,
    noGuard = false,  // pass true when a background panel is pre-drawn above
  ) => {
    const gap = 10; const cW = (W - gap) / 2; const PAD = 14
    for (let i = 0; i < tips.length; i += 2) {
      const left = tips[i]; const right = tips[i + 1]
      const lL = doc.splitTextToSize(left.body, cW - PAD * 2)
      const rL = right ? doc.splitTextToSize(right.body, cW - PAD * 2) : []
      const cH = Math.max(
        PAD + 14 + 8 + lL.length * 12 + PAD,
        right ? PAD + 14 + 8 + rL.length * 12 + PAD : 0,
        56
      )
      if (!noGuard) guard(cH + gap)
      ;([[left, M, lL, i], right ? [right, M + cW + gap, rL, i + 1] : null] as const).forEach((slot) => {
        if (!slot) return
        const [tip, x, lines] = slot as [{ title: string; body: string }, number, string[], number]
        card(x, y, cW, cH, bgFn(i))
        if (hasBorder) { d(217, 213, 206); doc.setLineWidth(0.4); doc.roundedRect(x, y, cW, cH, 6, 6, 'S') }
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); t(...titleColor)
        doc.text(tip.title, x + PAD, y + PAD + 10)
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); t(...bodyColor)
        doc.text(lines, x + PAD, y + PAD + 22)
      })
      y += cH + gap
    }
    y += 10
  }

  // ══════════════════════════════════════════════════════════════════════════════
  for (const section of sections) {
    sectionLabel(section.heading)

    // ── YOUR WEEKLY PLAN ──────────────────────────────────────────────────────
    if (section.heading === 'Your Weekly Plan') {
      const days = parseDayEntries(section.content)
      for (const entry of days) {
        const cfg = PDF_DAY_CONFIG[entry.type] ?? PDF_DAY_CONFIG.other
        const bg = hexRgb(cfg.bg); const dot = hexRgb(cfg.dot)
        const bgRgb: RGB = [bg.r, bg.g, bg.b]
        const dotRgb: RGB = [dot.r, dot.g, dot.b]
        const PAD = 16
        const textW = W - PAD * 2

        // Format activity text — for strength days show exercises as bullets
        let actLines: string[]
        if (entry.type === 'strength') {
          const parts = entry.activity.split(/\s*•\s*/)
          const titleFull = parts[0].trim()
          const subtitleM = titleFull.match(/[—–-]\s*(.+)/)
          const subtitle = subtitleM ? subtitleM[1].trim() : titleFull
          const names = parts.slice(1)
            .map((p: string) => p.match(/^(.+?)\s*[—–-]/)?.[1]?.trim())
            .filter(Boolean) as string[]
          const nameLines = names.map((n) => `• ${n}`)
          actLines = [
            ...doc.splitTextToSize(subtitle, textW),
            '',
            ...nameLines.flatMap((nl) => doc.splitTextToSize(nl, textW - 8)),
          ]
        } else {
          const sentences = formatActivitySentences(entry.activity)
          actLines = sentences.flatMap((s, si) => {
            const wrapped = doc.splitTextToSize(s, textW)
            return si < sentences.length - 1 ? [...wrapped, ''] : wrapped
          })
        }

        const headerH = 34
        // Count non-empty lines only for height, but keep blanks for spacing
        const nonBlank = actLines.filter((l) => l !== '').length
        const cardH = headerH + nonBlank * 13 + (actLines.length - nonBlank) * 6 + PAD + 4
        guard(cardH + 8)

        // Card
        card(M, y, W, cardH, bgRgb)

        // Day name
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); t(30, 30, 30)
        doc.text(entry.day, M + PAD, y + 22)

        // Type pill (right-aligned)
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); t(...dotRgb)
        const pillLabel = cfg.label.toUpperCase()
        const pillW = doc.getTextWidth(pillLabel) + 14
        const pillX = M + W - PAD - pillW
        f(255, 255, 255); doc.roundedRect(pillX, y + 12, pillW, 14, 3, 3, 'F')
        doc.text(pillLabel, pillX + pillW / 2, y + 21.5, { align: 'center' })

        // Separator
        d(dot.r - 10 < 0 ? 0 : dot.r - 10, dot.g - 10 < 0 ? 0 : dot.g - 10, dot.b - 10 < 0 ? 0 : dot.b - 10)
        doc.setLineWidth(0.3)
        doc.line(M + PAD, y + headerH - 2, M + W - PAD, y + headerH - 2)

        // Activity text — render blank lines as small gaps
        doc.setFont('helvetica', 'normal'); t(30, 30, 30)
        let ty = y + headerH + 10
        for (const line of actLines) {
          if (line === '') { ty += 4; continue }
          const isBullet = line.startsWith('•')
          doc.setFontSize(isBullet ? 8.5 : 9)
          doc.text(line, M + PAD + (isBullet ? 4 : 0), ty)
          ty += isBullet ? 12 : 13
        }

        y += cardH + 6
      }
      y += 14

    // ── YOUR 4-WEEK PROGRESSION ───────────────────────────────────────────────
    } else if (section.heading === 'Your 4-Week Progression') {
      const progWeeks = section.content
        .split(/\n+/)
        .map((line: string) => { const m = line.match(/^\*\*Week\s*(\d)\s*[—–-]\s*(.+?)\*\*[:\s]+(.+)$/); return m ? { num: m[1], title: m[2].trim(), body: m[3].trim() } : null })
        .filter(Boolean) as { num: string; title: string; body: string }[]

      const wBgs: RGB[] = [[214, 221, 208], [218, 228, 238], [232, 221, 216], [237, 234, 227]]
      const PAD = 16; const numColW = 56; const textW = W - PAD * 2 - numColW

      for (let i = 0; i < progWeeks.length; i++) {
        const wk = progWeeks[i]
        const titleLines = doc.splitTextToSize(wk.title, textW)
        const bodyLines = doc.splitTextToSize(wk.body, textW)
        const cH = Math.max(PAD + titleLines.length * 14 + 6 + bodyLines.length * 12 + PAD, 64)
        guard(cH + 8)

        card(M, y, W, cH, wBgs[i % 4])

        // Week number
        doc.setFontSize(28); doc.setFont('helvetica', 'bold'); t(30, 30, 30)
        doc.text(wk.num, M + PAD, y + cH / 2 + 10)
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); t(120, 120, 120)
        doc.text('WK', M + PAD + doc.getTextWidth(wk.num) + 4, y + cH / 2)

        // Vertical separator
        d(200, 200, 196); doc.setLineWidth(0.4)
        doc.line(M + PAD + numColW - 8, y + PAD, M + PAD + numColW - 8, y + cH - PAD)

        const tx = M + PAD + numColW
        doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); t(30, 30, 30)
        doc.text(titleLines, tx, y + PAD + 10)
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); t(90, 90, 90)
        doc.text(bodyLines, tx, y + PAD + 10 + titleLines.length * 14 + 6)

        y += cH + 8
      }
      y += 10

    // ── YOUR PROTEIN TARGET ───────────────────────────────────────────────────
    } else if (section.heading === 'Your Protein Target') {
      const { display } = extractProteinNumber(section.content)
      if (display) {
        guard(80)
        card(M, y, W, 70, [214, 221, 208])
        doc.setFontSize(44); doc.setFont('helvetica', 'bold'); t(27, 45, 27)
        doc.text(display, M + 20, y + 48)
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); t(70, 100, 70)
        doc.text('PER DAY', M + 20, y + 62)
        y += 80
      }
      twoColCards(
        parseKV(section.content),
        () => [255, 255, 255],
        [30, 30, 30],
        [90, 90, 90],
        true,
      )

    // ── YOUR STRESS & CORTISOL ───────────────────────────────────────────────
    } else if (section.heading === 'Your Stress & Cortisol') {
      const introLine = section.content
        .split(/\n+/)
        .find((l: string) => !l.startsWith('**') && !l.startsWith('-') && l.length > 20)
        ?.trim().replace(/\*\*/g, '') ?? ''
      const tips = parseKV(section.content)

      const gap = 10; const cW = (W - gap) / 2; const PAD = 14
      const introLines = introLine ? doc.splitTextToSize(introLine, W) : []
      const introH = introLines.length > 0 ? introLines.length * 13 + 22 : 0

      let panelH = 0
      for (let i = 0; i < tips.length; i += 2) {
        const l = tips[i]; const r = tips[i + 1]
        const lL = doc.splitTextToSize(l.body, cW - PAD * 2)
        const rL = r ? doc.splitTextToSize(r.body, cW - PAD * 2) : []
        panelH += Math.max(PAD + 14 + 8 + lL.length * 12 + PAD, r ? PAD + 14 + 8 + rL.length * 12 + PAD : 0, 56) + gap
      }

      // Single guard for the entire section so the pre-drawn panel and cards always stay together
      guard(introH + panelH + 36)

      if (introLines.length > 0) {
        doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); t(40, 40, 40)
        doc.text(introLines, M, y)
        y += introH
      }

      // panelH + 30 ensures content (panelH + 10 from twoColCards) sits inside with 10pt bottom padding
      f(232, 221, 216); doc.roundedRect(M - 16, y - 14, W + 32, panelH + 30, 8, 8, 'F')
      twoColCards(tips, () => [245, 238, 234], [60, 40, 35], [100, 80, 75], false, true)
      y += 14

    // ── YOUR SLEEP & RECOVERY ─────────────────────────────────────────────────
    } else if (section.heading === 'Your Sleep & Recovery') {
      const tips = parseKV(section.content)
      const gap = 10; const cW = (W - gap) / 2; const PAD = 14
      let panelH = 0
      for (let i = 0; i < tips.length; i += 2) {
        const l = tips[i]; const r = tips[i + 1]
        const lL = doc.splitTextToSize(l.body, cW - PAD * 2)
        const rL = r ? doc.splitTextToSize(r.body, cW - PAD * 2) : []
        panelH += Math.max(PAD + 14 + 8 + lL.length * 12 + PAD, r ? PAD + 14 + 8 + rL.length * 12 + PAD : 0, 56) + gap
      }
      guard(panelH + 36)
      f(27, 45, 27); doc.roundedRect(M - 16, y - 14, W + 32, panelH + 30, 8, 8, 'F')
      twoColCards(
        tips,
        () => [45, 68, 45],
        [220, 245, 220],
        [170, 205, 170],
        false,
        true,
      )
      y += 14

    // ── ALL OTHER SECTIONS ────────────────────────────────────────────────────
    } else {
      const PAD = 20; const textW = W - PAD * 2
      const cleaned = section.content
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/^[•\-]\s*/gm, '• ')
        .replace(/\n{3,}/g, '\n\n')
      for (const para of cleaned.split(/\n\n+/)) {
        if (!para.trim()) continue
        const lines = doc.splitTextToSize(para.trim(), textW)
        guard(lines.length * 13 + 8)
        doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); t(40, 40, 40)
        doc.text(lines, M, y)
        y += lines.length * 13 + 10
      }
      y += 14
    }
  }

  // ── Page footers ─────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    d(217, 213, 206); doc.setLineWidth(0.4)
    doc.line(M, pageH - 28, M + W, pageH - 28)
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); t(180, 180, 180)
    doc.text('menopausemovement.com', M, pageH - 16)
    doc.text(`${i} / ${totalPages}`, pageW - M, pageH - 16, { align: 'right' })
  }

  doc.save('menopause-movement-plan.pdf')
}

export default function ResultsPage() {
  const router = useRouter()
  const [streamedText, setStreamedText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showLoader, setShowLoader] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailUnlocked, setEmailUnlocked] = useState(false)
  const [minWaitDone, setMinWaitDone] = useState(false)
  const [streamComplete, setStreamComplete] = useState(false)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (localStorage.getItem('mm_email_captured') === '1') setEmailUnlocked(true)
  }, [])

  // 1.5 s minimum — loader never flashes away instantly
  useEffect(() => {
    const t = setTimeout(() => setMinWaitDone(true), 1500)
    return () => clearTimeout(t)
  }, [])

  // 8 s hard cap — dismiss loader so skeletons show if API is slow
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 8000)
    return () => clearTimeout(t)
  }, [])

  // Dismiss once min wait is done and stream is complete
  useEffect(() => {
    if (minWaitDone && streamComplete) setIsLoading(false)
  }, [minWaitDone, streamComplete])

  // Also dismiss once min wait is done and first section content has arrived
  const sections = parseSections(streamedText)
  useEffect(() => {
    if (minWaitDone && sections.length > 0) setIsLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minWaitDone, sections.length])

  // Stable dismissal — fires 200 ms after isLoading flips false
  useEffect(() => {
    if (isLoading) return
    const t = setTimeout(() => setShowLoader(false), 200)
    return () => clearTimeout(t)
  }, [isLoading])

  // ── Fetch ────────────────────────────────────────────────────────────────────
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
        if (!response.ok || !response.body) throw new Error('Failed')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        let flushTimer: ReturnType<typeof setTimeout> | null = null
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          if (!flushTimer) {
            flushTimer = setTimeout(() => { setStreamedText(accumulated); flushTimer = null }, 80)
          }
        }
        if (flushTimer) clearTimeout(flushTimer)
        setStreamedText(accumulated)
        setStreamComplete(true)
      } catch {
        setError('Something went wrong. Please try again.')
        setStreamComplete(true)
        setMinWaitDone(true)
      }
    }

    fetchPlan()
  }, [router])

  const get = (h: string) => sections.find((s) => s.heading === h)

  const startingPoint = get('Your Starting Point')
  const why = get('Why This Is Happening')
  const weekly = get('Your Weekly Plan')
  const firstWeek = get('Your First Week Focus')
  const progression = get('Your 4-Week Progression')
  const protein = get('Your Protein Target')
  const cortisol = get('Your Stress & Cortisol')
  const sleep = get('Your Sleep & Recovery')

  // Hold the weekly skeleton until all 7 days are parsed, or fall back to
  // showing whatever is there once the stream finishes.
  const weeklyDayCount = weekly ? parseDayEntries(weekly.content).length : 0
  const weeklyReady = weeklyDayCount >= 7 || (streamComplete && !!weekly)


  return (
    <>
      <AnimatePresence>
        {showLoader && (
          <LoadingScreen
            key="loading"
            isComplete={!isLoading}
          />
        )}
      </AnimatePresence>

      {!showLoader && (
        <div>
          {error ? (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', backgroundColor: tokens.colors.background }}>
              <p style={{ color: tokens.colors.destructive, marginBottom: 16 }}>{error}</p>
              <button onClick={() => router.push('/quiz')} style={{ backgroundColor: tokens.colors.foreground, color: 'white', borderRadius: tokens.radius.pill, padding: '12px 24px', fontSize: tokens.typography.scale.sm, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Try again
              </button>
            </div>
          ) : (
          <div style={{ backgroundColor: tokens.colors.background }}>
      {startingPoint ? (
        <><ProfileBanner /><HeroSection content={startingPoint.content} /></>
      ) : (
        <SkHero />
      )}

      {why ? <FadeIn><WhySection content={why.content} /></FadeIn> : <SkWhy />}

      {why && !emailUnlocked && (
        <FadeIn><EmailGate onUnlock={() => setEmailUnlocked(true)} /></FadeIn>
      )}

      {emailUnlocked && (
        <>
          {weeklyReady ? <FadeIn><WeeklySection content={weekly!.content} /></FadeIn> : <SkWeekly />}
          {weeklyReady ? <FadeIn><StrengthSection content={weekly!.content} /></FadeIn> : <SkStrength />}
          {firstWeek ? <FadeIn><FirstWeekSection content={firstWeek.content} /></FadeIn> : <SkFirstWeek />}
          {progression ? <FadeIn><ProgressionSection content={progression.content} /></FadeIn> : <SkProgression />}
          {protein ? <FadeIn><ProteinSection content={protein.content} /></FadeIn> : <SkProtein />}
          {cortisol ? <FadeIn><CortisolSection content={cortisol.content} /></FadeIn> : <SkCortisol />}
          {sleep ? <FadeIn><SleepSection content={sleep.content} /></FadeIn> : <SkSleep />}
        </>
      )}

      {emailUnlocked && SECTION_HEADINGS.every(h => get(h)) && (
        <footer style={{ backgroundColor: tokens.colors.background, padding: '40px 32px', borderTop: `1px solid ${tokens.colors.border}` }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: tokens.typography.scale.xs, color: tokens.colors.foregroundMuted, maxWidth: 560, lineHeight: 1.6, marginBottom: 8 }}>
                Based on research by Dr. Stacy Sims, Dr. Mary Claire Haver, Dr. Vonda Wright, Dr. Gabrielle Lyon, Dr. Jen Gunter, Dr. Lisa Mosconi, ACE Fitness & The Menopause Society.
              </p>
              <p style={{ fontSize: tokens.typography.scale.xs, color: tokens.colors.foregroundMuted }}>
                For informational purposes only. Not medical advice.{' '}
                <a href="/privacy" style={{ color: tokens.colors.foregroundMuted, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Privacy Policy</a>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => downloadPDF(sections)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: FOREST_GREEN,
                  color: 'white',
                  border: 'none',
                  borderRadius: tokens.radius.pill,
                  padding: '10px 20px',
                  fontSize: tokens.typography.scale.sm,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M4 7l3 3 3-3M2 11h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Download results
              </button>
              <button onClick={() => router.push('/quiz')} style={{ fontSize: tokens.typography.scale.sm, color: tokens.colors.foregroundMuted, textDecoration: 'underline', textUnderlineOffset: '3px', background: 'none', border: 'none', cursor: 'pointer' }}>
                Retake the quiz
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
          )}
        </div>
      )}
    </>
  )
}
