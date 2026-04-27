import type { QuizFormState } from './types'

export function calculateCortisolScore(form: QuizFormState): number {
  let score = 0

  // Q2: Exercise type
  if (form.exerciseType === 'cardio_heavy') score += 2

  // Q4: Energy level
  if (form.energyLevel === 'exhausted') score += 2
  else if (form.energyLevel === 'low') score += 1

  // Q5: Sleep quality
  if (form.sleepQuality === 'very_poor') score += 2
  else if (form.sleepQuality === 'poor') score += 1

  // Q9: Body frustration
  if (form.bodyFrustration === 'belly_fat') score += 2

  // Medical screener (max +2)
  const medicalConditions = form.medicalConditions
  let medicalScore = 0
  if (medicalConditions.includes('thyroid')) medicalScore += 1
  if (medicalConditions.includes('autoimmune')) medicalScore += 1
  if (medicalConditions.includes('ckd')) medicalScore += 1
  score += Math.min(medicalScore, 2)

  return Math.min(score, 10)
}

export function getCortisolRiskLevel(score: number): 'low' | 'moderate' | 'high' {
  if (score <= 2) return 'low'
  if (score <= 5) return 'moderate'
  return 'high'
}
