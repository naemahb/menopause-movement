import type { QuizFormState } from './types'

export function calculateCortisolScore(form: QuizFormState): number {
  let score = 0

  // Exercise type
  if (form.exerciseType === 'cardio_heavy') score += 2

  // Stress level — largest new signal for cortisol
  if (form.stressLevel === 'overwhelming') score += 3
  else if (form.stressLevel === 'high') score += 2
  else if (form.stressLevel === 'moderate') score += 1

  // Energy level
  if (form.energyLevel === 'exhausted') score += 2
  else if (form.energyLevel === 'low') score += 1

  // Sleep quality
  if (form.sleepQuality === 'very_poor') score += 2
  else if (form.sleepQuality === 'poor') score += 1

  // Hot flashes (vasomotor symptoms elevate cortisol and disrupt sleep)
  if (form.hotFlashSeverity === 'severe') score += 1

  // Body frustration (belly fat is a cortisol signal)
  if (form.bodyFrustration.includes('belly_fat')) score += 2

  // Medical screener (max +2)
  const medicalConditions = form.medicalConditions
  let medicalScore = 0
  if (medicalConditions.includes('thyroid')) medicalScore += 1
  if (medicalConditions.includes('autoimmune')) medicalScore += 1
  score += Math.min(medicalScore, 2)

  return Math.min(score, 10)
}

export function getCortisolRiskLevel(score: number): 'low' | 'moderate' | 'high' {
  if (score <= 2) return 'low'
  if (score <= 5) return 'moderate'
  return 'high'
}
