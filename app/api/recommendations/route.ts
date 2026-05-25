import Anthropic from '@anthropic-ai/sdk'
import { headers } from 'next/headers'
import type { QuizFormState, BodyFrustration } from '@/lib/types'
import { getCortisolRiskLevel } from '@/lib/scoring'
import { checkRateLimit } from '@/lib/ratelimit'

const client = new Anthropic()

function buildPrompt(answers: QuizFormState & { cortisolScore: number }): string {
  const stageLabel = {
    perimenopause: 'Perimenopause (still having periods, but irregular)',
    postmenopause: 'Postmenopause (no period for 12+ months)',
    not_sure: 'Not sure of stage',
  }[answers.stage ?? 'not_sure']

  const ageLabel = {
    under_45: 'Under 45',
    '45_49': '45–49',
    '50_54': '50–54',
    '55_59': '55–59',
    '60_plus': '60 or older',
  }[answers.age ?? 'under_45']

  const menstrualLabel = answers.menstrualStatus ? {
    regular_or_near_regular: 'Regular or near-regular cycles',
    irregular: 'Irregular — skipping months',
    very_rare: 'Very infrequent — fewer than 4 periods/year',
    none: 'No periods',
  }[answers.menstrualStatus] : 'N/A (postmenopause)'

  const hrtLabel = {
    yes_current: 'Currently on hormone therapy (HRT)',
    no: 'Not on HRT',
    considering_or_stopped: 'Considering HRT or recently stopped',
    not_sure: 'Not sure what she\'s taking',
  }[answers.hrtStatus ?? 'no']

  const hotFlashLabel = {
    none: 'No hot flashes or night sweats',
    mild: 'Mild — occasional and manageable',
    moderate: 'Moderate — affecting daily comfort or sleep',
    severe: 'Severe — frequent and significantly disruptive',
  }[answers.hotFlashSeverity ?? 'none']

  const exerciseLabel = {
    not_exercising: 'Not currently exercising',
    walking_yoga: 'Walking, yoga, or light movement only',
    cardio_heavy: 'Group fitness / cardio-heavy classes (OTF, spin, etc.)',
    strength_focused: 'Strength training focused',
    mix: 'Mix of strength and cardio',
  }[answers.exerciseType ?? 'not_exercising']

  const jointLabel = {
    none: 'No joint pain',
    mild: 'Mild joint pain — some stiffness but manageable',
    moderate: 'Moderate joint pain — modifies workouts',
    significant: 'Significant joint pain — major barrier to exercise',
  }[answers.jointPain ?? 'none']

  const stressLabel = {
    low: 'Low — life feels generally manageable',
    moderate: 'Moderate — some stress but copes well',
    high: 'High — dealing with a lot right now',
    overwhelming: 'Overwhelming — stress is constant and hard to manage',
  }[answers.stressLevel ?? 'moderate']

  const energyLabel = {
    good: 'Good energy — feels like herself most days',
    variable: 'Variable — some good days, some crashes',
    low: 'Low — fatigue is a constant challenge',
    exhausted: 'Exhausted — running on empty',
  }[answers.energyLevel ?? 'good']

  const sleepLabel = {
    good: 'Good sleep — 7+ hours, wakes rested',
    interrupted: 'Interrupted sleep — wakes but falls back asleep',
    poor: 'Poor sleep — rarely sleeps through the night',
    very_poor: 'Very poor sleep — serious problem',
  }[answers.sleepQuality ?? 'good']

  const timeLabel = {
    under_3hr: 'Under 3 hours per week',
    '3_5hr': '3–5 hours per week',
    '5hr_plus': '5+ hours per week',
  }[answers.timeAvailable ?? '3_5hr']

  const equipmentLabel = {
    full_gym: 'Full gym (barbells, machines, cables)',
    home_dumbbells: 'Home setup (dumbbells and/or kettlebells, maybe a bench)',
    minimal: 'Minimal (resistance bands, bodyweight only)',
    outdoor_only: 'Walking / outdoor only',
  }[answers.equipment ?? 'home_dumbbells']

  const goalLabel = {
    strength_muscle: 'Building strength and muscle',
    weight_body_comp: 'Losing weight / changing body composition',
    energy_mood: 'More energy and better mood',
    health_longevity: 'Overall health and longevity',
  }[answers.primaryGoal ?? 'health_longevity']

  const frustrationMap: Record<BodyFrustration, string> = {
    belly_fat: 'Belly fat that won\'t budge despite working out',
    muscle_tone_loss: 'Loss of muscle tone even though active',
    weight_gain: 'Weight gain despite eating the same',
    feeling_fine: 'Feels fine about body — just wants to stay healthy',
  }
  const frustrationLabels = (answers.bodyFrustration ?? [])
    .map((f) => frustrationMap[f])
    .filter(Boolean)

  const weightLabel = {
    under_140: 'Under 140 lbs',
    '140_169': '140–169 lbs',
    '170_199': '170–199 lbs',
    '200_plus': '200+ lbs',
  }[answers.weightBracket ?? 'under_140']

  const proteinRange = {
    under_140: '100–130',
    '140_169': '120–155',
    '170_199': '150–185',
    '200_plus': '175–210',
  }[answers.weightBracket ?? 'under_140']

  const dietaryLabel = {
    omnivore: 'Eats meat and dairy',
    pescatarian: 'Pescatarian — eats fish but not meat',
    vegetarian: 'Vegetarian — eats dairy and/or eggs',
    vegan: 'Vegan — no animal products',
  }[answers.dietaryPattern ?? 'omnivore']

  const medicalLabels = (answers.medicalConditions ?? [])
    .filter((c) => c !== 'none')
    .map((c) => ({
      hypertension: 'High blood pressure (hypertension)',
      diabetes: 'Type 2 diabetes',
      prediabetes: 'Pre-diabetes / insulin resistance',
      thyroid: 'Thyroid condition',
      autoimmune: 'Autoimmune disease',
      arthritis_knees: 'Arthritis — knees',
      arthritis_back: 'Arthritis — lower back / spine',
      arthritis_hips: 'Arthritis — hips',
      arthritis_shoulders: 'Arthritis — shoulders',
      osteopenia_osteoporosis: 'Osteopenia or osteoporosis',
      none: '',
    }[c] ?? c))

  const cortisolRisk = getCortisolRiskLevel(answers.cortisolScore)
  const hasBellyFat = (answers.bodyFrustration ?? []).includes('belly_fat')

  return `You are an expert menopause fitness advisor. Generate a personalized fitness plan based on this woman's quiz answers. Be warm, direct, and specific. Never be generic. Reference her actual situation throughout.

QUIZ ANSWERS:
- Menopause stage: ${stageLabel}
- Age: ${ageLabel}
- Menstrual status: ${menstrualLabel}
- Hormone therapy (HRT): ${hrtLabel}
- Hot flashes / night sweats: ${hotFlashLabel}
- Current exercise: ${exerciseLabel}
- Joint pain: ${jointLabel}
- Stress level: ${stressLabel}
- Energy level: ${energyLabel}
- Sleep quality: ${sleepLabel}
- Time available per week: ${timeLabel}
- Equipment access: ${equipmentLabel}
- Primary goal: ${goalLabel}
- Main frustration(s): ${frustrationLabels.length > 0 ? frustrationLabels.join(', ') : 'Not specified'}
- Weight bracket: ${weightLabel}
- Dietary pattern: ${dietaryLabel}
- Medical conditions: ${medicalLabels.length > 0 ? medicalLabels.join(', ') : 'None'}
- Cortisol Risk Score: ${answers.cortisolScore}/10 (${cortisolRisk} risk)

SCIENCE FRAMEWORK TO APPLY:
- Dr. Stacy Sims: Perimenopause allows 1-2 HIIT sessions/week. Postmenopause: shift to heavy lifting over HIIT. Polarized training model (very easy or very hard, minimize moderate middle). Cortisol management is critical. Women on HRT have better recovery and can train more like perimenopausal women. Skipping breakfast extends overnight muscle catabolism — intermittent fasting is counterproductive for women in menopause.
- Dr. Mary Claire Haver: Protein target 1g per pound of body weight. Resistance training drives body recomposition more than cardio.
- Dr. Vonda Wright: Weighted walks and impact work critical for bone density. Walk after biggest meal daily as entry point for beginners. Osteoporosis: impact exercise is MORE important, not less. At 60+, fall prevention and single-leg stability become top priorities.
- Dr. Gabrielle Lyon: Skeletal muscle is a longevity organ — it is the primary driver of metabolic health, insulin sensitivity, and healthy aging. Each meal needs ~3g of leucine (or ~30–40g total protein) to maximally stimulate muscle protein synthesis, especially in women over 40 where the anabolic threshold is higher. Progressive overload resistance training is the single most important intervention for body composition and metabolic health in midlife.
- Dr. Jen Gunter: The Women's Health Initiative study was widely misinterpreted — modern HRT formulations carry significantly different risk profiles than the synthetic progestins studied in 2002. Women who are good candidates for HRT should not fear it. Hormonal decline is a physiological event, not a character test — treating symptoms aggressively with appropriate tools (including HRT when indicated) is evidence-based medicine.
- Dr. Lisa Mosconi: Estrogen decline in perimenopause triggers measurable neurological changes — brain fog, memory lapses, and mood shifts are real neurobiological events, not psychological weakness. Aerobic exercise is among the most potent neuroprotective interventions available, increasing BDNF and reducing Alzheimer's risk. Women who exercise consistently through the menopause transition have meaningfully better long-term cognitive outcomes.
- ACE 2025: Zone 2 walking is the best sleep and cortisol management tool. Poor sleep raises cortisol and increases insulin resistance. Post-meal walks (even 10 minutes) dramatically improve glucose regulation.

SPECIFIC PLAN MODIFIERS TO APPLY:
${answers.exerciseType === 'cardio_heavy' ? '- CARDIO FLAG: She is cardio-heavy. This works AGAINST belly fat in menopause. Reduce group classes to 1-2x/week max. Add 2-3x dedicated strength sessions.' : ''}
${answers.hrtStatus === 'yes_current' ? '- HRT ACTIVE: She is currently on hormone therapy. She has better recovery capacity and reduced cortisol sensitivity. She can tolerate slightly more training intensity than someone not on HRT. Reflect this in her plan.' : ''}
${answers.hrtStatus === 'considering_or_stopped' ? '- HRT TRANSITION: She is considering or recently stopped HRT. Symptoms may be in flux. Emphasize stress management and symptom-aware training.' : ''}
${answers.hotFlashSeverity === 'severe' ? '- SEVERE HOT FLASHES / NIGHT SWEATS: These are significantly disrupting her life. Recommend morning workouts (cooler core temperature). Zone 2 cardio reduces vasomotor symptoms over time. Mention cooling strategies during exercise.' : ''}
${answers.hotFlashSeverity === 'moderate' ? '- MODERATE HOT FLASHES: These are affecting sleep and daily comfort. Zone 2 walking is helpful. Suggest morning workouts when core temperature is lower.' : ''}
${answers.stressLevel === 'overwhelming' || answers.stressLevel === 'high' ? '- HIGH LIFE STRESS: Her stress load compounds cortisol significantly — this is as impactful as exercise type. Recovery is paramount. Cap total weekly intensity, protect rest days, and explicitly name stress as a driver of her symptoms.' : ''}
${answers.jointPain === 'moderate' || answers.jointPain === 'significant' ? '- JOINT FLAG: Moderate/significant joint pain. Remove high-impact. Use machines over free weights where possible. Include cycling, swimming, or incline walking for cardio.' : ''}
${answers.jointPain === 'significant' ? '- SERIOUS JOINT FLAG: Recommend consulting a physical therapist to identify specific joint issues before increasing load.' : ''}
${answers.medicalConditions.includes('arthritis_knees') ? '- KNEE ARTHRITIS: No running, no jumping. Substitute incline walking, cycling, swimming, leg press machine.' : ''}
${answers.medicalConditions.includes('arthritis_back') ? '- BACK ARTHRITIS: No barbell deadlifts or heavy spinal loading. Substitute hip hinges with light dumbbells, glute bridges, deadbugs.' : ''}
${answers.medicalConditions.includes('arthritis_hips') ? '- HIP ARTHRITIS: No deep squats or high-impact. Box squats, step-ups, cycling. Focus on hip stability work.' : ''}
${answers.medicalConditions.includes('arthritis_shoulders') ? '- SHOULDER ARTHRITIS: No overhead pressing, no upright rows, no push-ups with full range. Substitute: chest press at incline (not flat), cable or band rows with neutral grip, lateral raises only to 90° and only if pain-free. Avoid any movement that loads the shoulder in impingement range (arm above shoulder height under load).' : ''}
${answers.medicalConditions.includes('osteopenia_osteoporosis') ? '- OSTEOPENIA/OSTEOPOROSIS: Impact exercise MORE important, not less. Include daily impact work (20 jumps on solid surface). Resistance training essential. Mention Vitamin D, K2, magnesium.' : ''}
${answers.medicalConditions.includes('hypertension') ? '- HYPERTENSION: Avoid Valsalva maneuver (breath-holding during heavy lifts). Favor muscular endurance rep ranges (12-15 reps). Zone 2 cardio is especially beneficial for blood pressure.' : ''}
${answers.medicalConditions.includes('diabetes') || answers.medicalConditions.includes('prediabetes') ? '- DIABETES / PRE-DIABETES: Prioritize post-meal walks (even 10 minutes significantly improves glucose uptake). Resistance training is powerfully insulin-sensitizing. Note that exercise timing around meals matters and is one of the most effective tools she has.' : ''}
${answers.medicalConditions.includes('thyroid') ? '- THYROID: Note that belly fat and fatigue may persist until thyroid is properly optimized. No amount of exercise overrides undertreated thyroid. Flag this gently.' : ''}
${answers.medicalConditions.includes('autoimmune') ? '- AUTOIMMUNE: Reduce intensity. Minimum 2-3 rest days between strength sessions. Cortisol management is critical.' : ''}
${answers.age === '60_plus' ? '- AGE 60+: Bone density and fall prevention are top priorities alongside muscle preservation. Include single-leg balance work in every session. Reduce impact. Heavy compound movements within pain tolerance are still appropriate.' : ''}
${answers.age === 'under_45' ? '- UNDER 45 / EARLY PERI: She may still have relatively regular cycles. If she is perimenopausal, cycle-phase training (hard sessions in follicular phase, recovery in luteal phase) is relevant and worth mentioning.' : ''}
${cortisolRisk === 'high' ? '- HIGH CORTISOL RISK: Explicitly name cortisol as likely the driver of her main frustration. Polarized training shift. Reduce high-intensity to max 1x/week. Daily Zone 2 walking as the primary cortisol management tool.' : ''}
${cortisolRisk === 'moderate' ? '- MODERATE CORTISOL RISK: Managing workout intensity is as important as the workouts themselves. Max 1-2x HIIT/intense sessions per week.' : ''}
${answers.energyLevel === 'exhausted' ? '- EXHAUSTED: Start with walks only for 2 weeks. 2x short resistance sessions max. Signal to investigate thyroid and iron levels.' : ''}
${answers.sleepQuality === 'very_poor' ? '- VERY POOR SLEEP: Walking and light movement only until sleep improves. Heavy training with very poor sleep accelerates muscle breakdown and cortisol dysregulation.' : ''}
${answers.equipment === 'outdoor_only' ? '- OUTDOOR ONLY: Incline walks as primary tool. Add a weighted vest if possible. Flag: strongly recommend adding basic dumbbells or resistance bands as a next step.' : ''}
${answers.dietaryPattern === 'vegan' ? '- VEGAN: Address protein sourcing. Recommend: tofu, tempeh, edamame, legumes, seitan, and a plant-based protein powder to hit target. Note that combining legumes with grains improves leucine content for muscle protein synthesis.' : ''}
${answers.dietaryPattern === 'vegetarian' ? '- VEGETARIAN: Protein sources: Greek yogurt, eggs, cottage cheese, legumes, tofu, and protein powder if needed.' : ''}
${answers.dietaryPattern === 'pescatarian' ? '- PESCATARIAN: Protein sources: fatty fish (salmon, tuna, sardines) — these also provide omega-3s which reduce inflammation and support joint health.' : ''}
${answers.menstrualStatus === 'irregular' || answers.menstrualStatus === 'very_rare' ? '- IRREGULAR / INFREQUENT CYCLES: Her cycles are unpredictable, which means follicular and luteal phases are hard to track. Acknowledge cycle-phase training as a concept but do not build the plan around it — instead emphasize listening to energy signals day-to-day and adjusting intensity accordingly. High-energy days: push harder. Low-energy days: walk or mobility only.' : ''}
${answers.menstrualStatus === 'regular_or_near_regular' ? '- REGULAR CYCLES: She still has relatively predictable cycles. Recommend cycle-phase training: schedule harder sessions (strength, HIIT) in the follicular phase (days 1–14), and drop intensity in the luteal phase (days 15–28) when progesterone rises and recovery slows. This is one of the most powerful tools available to her at this stage.' : ''}
${answers.timeAvailable === 'under_3hr' ? '- TIGHT TIME BUDGET (under 3 hrs/week): Do not prescribe more than 2 strength sessions per week. Each session should be 30–40 min max, full-body, compound movements only — no isolation work. Zone 2 walks count as active recovery, not additional training sessions. The plan must be completable in the time she has — an ambitious plan she cannot follow is worse than a minimal plan she can.' : ''}
${answers.timeAvailable === '5hr_plus' ? '- FULL TRAINING WEEK (5+ hrs/week): She has capacity for 3 strength sessions per week (not 2). Can split upper/lower or push/pull/legs rather than all full-body. Can include a dedicated Zone 2 session separate from walks. Has room for a weekly optional active recovery session (yoga, swimming, cycling).' : ''}
${answers.primaryGoal === 'weight_body_comp' ? '- GOAL: BODY RECOMPOSITION: Resistance training is the primary driver here — not cardio. Emphasize that body composition changes happen through muscle gain as much as fat loss. Protein timing is critical. Mention that the scale is a poor measure of progress for 6–8 weeks; use how clothes fit and strength gains as leading indicators.' : ''}
${answers.primaryGoal === 'health_longevity' ? '- GOAL: HEALTH & LONGEVITY: Prioritize bone density (impact work, heavy compound lifts), cardiovascular health (Zone 2), and muscle preservation (protein + resistance training). At this stage, muscle mass is the single strongest predictor of longevity and independence. Mention VO2 max as a long-term goal to build toward.' : ''}
${answers.primaryGoal === 'energy_mood' ? '- GOAL: ENERGY & MOOD: Zone 2 walking is the highest-leverage tool — it directly lowers cortisol, improves mitochondrial density, and stabilizes blood glucose. Overtraining is the enemy here. 2 strength sessions + daily Zone 2 walks will do more for energy than 5 hard sessions. Name the specific mechanism: strength training improves insulin sensitivity, which smooths energy crashes.' : ''}
${answers.primaryGoal === 'strength_muscle' ? '- GOAL: STRENGTH & MUSCLE: Progressive overload is the priority — she must add weight or reps over time, not just maintain. Compound lifts (squat, hinge, press, pull) should anchor every session. Protein at 1g/lb is non-negotiable for muscle protein synthesis. Note that women in menopause can absolutely build muscle — it requires more stimulus than pre-menopause but it is entirely achievable.' : ''}
${hasBellyFat ? '- BELLY FAT FRUSTRATION: Name this directly in her Starting Point — she needs to know this is not a discipline failure. Belly fat in menopause is driven by estrogen withdrawal shifting fat storage to the abdomen, compounded by cortisol. Cardio does not fix this. Heavy resistance training + cortisol management + protein timing are the three levers. Be explicit: more cardio makes this worse, not better.' : ''}
${(answers.bodyFrustration ?? []).includes('muscle_tone_loss') ? '- MUSCLE TONE LOSS: Estrogen supported muscle maintenance — its decline accelerates muscle loss even in active women. The fix is progressive overload resistance training with adequate protein. Emphasize that visible tone comes from muscle mass, not fat loss alone. She needs to build, not just maintain.' : ''}
${(answers.bodyFrustration ?? []).includes('weight_gain') ? '- UNEXPECTED WEIGHT GAIN: Validate this — metabolic rate drops 2–3% per decade and accelerates at menopause. Insulin sensitivity also declines. The most effective interventions are resistance training (raises resting metabolic rate), protein prioritization (highest thermic effect of food), and post-meal walks (directly improves glucose uptake). Do not recommend caloric restriction — it further suppresses metabolism and increases cortisol.' : ''}

PROTEIN NOTE:
Based on her weight bracket (${weightLabel}), her protein target is approximately ${proteinRange}g per day (1g per pound of bodyweight). ${answers.dietaryPattern && answers.dietaryPattern !== 'omnivore' ? `She is ${dietaryLabel.toLowerCase()} — include specific protein sources for her dietary pattern.` : ''}

OUTPUT FORMAT — write these sections with these exact headings, in this exact order:
## Your Starting Point
## Why This Is Happening
## Your Weekly Plan
## Your First Week Focus
## Your 4-Week Progression
## Your Protein Target
## Your Stress & Cortisol
## Your Sleep & Recovery

Rules:
- "Your Starting Point": 2–3 warm, direct sentences. Reference her specific stage, goal, and at least one concrete detail from her answers (stress level, hot flashes, joint situation, equipment). Make her feel seen, not processed.
- "Why This Is Happening": 3–4 sentences. Explain the hormonal/physiological reason behind her main frustration in plain language. Name cortisol, estrogen, progesterone, or insulin resistance as relevant. Connect the science directly to what she's experiencing.
- "Your Weekly Plan": Day-by-day. For EVERY exercise listed: (a) include sets × reps e.g. "3 sets of 10–12"; (b) one plain-English sentence describing the movement e.g. "push your hips back, not down, keeping your chest tall"; (c) a YouTube search term in parentheses e.g. (search "goblet squat form" on YouTube). Format each day as a structured bullet list, not a paragraph. Tailor every session to her equipment (${equipmentLabel}), joint pain (${jointLabel}), and medical conditions.
- "Your First Week Focus": 2–3 sentences. One clear priority for week 1 only. Be specific about what she should pay attention to and why — give her a concrete signal that tells her the week worked.
- "Your 4-Week Progression": 4 items, one per week. Format each as "**Week N — Title**: description." Show how volume, load, or complexity progresses. Week 4 should include a deload and a self-assessment prompt. Be specific — reference her actual plan, not generic advice.
- "Your Protein Target": Start with the gram target on its own line, then exactly 3 tips formatted as "**Short title (2-4 words)**: one sentence." Cover: (1) eat 30–40g within 30 min of waking; (2) spread protein across 3–4 meals; (3) 20–40g post-workout. Then one final line starting with "**Sources:**" listing protein foods for her dietary pattern. Explicitly address intermittent fasting: Dr. Stacy Sims is clear that skipping breakfast extends overnight muscle catabolism and is counterproductive for women in menopause.
- "Your Stress & Cortisol": One opening sentence naming her cortisol risk level and the primary driver. Then exactly 3 tips formatted as "**Short title (2-4 words)**: Full recommendation." Cover: (1) how her current training intensity relates to cortisol — be specific about what to change; (2) the single highest-leverage daily behavioral tool (Zone 2 walks, meal timing, or post-workout nutrition depending on her answers); (3) one lifestyle lever tied to her specific stress level or energy. Tailor to her cortisol risk (${cortisolRisk}) and stress level (${stressLabel}). Do not skip this section.
- "Your Sleep & Recovery": Exactly 4 tips. Format each as "**Short title (2-4 words)**: Full recommendation." Tailor to her sleep quality (${sleepLabel}), stress level, and hot flash severity. Include at least one thing she can do tonight. No intro sentence — go straight into the tips.

Tone: Warm but authoritative. Like a knowledgeable friend who also happens to be an expert. Not clinical. Not preachy. Direct. She answered 17 questions — give her the depth she earned.`
}

const MOCK_RESPONSE = `## Your Starting Point
You're already doing the hard part — you're showing up consistently with dumbbells at home, managing high stress, and dealing with the belly fat that won't budge no matter how hard you push. The reason it's not responding isn't effort or discipline — it's that the type of training you've been doing is working directly against your hormonal environment right now. That changes today.

## Why This Is Happening
When estrogen drops in perimenopause, your body loses its primary signal for where to store fat — and it defaults to the abdomen. At the same time, elevated cortisol (from both life stress and high-intensity workouts) tells your body to hold onto that belly fat as an energy reserve. Your cortisol is high, your estrogen is low, and the two together create the exact environment that makes belly fat stubborn. Working harder with more cardio actually makes this worse — not better — because it spikes cortisol further. The solution is lifting heavier and recovering smarter, not grinding harder.

## Your Weekly Plan
Monday: Strength — Full Body (40 min)
• Goblet squat — 3 sets of 10. Hold one dumbbell vertically at your chest, sit your hips back and down while keeping your chest tall and knees tracking over your toes. (search "goblet squat form" on YouTube)
• Single-arm dumbbell row — 3 sets of 12 per side. Hinge forward at the hips, brace your core, then pull your elbow straight back toward your hip — not out to the side. (search "single arm dumbbell row" on YouTube)
• Glute bridge — 3 sets of 15. Lie on your back, feet flat, drive through your heels and squeeze your glutes hard at the top for 2 seconds. (search "glute bridge tutorial" on YouTube)
• Dumbbell overhead press — 3 sets of 10. Press directly overhead, keep your ribs down, don't arch your lower back. (search "dumbbell overhead press form" on YouTube)

Tuesday: Zone 2 Walk (30 min). Conversational pace — you should be able to speak a full sentence without gasping. This is not a workout. It is your cortisol management tool.

Wednesday: Rest or 10 min gentle mobility.

Thursday: Strength — Lower Body Focus (40 min)
• Romanian deadlift — 3 sets of 10. Hold dumbbells in front of your thighs, push your hips back (not down), feel your hamstrings load, then drive your hips forward to stand. (search "dumbbell Romanian deadlift form" on YouTube)
• Step-up — 3 sets of 10 per leg. Use a sturdy chair or step, drive through the heel of the working leg, don't push off the bottom foot. (search "step-up exercise form" on YouTube)
• Dead bug — 3 sets of 8 per side. Lie on your back, lower opposite arm and leg slowly toward the floor while keeping your lower back pressed down. (search "dead bug exercise tutorial" on YouTube)
• Dumbbell lateral raise — 3 sets of 12. Light weight, arms slightly bent, lift to shoulder height only. (search "lateral raise form" on YouTube)

Friday: Zone 2 Walk (30–40 min). Same as Tuesday — easy, conversational, outside if possible.

Saturday: Optional third strength session or longer walk if energy is good.

Sunday: Full rest.

## Your First Week Focus
This week, your only job is to take one full rest day between every strength session — Monday, Wednesday off, Thursday, Friday walk. Notice how your energy, mood, and soreness feel 24 and 48 hours after each session. That feedback is your data. If you're still exhausted 48 hours later, you went too heavy. If you feel nothing, you can push the next session a little harder. The goal this week is calibration, not performance.

## Your 4-Week Progression
**Week 1 — Calibrate**: Follow the plan exactly as written. Learn the movements. Track how you feel 24–48 hours after each session. Your job is to establish the habit and gather data, not to push hard.
**Week 2 — Add volume**: Add one set to each exercise (go from 3 to 4 sets on your compound movements). Increase your Zone 2 walks by 10 minutes each. You should feel the sessions are challenging but fully recoverable by the next day.
**Week 3 — Increase load**: Add 2.5–5 lbs to every exercise where the last 2 reps felt easy in week 2. Keep the walk duration the same. By the end of this week you should notice improved sleep quality and more stable energy — those are your leading indicators that this is working.
**Week 4 — Deload and assess**: Drop back to 2 sets per exercise and shorten walks by 10 minutes. Let your body consolidate. At the end of the week, ask yourself: How is my sleep compared to 4 weeks ago? Has my energy improved? How do my clothes fit? That's your data for designing month 2.

## Your Protein Target
120–140g per day
**Eat within 30 min of waking**: Your body breaks down muscle overnight — a 30–40g breakfast stops that immediately. Skip intermittent fasting; Dr. Stacy Sims is clear it extends the very catabolism you're trying to reverse.
**Spread across 3–4 meals**: Muscles can only use ~30–40g at a time for protein synthesis — loading it all at dinner leaves most of it unused for recovery.
**Post-workout window**: Eat 20–40g within 60 minutes of finishing a strength session when your muscle cells are most receptive.
**Sources:** Greek yogurt, eggs, chicken, salmon, cottage cheese, protein powder to close the gap.

## Your Stress & Cortisol
Your cortisol risk is moderate-to-high — the combination of high life stress, variable energy, and current training intensity is creating a hormonal environment that actively works against fat loss and recovery.

**Lower your training ceiling**: Two intense sessions per week is your ceiling right now, not your floor. More high-intensity work when cortisol is already elevated accelerates belly fat storage and muscle breakdown — the exact opposite of what you're trying to achieve.
**Zone 2 is your medicine**: A 20–30 minute walk at conversational pace every day is the single most evidence-based cortisol intervention available. It lowers cortisol directly, improves mitochondrial function, and stabilizes blood glucose — all without adding to your stress load.
**Eat within 45 minutes post-workout**: Fasted training with high life stress doubles the cortisol spike. A protein-rich meal or shake immediately after strength sessions blunts cortisol and shifts your body toward recovery instead of breakdown.

## Your Sleep & Recovery
**Cool your bedroom**: Keep it at 65–68°F (18–20°C) — this is especially important if night sweats are waking you. A cooler core temperature is one of the most effective non-pharmaceutical interventions for menopause-related sleep disruption.
**Work out in the morning**: Intense exercise after 5pm raises cortisol at the exact moment your body needs it to drop. A Zone 2 walk before 10am is the single best tool for lowering nighttime cortisol.
**Try 4-7-8 breathing tonight**: Inhale for 4 counts, hold for 7, exhale for 8. Do this twice before bed. It activates the parasympathetic nervous system faster than most sleep aids — and you can do it tonight.
**Cut alcohol completely**: Even one drink fragments sleep architecture and worsens night sweats. If you drink regularly and your sleep is poor, this is the highest-leverage change you can make.`

export async function POST(request: Request) {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { allowed, retryAfterSecs } = checkRateLimit(ip)
  if (!allowed) {
    return new Response('Too many requests. Please try again later.', {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSecs) },
    })
  }

  const useMock = process.env.ANTHROPIC_API_KEY === 'your_key_here' || !process.env.ANTHROPIC_API_KEY

  if (useMock) {
    const encoder = new TextEncoder()
    const words = MOCK_RESPONSE.split(' ')

    const readable = new ReadableStream({
      async start(controller) {
        for (const word of words) {
          controller.enqueue(encoder.encode(word + ' '))
          await new Promise((r) => setTimeout(r, 2))
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
    })
  }

  const answers = await request.json() as QuizFormState & { cortisolScore: number }
  const prompt = buildPrompt(answers)

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    system: 'You are an expert menopause fitness advisor. Follow all output format instructions exactly. When a section is marked as MANDATORY or YOU MUST INCLUDE, you must output that section — do not use your own judgment to override it based on scores or risk levels shown in the prompt.',
    messages: [{ role: 'user', content: prompt }],
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
}
