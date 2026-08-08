export const NovuProvider = {
  apiKey: process.env.NOVU_API_KEY || '',

  async send(email: string, templateId: string, payload: any) {
    if (!this.apiKey) throw new Error('NOVU_API_KEY not set')
    // Placeholder: call Novu REST API
    return { ok: true }
  },
}
