import Anthropic from '@anthropic-ai/sdk'
import type { QuizFormState } from '@/lib/types'
import { getCortisolRiskLevel } from '@/lib/scoring'

const client = new Anthropic()

function buildPrompt(answers: QuizFormState & { cortisolScore: number }): string {
  const stageLabel = {
    perimenopause: 'Perimenopause (still having periods, but irregular)',
    postmenopause: 'Postmenopause (no period for 12+ months)',
    not_sure: 'Not sure of stage',
  }[answers.stage ?? 'not_sure']

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
    home_dumbbells: 'Home setup (dumbbells, maybe a bench)',
    minimal: 'Minimal (resistance bands, bodyweight only)',
    outdoor_only: 'Walking / outdoor only',
  }[answers.equipment ?? 'home_dumbbells']

  const goalLabel = {
    strength_muscle: 'Building strength and muscle',
    weight_body_comp: 'Losing weight / changing body composition',
    energy_mood: 'More energy and better mood',
    health_longevity: 'Overall health and longevity',
  }[answers.primaryGoal ?? 'health_longevity']

  const frustrationLabel = {
    belly_fat: 'Belly fat that won\'t budge despite working out',
    muscle_tone_loss: 'Loss of muscle tone even though active',
    weight_gain: 'Weight gain despite eating the same',
    feeling_fine: 'Feels fine about body — just wants to stay healthy',
  }[answers.bodyFrustration ?? 'feeling_fine']

  const medicalLabels = answers.medicalConditions
    .filter((c) => c !== 'none')
    .map((c) => ({
      thyroid: 'Thyroid condition',
      autoimmune: 'Autoimmune disease',
      ckd: 'Chronic kidney disease (CKD)',
      arthritis_knees: 'Arthritis — knees',
      arthritis_back: 'Arthritis — lower back / spine',
      arthritis_hips: 'Arthritis — hips',
      osteopenia_osteoporosis: 'Osteopenia or osteoporosis',
      none: '',
    }[c] ?? c))

  const cortisolRisk = getCortisolRiskLevel(answers.cortisolScore)

  return `You are an expert menopause fitness advisor. Generate a personalized fitness plan based on this woman's quiz answers. Be warm, direct, and specific. Never be generic. Reference her actual situation throughout.

QUIZ ANSWERS:
- Menopause stage: ${stageLabel}
- Current exercise: ${exerciseLabel}
- Joint pain: ${jointLabel}
- Energy level: ${energyLabel}
- Sleep quality: ${sleepLabel}
- Time available per week: ${timeLabel}
- Equipment access: ${equipmentLabel}
- Primary goal: ${goalLabel}
- Main frustration: ${frustrationLabel}
- Medical conditions: ${medicalLabels.length > 0 ? medicalLabels.join(', ') : 'None'}
- Cortisol Risk Score: ${answers.cortisolScore}/10 (${cortisolRisk} risk)

SCIENCE FRAMEWORK TO APPLY:
- Dr. Stacy Sims: Perimenopause allows 1-2 HIIT sessions/week. Postmenopause: shift to heavy lifting over HIIT. Polarized training model (very easy or very hard, minimize moderate middle). Cortisol management is critical.
- Dr. Mary Claire Haver: Protein target 1g per pound of body weight. Resistance training drives body recomposition more than cardio.
- Dr. Vonda Wright: Weighted walks and impact work critical for bone density. Walk after biggest meal daily as entry point for beginners. Osteoporosis: impact exercise is MORE important, not less.
- ACE 2025: Zone 2 walking is the best sleep and cortisol management tool. Poor sleep raises cortisol and increases insulin resistance.

SPECIFIC PLAN MODIFIERS TO APPLY BASED ON HER ANSWERS:
${answers.exerciseType === 'cardio_heavy' ? '- CARDIO FLAG: She is cardio-heavy. This works AGAINST belly fat in menopause. Reduce OTF/classes to 1-2x/week. Add 2-3x dedicated strength sessions.' : ''}
${answers.jointPain === 'moderate' || answers.jointPain === 'significant' ? '- JOINT FLAG: Moderate/significant joint pain. Remove high-impact. Use machines over free weights. Include cycling, swimming, or incline walking for cardio.' : ''}
${answers.jointPain === 'significant' ? '- SERIOUS JOINT FLAG: Flag recommendation to consult a physical therapist.' : ''}
${answers.medicalConditions.includes('arthritis_knees') ? '- KNEE ARTHRITIS: No running, no jumping. Substitute incline walking, cycling, swimming, leg press machine.' : ''}
${answers.medicalConditions.includes('arthritis_back') ? '- BACK ARTHRITIS: No barbell deadlifts or heavy spinal loading. Substitute hip hinges with light dumbbells, glute bridges, deadbugs.' : ''}
${answers.medicalConditions.includes('arthritis_hips') ? '- HIP ARTHRITIS: No deep squats or high-impact. Box squats, step-ups, cycling. Focus on hip stability.' : ''}
${answers.medicalConditions.includes('osteopenia_osteoporosis') ? '- OSTEOPENIA/OSTEOPOROSIS: Impact exercise MORE important, not less. Daily 20 jumps on solid surface. Resistance training essential. Mention Vitamin D, K2, magnesium.' : ''}
${answers.medicalConditions.includes('thyroid') ? '- THYROID: Note belly fat and fatigue may persist until thyroid is optimized. No amount of exercise overrides undertreated thyroid.' : ''}
${answers.medicalConditions.includes('autoimmune') ? '- AUTOIMMUNE: Reduce intensity. 2-3 rest days between sessions minimum. Cortisol management critical.' : ''}
${answers.medicalConditions.includes('ckd') ? '- CKD: Reduce high-intensity. Flag that protein recommendation MUST be discussed with nephrologist.' : ''}
${cortisolRisk === 'high' ? '- HIGH CORTISOL RISK: Explicitly name cortisol as likely belly fat driver. Polarized training shift. Reduce OTF to 1x/week. Daily Zone 2 walking as cortisol tool.' : ''}
${cortisolRisk === 'moderate' ? '- MODERATE CORTISOL RISK: Add note that managing workout intensity is as important as the workouts. Max 1x HIIT per week.' : ''}
${answers.energyLevel === 'exhausted' ? '- EXHAUSTED: Start with walks only for 2 weeks. 2x short resistance sessions max. Signal to investigate thyroid and iron.' : ''}
${answers.sleepQuality === 'very_poor' ? '- VERY POOR SLEEP: Walking and light movement only until sleep improves. Heavy training with very poor sleep accelerates muscle breakdown.' : ''}
${answers.equipment === 'outdoor_only' ? '- OUTDOOR ONLY: Incline walks as primary tool. Add weighted vest. Flag: strongly recommend adding basic dumbbells.' : ''}

PROTEIN NOTE:
${answers.medicalConditions.includes('ckd') ? 'CKD present — do NOT give a specific protein number without flagging nephrologist consultation. Give a range and add the CKD caveat prominently.' : 'Standard: aim for 1g per pound of bodyweight, or roughly 100-140g per day as a practical starting target.'}

OUTPUT FORMAT — write exactly 5 sections with these exact headings:
## Your Starting Point
## Why This Is Happening
## Your Weekly Plan
## Your First Week Focus
## Your Protein Target

Rules:
- "Your Starting Point": One warm, direct sentence acknowledging where she is. Reference her specific situation. Never generic.
- "Why This Is Happening": 2-3 sentences explaining the hormonal/physiological reason behind her main frustration. Plain science, not clinical jargon.
- "Your Weekly Plan": Specific days, workout types, duration, and why. Tailored to her time, equipment, joint pain, and medical conditions. Use a day-by-day format.
- "Your First Week Focus": One clear, simple priority for week 1 only. Prevent overwhelm. Build confidence.
- "Your Protein Target": Specific number in grams per day. CKD caveat if applicable.

Tone: Warm but authoritative. Like a knowledgeable friend who also happens to be an expert. Not clinical. Not preachy. Direct.`
}

const MOCK_RESPONSE = `## Your Starting Point
You're already doing the hard part — you're showing up consistently. The reason your belly isn't responding to your OTF sessions isn't a lack of effort or discipline, it's that the type of exercise is working against your hormonal environment right now.

## Why This Is Happening
After menopause, estrogen loss causes fat to redistribute specifically to the abdomen — this is hormonal, not caloric, and it won't respond to simply working harder. High-intensity group fitness classes done frequently elevate cortisol, which signals your body to store fat around the midsection as a protective mechanism. With thyroid and autoimmune conditions also in the picture, your body's stress response is already running higher than average, which makes this cycle harder to break with more cardio.

## Your Weekly Plan
Monday: OTF strength-only session (45 min). Focus on upper body and use machines over running sections. Skip the treads or keep to a brisk walk — your knees and back will thank you.
Tuesday: 30-min incline walk (Zone 2 — you should be able to hold a full conversation the whole time).
Wednesday: Rest or gentle stretching. This is part of the plan, not a failure.
Thursday: Home strength session (35 min). Dumbbell goblet squats, glute bridges, dumbbell rows, push-ups. No spinal loading under weight — keep your back safe.
Friday: 30-min incline walk.
Saturday: Optional light activity — a walk, yoga, or a second OTF strength session if energy is good.
Sunday: Full rest.

## Your First Week Focus
This week, take at least one full rest day between every OTF session. Just that. Notice how your knees and energy feel 24–48 hours after each workout — that feedback is data you'll use to build on.

## Your Protein Target
Aim for 100–120g of protein per day to start. Because you have CKD, please confirm this target with your nephrologist before increasing significantly — the right amount depends on your kidney function stage, and the standard recommendation of 1g per pound of bodyweight may be too high for you.`

export async function POST(request: Request) {
  const useMock = process.env.ANTHROPIC_API_KEY === 'your_key_here' || !process.env.ANTHROPIC_API_KEY

  if (useMock) {
    // Stream mock data word by word to simulate real streaming
    const encoder = new TextEncoder()
    const words = MOCK_RESPONSE.split(' ')

    const readable = new ReadableStream({
      async start(controller) {
        for (const word of words) {
          controller.enqueue(encoder.encode(word + ' '))
          await new Promise((r) => setTimeout(r, 18))
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
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
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
