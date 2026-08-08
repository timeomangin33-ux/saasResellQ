import { API_CONFIG } from '../../../lib/api-config'

export const VintedProvider = {
  baseUrl: API_CONFIG.vinted.baseUrl,

  async search(query: string) {
    // utiliser le vinted.ts interne si disponible
    const res = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) throw new Error('Vinted fetch error')
    return res.json()
  },
}
