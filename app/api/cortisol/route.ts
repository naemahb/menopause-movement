import Anthropic from '@anthropic-ai/sdk'
import type { QuizFormState } from '@/lib/types'
import { getCortisolRiskLevel } from '@/lib/scoring'

const client = new Anthropic()

export async function POST(request: Request) {
  const answers = await request.json() as QuizFormState & { cortisolScore: number }

  const stressLabel = {
    low: 'Low — life feels generally manageable',
    moderate: 'Moderate — some stress but copes well',
    high: 'High — dealing with a lot right now',
    overwhelming: 'Overwhelming — stress is constant and hard to manage',
  }[answers.stressLevel ?? 'moderate']

  const sleepLabel = {
    good: 'Good sleep — 7+ hours, wakes rested',
    interrupted: 'Interrupted sleep — wakes but falls back asleep',
    poor: 'Poor sleep — rarely sleeps through the night',
    very_poor: 'Very poor sleep — serious problem',
  }[answers.sleepQuality ?? 'good']

  const cortisolRisk = getCortisolRiskLevel(answers.cortisolScore)

  const prompt = `Write the "Your Stress & Cortisol" section of a personalized menopause fitness plan.

User profile:
- Stress level: ${stressLabel}
- Sleep quality: ${sleepLabel}
- Cortisol risk score: ${answers.cortisolScore}/10 (${cortisolRisk} risk)
- Menopause stage: ${answers.stage ?? 'not specified'}

Output the heading and exactly 4 tips. Nothing before the heading, nothing after the 4th tip.

## Your Stress & Cortisol

Write exactly 4 practical daily strategies formatted as "**Short title (2-4 words)**: Full recommendation." Each must be specific — give timing, duration, or dose. Cover:
1. A breathwork or nervous system practice she can do immediately (give exact steps)
2. Workout timing relative to cortisol rhythm — morning vs evening and why it matters
3. Zone 2 walking as a daily cortisol tool — give a specific daily minute target
4. One nutrition or sleep habit that directly lowers cortisol — be specific

Reference her stress level (${stressLabel}) directly in at least one tip.`

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    system: 'You are an expert menopause fitness advisor. Output only the requested section — the heading and 4 tips. No preamble, no sign-off.',
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
