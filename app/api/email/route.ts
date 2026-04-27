export async function POST(request: Request) {
  const { email, name } = await request.json()

  if (!email || !email.includes('@')) {
    return Response.json({ error: 'Valid email required' }, { status: 400 })
  }

  // TODO: Connect to your email provider (ConvertKit, Mailchimp, etc.)
  // Example ConvertKit:
  //   await fetch('https://api.convertkit.com/v3/forms/<FORM_ID>/subscribe', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ api_key: process.env.CONVERTKIT_API_KEY, email, first_name: name }),
  //   })

  console.log(`[email capture] name=${name ?? 'n/a'} email=${email}`)

  return Response.json({ ok: true })
}
