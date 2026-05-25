import { getSupabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const { email, name, quizAnswers } = await request.json()

  if (!email || !email.includes('@')) {
    return Response.json({ error: 'Valid email required' }, { status: 400 })
  }

  const { error } = await getSupabase()
    .from('subscribers')
    .upsert({ email, name: name || null, quiz_answers: quizAnswers || null })

  if (error) {
    console.error('[supabase] insert error:', error.message)
    return Response.json({ error: 'Failed to save subscriber' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
