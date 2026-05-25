export type MenopauseStage = 'perimenopause' | 'postmenopause' | 'not_sure'

export type AgeBracket = 'under_45' | '45_49' | '50_54' | '55_59' | '60_plus'

export type MenstrualStatus =
  | 'regular_or_near_regular'
  | 'irregular'
  | 'very_rare'
  | 'none'

export type HRTStatus = 'yes_current' | 'no' | 'considering_or_stopped' | 'not_sure'

export type HotFlashSeverity = 'none' | 'mild' | 'moderate' | 'severe'

export type StressLevel = 'low' | 'moderate' | 'high' | 'overwhelming'

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

export type WeightBracket = 'under_140' | '140_169' | '170_199' | '200_plus'

export type DietaryPattern = 'omnivore' | 'pescatarian' | 'vegetarian' | 'vegan'

export type MedicalCondition =
  | 'hypertension'
  | 'diabetes'
  | 'prediabetes'
  | 'thyroid'
  | 'autoimmune'
  | 'arthritis_knees'
  | 'arthritis_back'
  | 'arthritis_hips'
  | 'arthritis_shoulders'
  | 'osteopenia_osteoporosis'
  | 'none'

export type QuizFormState = {
  stage: MenopauseStage | null
  age: AgeBracket | null
  menstrualStatus: MenstrualStatus | null
  hrtStatus: HRTStatus | null
  hotFlashSeverity: HotFlashSeverity | null
  exerciseType: ExerciseType | null
  jointPain: JointPain | null
  stressLevel: StressLevel | null
  energyLevel: EnergyLevel | null
  sleepQuality: SleepQuality | null
  timeAvailable: TimeAvailable | null
  equipment: Equipment | null
  primaryGoal: PrimaryGoal | null
  bodyFrustration: BodyFrustration[]
  weightBracket: WeightBracket | null
  dietaryPattern: DietaryPattern | null
  medicalConditions: MedicalCondition[]
}

export type QuizProfile = {
  stage: MenopauseStage
  age: AgeBracket
  menstrualStatus: MenstrualStatus | null
  hrtStatus: HRTStatus
  hotFlashSeverity: HotFlashSeverity
  exerciseType: ExerciseType
  jointPain: JointPain
  stressLevel: StressLevel
  energyLevel: EnergyLevel
  sleepQuality: SleepQuality
  timeAvailable: TimeAvailable
  equipment: Equipment
  primaryGoal: PrimaryGoal
  bodyFrustration: BodyFrustration[]
  weightBracket: WeightBracket
  dietaryPattern: DietaryPattern
  medicalConditions: MedicalCondition[]
  cortisolScore: number
}
