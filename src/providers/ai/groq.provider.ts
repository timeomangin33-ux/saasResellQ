export const GroqProvider = {
  apiKey: process.env.GROQ_API_KEY || '',
  baseUrl: process.env.GROQ_BASE_URL || '',

  async query(q: string) {
    if (!this.apiKey) throw new Error('GROQ_API_KEY not set')
    const res = await fetch(this.baseUrl || 'https://groq.api/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ query: q }),
    })
    if (!res.ok) throw new Error(`Groq error ${res.status}`)
    return res.json()
  },
}
