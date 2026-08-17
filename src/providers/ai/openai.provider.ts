import OpenAI from 'openai'

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant', content: string
  name?: string
}

export const OpenAIProvider = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-4',
  baseUrl: process.env.OPENAI_BASE_URL || '',

  getClient() {
    if (!this.apiKey) throw new Error('OPENAI_API_KEY not set')
    return new OpenAI({
      apiKey: this.apiKey,
      ...(this.baseUrl ? { baseURL: this.baseUrl } : {}),
    })
  },

  async chatCompletion(messages: OpenAIMessage[]) {
    const client = this.getClient()
    const response = await client.chat.completions.create({
      model: this.model,
      messages,
    })
    return response
  },
}
