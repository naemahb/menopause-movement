'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { QuizFormState, MedicalCondition } from './types'
import { calculateCortisolScore } from './scoring'

const initialFormState: QuizFormState = {
  stage: null,
  exerciseType: null,
  jointPain: null,
  energyLevel: null,
  sleepQuality: null,
  timeAvailable: null,
  equipment: null,
  primaryGoal: null,
  bodyFrustration: null,
  medicalConditions: [],
}

type QuizContextValue = {
  formState: QuizFormState
  updateForm: (updates: Partial<QuizFormState>) => void
  resetForm: () => void
  getCortisolScore: () => number
}

const QuizContext = createContext<QuizContextValue | null>(null)

export function QuizProvider({ children }: { children: ReactNode }) {
  const [formState, setFormState] = useState<QuizFormState>(initialFormState)

  const updateForm = useCallback((updates: Partial<QuizFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }))
  }, [])

  const resetForm = useCallback(() => {
    setFormState(initialFormState)
  }, [])

  const getCortisolScore = useCallback(() => {
    return calculateCortisolScore(formState)
  }, [formState])

  const value = useMemo(
    () => ({ formState, updateForm, resetForm, getCortisolScore }),
    [formState, updateForm, resetForm, getCortisolScore]
  )

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>
}

export function useQuiz() {
  const ctx = useContext(QuizContext)
  if (!ctx) throw new Error('useQuiz must be used within QuizProvider')
  return ctx
}
