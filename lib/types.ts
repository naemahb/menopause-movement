export type MenopauseStage = 'perimenopause' | 'postmenopause' | 'not_sure'

export type ExerciseType =
  | 'not_exercising'
  | 'walking_yoga'
  | 'cardio_heavy'
  | 'strength_focused'
  | 'mix'

export type JointPain = 'none' | 'mild' | 'moderate' | 'significant'

export type EnergyLevel = 'good' | 'variable' | 'low' | 'exhausted'

export type SleepQuality = 'good' | 'interrupted' | 'poor' | 'very_poor'

export type TimeAvailable = 'under_3hr' | '3_5hr' | '5hr_plus'

export type Equipment = 'full_gym' | 'home_dumbbells' | 'minimal' | 'outdoor_only'

export type PrimaryGoal =
  | 'strength_muscle'
  | 'weight_body_comp'
  | 'energy_mood'
  | 'health_longevity'

export type BodyFrustration =
  | 'belly_fat'
  | 'muscle_tone_loss'
  | 'weight_gain'
  | 'feeling_fine'

export type MedicalCondition =
  | 'thyroid'
  | 'autoimmune'
  | 'ckd'
  | 'arthritis_knees'
  | 'arthritis_back'
  | 'arthritis_hips'
  | 'osteopenia_osteoporosis'
  | 'none'

export type QuizFormState = {
  stage: MenopauseStage | null
  exerciseType: ExerciseType | null
  jointPain: JointPain | null
  energyLevel: EnergyLevel | null
  sleepQuality: SleepQuality | null
  timeAvailable: TimeAvailable | null
  equipment: Equipment | null
  primaryGoal: PrimaryGoal | null
  bodyFrustration: BodyFrustration | null
  medicalConditions: MedicalCondition[]
}

export type QuizProfile = Required<Omit<QuizFormState, 'stage'>> & {
  stage: MenopauseStage
  cortisolScore: number
}
