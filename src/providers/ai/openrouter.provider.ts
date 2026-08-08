export const OpenRouterProvider = {
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseUrl: process.env.OPENROUTER_BASE_URL || 'https://api.openrouter.ai',

  async request(path: string, body: any) {
    if (!this.apiKey) throw new Error('OPENROUTER_API_KEY not set')
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`OpenRouter error ${res.status}`)
    return res.json()
  },
}
