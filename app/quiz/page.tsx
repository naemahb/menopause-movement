'use client'

import { useState, useCallback, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useQuiz } from '@/lib/QuizContext'
import { calculateCortisolScore } from '@/lib/scoring'
import { ProgressBar } from '@/components/quiz/ProgressBar'
import { SelectOption } from '@/components/quiz/SelectOption'
import { Chip } from '@/components/quiz/Chip'
import { ContinueButton } from '@/components/quiz/ContinueButton'
import { tokens } from '@/lib/tokens'
import type { MedicalCondition } from '@/lib/types'

const STEP_ORDER = [
  'stage',
  'exerciseType',
  'jointPain',
  'energyLevel',
  'sleepQuality',
  'timeAvailable',
  'equipment',
  'primaryGoal',
  'bodyFrustration',
  'medicalConditions',
] as const

type StepKey = (typeof STEP_ORDER)[number]

export default function QuizPage() {
  const router = useRouter()
  const { formState, updateForm, getCortisolScore } = useQuiz()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const currentStepKey = STEP_ORDER[currentStepIndex]
  const totalSteps = STEP_ORDER.length

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1)
    } else {
      router.push('/')
    }
  }, [currentStepIndex, router])

  const advance = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((i) => i + 1)
    } else {
      // Save to sessionStorage and go to results
      const cortisolScore = getCortisolScore()
      sessionStorage.setItem('quizAnswers', JSON.stringify({ ...formState, cortisolScore }))
      router.push('/results')
    }
  }, [currentStepIndex, totalSteps, formState, getCortisolScore, router])

  const advanceWithDelay = useCallback(
    (ms: number) => setTimeout(advance, ms),
    [advance]
  )

  // ==========================================================================
  // Step: Stage
  // ==========================================================================
  const renderStageStep = () => {
    const options = [
      { label: 'Perimenopause', value: 'perimenopause' as const, subtext: 'Still having periods, but irregular' },
      { label: 'Postmenopause', value: 'postmenopause' as const, subtext: 'No period for 12+ months' },
      { label: 'Not sure', value: 'not_sure' as const },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              subtext={'subtext' in opt ? opt.subtext : undefined}
              selected={formState.stage === opt.value}
              onSelect={() => { updateForm({ stage: opt.value }); advanceWithDelay(300) }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Exercise type
  // ==========================================================================
  const renderExerciseTypeStep = () => {
    const options = [
      { label: "I'm not exercising right now", value: 'not_exercising' as const },
      { label: 'Walking, yoga, or light movement only', value: 'walking_yoga' as const },
      { label: 'Group fitness or cardio-based classes', value: 'cardio_heavy' as const, subtext: 'e.g. OTF, spin, Zumba' },
      { label: 'Strength training focused', value: 'strength_focused' as const },
      { label: 'A mix of strength and cardio', value: 'mix' as const },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              subtext={'subtext' in opt ? opt.subtext : undefined}
              selected={formState.exerciseType === opt.value}
              onSelect={() => { updateForm({ exerciseType: opt.value }); advanceWithDelay(300) }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Joint pain
  // ==========================================================================
  const renderJointPainStep = () => {
    const options = [
      { label: 'No joint pain', value: 'none' as const },
      { label: 'Mild — some stiffness but it doesn\'t stop me', value: 'mild' as const },
      { label: 'Moderate — I modify workouts because of it', value: 'moderate' as const },
      { label: 'Significant — joint pain is a major barrier', value: 'significant' as const },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.jointPain === opt.value}
              onSelect={() => { updateForm({ jointPain: opt.value }); advanceWithDelay(300) }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Energy level
  // ==========================================================================
  const renderEnergyStep = () => {
    const options = [
      { label: 'Good — I feel like myself most days', value: 'good' as const },
      { label: 'Variable — some good days, some crashes', value: 'variable' as const },
      { label: 'Low — fatigue is a constant challenge', value: 'low' as const },
      { label: 'Exhausted — I\'m running on empty', value: 'exhausted' as const },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.energyLevel === opt.value}
              onSelect={() => { updateForm({ energyLevel: opt.value }); advanceWithDelay(300) }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Sleep quality
  // ==========================================================================
  const renderSleepStep = () => {
    const options = [
      { label: 'Good — 7+ hours, wake feeling rested', value: 'good' as const },
      { label: 'Interrupted — I wake up but can fall back asleep', value: 'interrupted' as const },
      { label: 'Poor — I rarely sleep through the night', value: 'poor' as const },
      { label: 'Very poor — sleep is a serious problem', value: 'very_poor' as const },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.sleepQuality === opt.value}
              onSelect={() => { updateForm({ sleepQuality: opt.value }); advanceWithDelay(300) }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Time available
  // ==========================================================================
  const renderTimeStep = () => {
    const options = [
      { label: 'Under 3 hours', value: 'under_3hr' as const, subtext: 'Minimum effective dose approach' },
      { label: '3–5 hours', value: '3_5hr' as const, subtext: 'Standard protocol' },
      { label: '5+ hours', value: '5hr_plus' as const, subtext: 'Full training week' },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              subtext={opt.subtext}
              selected={formState.timeAvailable === opt.value}
              onSelect={() => { updateForm({ timeAvailable: opt.value }); advanceWithDelay(300) }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Equipment
  // ==========================================================================
  const renderEquipmentStep = () => {
    const options = [
      { label: 'Full gym', value: 'full_gym' as const, subtext: 'Barbells, machines, cables' },
      { label: 'Home setup', value: 'home_dumbbells' as const, subtext: 'Dumbbells, maybe a bench' },
      { label: 'Minimal', value: 'minimal' as const, subtext: 'Resistance bands, bodyweight only' },
      { label: 'Walking / outdoor only', value: 'outdoor_only' as const },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              subtext={'subtext' in opt ? opt.subtext : undefined}
              selected={formState.equipment === opt.value}
              onSelect={() => { updateForm({ equipment: opt.value }); advanceWithDelay(300) }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Primary goal
  // ==========================================================================
  const renderGoalStep = () => {
    const options = [
      { label: 'Building strength and muscle', value: 'strength_muscle' as const },
      { label: 'Losing weight / changing body composition', value: 'weight_body_comp' as const },
      { label: 'More energy and better mood', value: 'energy_mood' as const },
      { label: 'Overall health and longevity', value: 'health_longevity' as const },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.primaryGoal === opt.value}
              onSelect={() => { updateForm({ primaryGoal: opt.value }); advanceWithDelay(300) }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Body frustration
  // ==========================================================================
  const renderFrustrationStep = () => {
    const options = [
      { label: 'Belly fat that won\'t budge despite working out', value: 'belly_fat' as const },
      { label: 'Loss of muscle tone even though I\'m active', value: 'muscle_tone_loss' as const },
      { label: 'Weight gain despite eating the same as before', value: 'weight_gain' as const },
      { label: 'I feel fine about my body — just want to stay healthy', value: 'feeling_fine' as const },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.bodyFrustration === opt.value}
              onSelect={() => { updateForm({ bodyFrustration: opt.value }); advanceWithDelay(300) }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Medical conditions (multi-select)
  // ==========================================================================
  const renderMedicalStep = () => {
    const options: { label: string; value: MedicalCondition; subtext?: string }[] = [
      { label: 'Thyroid condition', value: 'thyroid', subtext: 'Hypo or hyperthyroidism' },
      { label: 'Autoimmune disease', value: 'autoimmune' },
      { label: 'Chronic kidney disease (CKD)', value: 'ckd' },
      { label: 'Arthritis — knees', value: 'arthritis_knees' },
      { label: 'Arthritis — lower back / spine', value: 'arthritis_back' },
      { label: 'Arthritis — hips', value: 'arthritis_hips' },
      { label: 'Osteopenia or osteoporosis', value: 'osteopenia_osteoporosis' },
      { label: 'None of the above', value: 'none' },
    ]

    const selected = formState.medicalConditions
    const hasSelection = selected.length > 0

    const toggle = (value: MedicalCondition) => {
      if (value === 'none') {
        updateForm({ medicalConditions: ['none'] })
      } else {
        const next = selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected.filter((v) => v !== 'none'), value]
        updateForm({ medicalConditions: next })
      }
    }

    return (
      <>
        <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
          {options.map((opt, i) => (
            <Fragment key={opt.value}>
              {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
              <SelectOption
                label={opt.label}
                subtext={opt.subtext}
                selected={selected.includes(opt.value)}
                onSelect={() => toggle(opt.value)}
                multi
              />
            </Fragment>
          ))}
        </div>
        <div className="mt-6">
          <ContinueButton onClick={advance} disabled={!hasSelection} label="See my plan" />
        </div>
      </>
    )
  }

  // ==========================================================================
  // Step config
  // ==========================================================================
  const getStepConfig = (): { question: string; subtext?: string } => {
    const configs: Record<StepKey, { question: string; subtext?: string }> = {
      stage: { question: 'Where are you in your menopause journey?' },
      exerciseType: {
        question: 'What does your current exercise routine look like?',
        subtext: 'The type of exercise matters more than how often',
      },
      jointPain: { question: 'How would you describe your joint pain or physical discomfort?' },
      energyLevel: { question: 'How are your energy levels on most days?' },
      sleepQuality: { question: 'How is your sleep most nights?' },
      timeAvailable: {
        question: 'How much time can you realistically commit to exercise each week?',
        subtext: 'Be honest — plans that don\'t fit real life don\'t get followed',
      },
      equipment: { question: 'What equipment do you have access to?' },
      primaryGoal: { question: 'What matters most to you right now?' },
      bodyFrustration: {
        question: 'Is there a specific area that exercise hasn\'t seemed to fix?',
        subtext: 'Select the one that resonates most',
      },
      medicalConditions: {
        question: 'Do any of the following apply to you?',
        subtext: 'Select all that apply — this changes your actual plan, not just adds disclaimers',
      },
    }
    return configs[currentStepKey]
  }

  const getStepContent = () => {
    switch (currentStepKey) {
      case 'stage': return renderStageStep()
      case 'exerciseType': return renderExerciseTypeStep()
      case 'jointPain': return renderJointPainStep()
      case 'energyLevel': return renderEnergyStep()
      case 'sleepQuality': return renderSleepStep()
      case 'timeAvailable': return renderTimeStep()
      case 'equipment': return renderEquipmentStep()
      case 'primaryGoal': return renderGoalStep()
      case 'bodyFrustration': return renderFrustrationStep()
      case 'medicalConditions': return renderMedicalStep()
      default: return null
    }
  }

  const { question, subtext } = getStepConfig()

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: tokens.colors.background }}>
      <ProgressBar current={currentStepIndex + 1} total={totalSteps} />

      <div className="px-6 pt-4">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1"
          style={{ fontSize: tokens.typography.scale.sm, color: tokens.colors.foreground }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[480px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepKey}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <p
                className="mb-1"
                style={{
                  fontSize: tokens.typography.scale.xs,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: tokens.colors.foregroundMuted,
                }}
              >
                {currentStepIndex + 1} of {totalSteps}
              </p>
              <h1
                className="mb-2"
                style={{
                  fontSize: tokens.typography.scale.xl,
                  color: tokens.colors.foreground,
                  fontWeight: 600,
                  lineHeight: 1.25,
                }}
              >
                {question}
              </h1>
              {subtext && (
                <p
                  className="mb-6"
                  style={{ fontSize: tokens.typography.scale.sm, color: tokens.colors.foregroundMuted }}
                >
                  {subtext}
                </p>
              )}
              {!subtext && <div className="mb-6" />}
              {getStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
