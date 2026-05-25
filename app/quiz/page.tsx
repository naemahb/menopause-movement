'use client'

import { useState, useCallback, useMemo, useEffect, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useQuiz } from '@/lib/QuizContext'
import { ProgressBar } from '@/components/quiz/ProgressBar'
import { SelectOption } from '@/components/quiz/SelectOption'
import { ContinueButton } from '@/components/quiz/ContinueButton'
import { tokens } from '@/lib/tokens'
import type { MedicalCondition, BodyFrustration } from '@/lib/types'

const STEP_SECTION: Record<string, string> = {
  stage:            'Stage & Age',
  age:              'Stage & Age',
  menstrualStatus:  'Stage & Age',
  hrtStatus:        'Stage & Age',
  hotFlashSeverity: 'Symptoms',
  exerciseType:     'Symptoms',
  jointPain:        'Symptoms',
  stressLevel:      'Symptoms',
  energyLevel:      'Symptoms',
  sleepQuality:     'Symptoms',
  primaryGoal:      'Goal',
  bodyFrustration:  'Goal',
  timeAvailable:    'Setup',
  equipment:        'Setup',
  weightBracket:    'Health',
  dietaryPattern:   'Health',
  medicalConditions:'Health',
}

const STEP_ORDER = [
  'stage',
  'age',
  'menstrualStatus',   // skipped for postmenopause
  'hrtStatus',
  'hotFlashSeverity',
  'exerciseType',
  'jointPain',
  'stressLevel',
  'energyLevel',
  'sleepQuality',
  'timeAvailable',
  'equipment',
  'primaryGoal',
  'bodyFrustration',
  'weightBracket',
  'dietaryPattern',
  'medicalConditions',
] as const

type StepKey = (typeof STEP_ORDER)[number]

export default function QuizPage() {
  const router = useRouter()
  const { formState, updateForm, getCortisolScore } = useQuiz()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const currentStepKey = STEP_ORDER[currentStepIndex]

  // Steps that should be skipped based on current form state
  const skippedSteps = useMemo(() => {
    const skipped = new Set<StepKey>()
    if (formState.stage === 'postmenopause') skipped.add('menstrualStatus')
    return skipped
  }, [formState.stage])

  const effectiveSteps = useMemo(
    () => STEP_ORDER.filter((s) => !skippedSteps.has(s)),
    [skippedSteps]
  )

  const effectiveTotal = effectiveSteps.length
  const effectiveCurrentStep = effectiveSteps.indexOf(currentStepKey) + 1

  const advance = useCallback(() => {
    let nextIndex = currentStepIndex + 1
    while (nextIndex < STEP_ORDER.length && skippedSteps.has(STEP_ORDER[nextIndex])) {
      nextIndex++
    }
    if (nextIndex < STEP_ORDER.length) {
      setCurrentStepIndex(nextIndex)
    } else {
      const cortisolScore = getCortisolScore()
      sessionStorage.setItem('quizAnswers', JSON.stringify({ ...formState, cortisolScore }))
      router.push('/results')
    }
  }, [currentStepIndex, skippedSteps, formState, getCortisolScore, router])

  // Keep a stable ref so advanceWithDelay always calls the latest advance
  const advanceRef = useRef(advance)
  useEffect(() => { advanceRef.current = advance }, [advance])

  const advanceWithDelay = useCallback(
    (ms: number) => setTimeout(() => advanceRef.current(), ms),
    []
  )

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      let prevIndex = currentStepIndex - 1
      while (prevIndex > 0 && skippedSteps.has(STEP_ORDER[prevIndex])) {
        prevIndex--
      }
      setCurrentStepIndex(prevIndex)
    } else {
      router.push('/')
    }
  }, [currentStepIndex, skippedSteps, router])

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
              onSelect={() => {
                // Clear menstrualStatus when switching to postmenopause
                if (opt.value === 'postmenopause') {
                  updateForm({ stage: opt.value, menstrualStatus: null })
                } else {
                  updateForm({ stage: opt.value })
                }
                advanceWithDelay(300)
              }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Age
  // ==========================================================================
  const renderAgeStep = () => {
    const options = [
      { label: 'Under 45', value: 'under_45' as const },
      { label: '45–49', value: '45_49' as const },
      { label: '50–54', value: '50_54' as const },
      { label: '55–59', value: '55_59' as const },
      { label: '60 or older', value: '60_plus' as const },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.age === opt.value}
              onSelect={() => { updateForm({ age: opt.value }); advanceWithDelay(300) }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Menstrual status (skipped for postmenopause)
  // ==========================================================================
  const renderMenstrualStatusStep = () => {
    const options = [
      { label: 'Regular or close to regular', value: 'regular_or_near_regular' as const, subtext: 'Cycles are fairly predictable' },
      { label: 'Irregular', value: 'irregular' as const, subtext: 'Cycles are unpredictable or skipping months' },
      { label: 'Very infrequent', value: 'very_rare' as const, subtext: 'Fewer than 4 periods in the past year' },
      { label: 'No periods', value: 'none' as const, subtext: 'Haven\'t had a period in several months or more' },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              subtext={opt.subtext}
              selected={formState.menstrualStatus === opt.value}
              onSelect={() => { updateForm({ menstrualStatus: opt.value }); advanceWithDelay(300) }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: HRT status
  // ==========================================================================
  const renderHRTStep = () => {
    const options = [
      { label: 'Yes — I\'m currently on HRT', value: 'yes_current' as const, subtext: 'Patches, gel, pills, or pellets' },
      { label: 'No', value: 'no' as const },
      { label: 'Considering it or recently stopped', value: 'considering_or_stopped' as const },
      { label: 'Not sure what I\'m on', value: 'not_sure' as const, subtext: 'Taking something but unclear on type' },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              subtext={'subtext' in opt ? opt.subtext : undefined}
              selected={formState.hrtStatus === opt.value}
              onSelect={() => { updateForm({ hrtStatus: opt.value }); advanceWithDelay(300) }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Hot flash severity
  // ==========================================================================
  const renderHotFlashStep = () => {
    const options = [
      { label: 'None — no hot flashes or night sweats', value: 'none' as const },
      { label: 'Mild — occasional, manageable', value: 'mild' as const },
      { label: 'Moderate — affect my daily comfort or sleep', value: 'moderate' as const },
      { label: 'Severe — frequent and significantly disruptive', value: 'severe' as const },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.hotFlashSeverity === opt.value}
              onSelect={() => { updateForm({ hotFlashSeverity: opt.value }); advanceWithDelay(300) }}
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
      { label: "Mild — some stiffness but it doesn't stop me", value: 'mild' as const },
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
  // Step: Stress level
  // ==========================================================================
  const renderStressStep = () => {
    const options = [
      { label: 'Low — life feels generally manageable', value: 'low' as const },
      { label: 'Moderate — some stress but I cope well', value: 'moderate' as const },
      { label: "High — I'm dealing with a lot right now", value: 'high' as const },
      { label: 'Overwhelming — stress is constant and hard to manage', value: 'overwhelming' as const },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.stressLevel === opt.value}
              onSelect={() => { updateForm({ stressLevel: opt.value }); advanceWithDelay(300) }}
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
      { label: "Exhausted — I'm running on empty", value: 'exhausted' as const },
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
      { label: 'Home setup', value: 'home_dumbbells' as const, subtext: 'Dumbbells and/or kettlebells, maybe a bench' },
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
  // Step: Body frustration (multi-select)
  // ==========================================================================
  const renderFrustrationStep = () => {
    const options: { label: string; value: BodyFrustration }[] = [
      { label: "Belly fat that won't budge despite working out", value: 'belly_fat' },
      { label: "Loss of muscle tone even though I'm active", value: 'muscle_tone_loss' },
      { label: 'Weight gain despite eating the same as before', value: 'weight_gain' },
      { label: 'I feel fine about my body — just want to stay healthy', value: 'feeling_fine' },
    ]

    const selected = formState.bodyFrustration
    const hasSelection = selected.length > 0

    const toggle = (value: BodyFrustration) => {
      if (value === 'feeling_fine') {
        updateForm({ bodyFrustration: ['feeling_fine'] })
      } else {
        const next = selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected.filter((v) => v !== 'feeling_fine'), value]
        updateForm({ bodyFrustration: next })
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
                selected={selected.includes(opt.value)}
                onSelect={() => toggle(opt.value)}
                multi
              />
            </Fragment>
          ))}
        </div>
        <div className="mt-6">
          <ContinueButton onClick={advance} disabled={!hasSelection} label="Continue" />
        </div>
      </>
    )
  }

  // ==========================================================================
  // Step: Weight bracket
  // ==========================================================================
  const renderWeightStep = () => {
    const options = [
      { label: 'Under 140 lbs', value: 'under_140' as const },
      { label: '140–169 lbs', value: '140_169' as const },
      { label: '170–199 lbs', value: '170_199' as const },
      { label: '200+ lbs', value: '200_plus' as const },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.weightBracket === opt.value}
              onSelect={() => { updateForm({ weightBracket: opt.value }); advanceWithDelay(300) }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Dietary pattern
  // ==========================================================================
  const renderDietaryStep = () => {
    const options = [
      { label: 'I eat meat and dairy', value: 'omnivore' as const },
      { label: 'No meat, but I eat fish', value: 'pescatarian' as const },
      { label: 'Vegetarian — I eat dairy and/or eggs', value: 'vegetarian' as const },
      { label: 'Vegan — no animal products', value: 'vegan' as const },
    ]
    return (
      <div style={{ backgroundColor: 'white', borderRadius: tokens.radius.card, border: `1px solid ${tokens.colors.border}`, overflow: 'hidden' }}>
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.dietaryPattern === opt.value}
              onSelect={() => { updateForm({ dietaryPattern: opt.value }); advanceWithDelay(300) }}
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
      { label: 'High blood pressure (hypertension)', value: 'hypertension' },
      { label: 'Type 2 diabetes', value: 'diabetes' },
      { label: 'Pre-diabetes or insulin resistance', value: 'prediabetes' },
      { label: 'Thyroid condition', value: 'thyroid', subtext: 'Hypo or hyperthyroidism' },
      { label: 'Autoimmune disease', value: 'autoimmune' },
      { label: 'Arthritis — knees', value: 'arthritis_knees' },
      { label: 'Arthritis — lower back / spine', value: 'arthritis_back' },
      { label: 'Arthritis — hips', value: 'arthritis_hips' },
      { label: 'Arthritis — shoulders', value: 'arthritis_shoulders' },
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
      age: {
        question: 'How old are you?',
        subtext: 'Helps calibrate your bone density and training intensity recommendations',
      },
      menstrualStatus: { question: "What's your current cycle like?" },
      hrtStatus: {
        question: 'Are you currently on hormone therapy (HRT)?',
        subtext: 'Including patches, gels, pills, pellets, or vaginal estrogen',
      },
      hotFlashSeverity: {
        question: 'How would you describe your hot flashes and night sweats?',
      },
      exerciseType: {
        question: 'What does your current exercise routine look like?',
        subtext: 'The type of exercise matters more than how often',
      },
      jointPain: { question: 'How would you describe your joint pain or physical discomfort?' },
      stressLevel: {
        question: 'How would you describe your stress levels lately?',
        subtext: 'Stress raises cortisol just like exercise does — it shapes your whole plan',
      },
      energyLevel: { question: 'How are your energy levels on most days?' },
      sleepQuality: { question: 'How is your sleep most nights?' },
      timeAvailable: {
        question: 'How much time can you realistically commit to exercise each week?',
        subtext: "Be honest — plans that don't fit real life don't get followed",
      },
      equipment: { question: 'What equipment do you have access to?' },
      primaryGoal: { question: 'What matters most to you right now?' },
      bodyFrustration: {
        question: "Is there a specific area that exercise hasn't seemed to fix?",
        subtext: 'Select all that apply',
      },
      weightBracket: {
        question: 'Roughly what is your current weight?',
        subtext: 'Used only to calculate your daily protein target',
      },
      dietaryPattern: { question: 'How would you describe your diet?' },
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
      case 'age': return renderAgeStep()
      case 'menstrualStatus': return renderMenstrualStatusStep()
      case 'hrtStatus': return renderHRTStep()
      case 'hotFlashSeverity': return renderHotFlashStep()
      case 'exerciseType': return renderExerciseTypeStep()
      case 'jointPain': return renderJointPainStep()
      case 'stressLevel': return renderStressStep()
      case 'energyLevel': return renderEnergyStep()
      case 'sleepQuality': return renderSleepStep()
      case 'timeAvailable': return renderTimeStep()
      case 'equipment': return renderEquipmentStep()
      case 'primaryGoal': return renderGoalStep()
      case 'bodyFrustration': return renderFrustrationStep()
      case 'weightBracket': return renderWeightStep()
      case 'dietaryPattern': return renderDietaryStep()
      case 'medicalConditions': return renderMedicalStep()
      default: return null
    }
  }

  const { question, subtext } = getStepConfig()

  const section = STEP_SECTION[currentStepKey]

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: tokens.colors.background }}>
      <ProgressBar current={effectiveCurrentStep} total={effectiveTotal} />

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
              {/* Back + section heading */}
              <div style={{ marginBottom: 24 }}>
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-1"
                  style={{ fontSize: tokens.typography.scale.sm, color: tokens.colors.foregroundMuted, marginBottom: 16 }}
                >
                  <ArrowLeft size={15} />
                  Back
                </button>
                <p style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: tokens.colors.foregroundMuted,
                  marginBottom: 4,
                }}>
                  {section}
                </p>
                <p style={{
                  fontSize: tokens.typography.scale.xs,
                  fontWeight: 500,
                  color: tokens.colors.border,
                }}>
                  {effectiveCurrentStep} of {effectiveTotal}
                </p>
              </div>

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
