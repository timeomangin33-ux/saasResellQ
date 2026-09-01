import { prisma } from '@/prisma'
import { OpenAIProvider } from '@/src/providers/ai/openai.provider'

interface ScoredProduct {
  vintedId: string
  analysisScore: number
  profitMargin: number
  riskLevel: 'low' | 'medium' | 'high'
  recommendation: 'sell' | 'hold' | 'skip'
}

/**
 * Scores a batch of just-persisted products with OpenAI: estimated resale
 * profit margin, a 0-100 opportunity score, risk level and a recommendation.
 * Runs once per scanned category batch to keep API usage bounded.
 */
export async function scoreProducts(products: { vintedId: string; title: string; brand: string | null; price: number; category: string }[]) {
  if (products.length === 0 || !process.env.OPENAI_API_KEY) return { scored: 0, error: false as const }

  const prompt = `Tu es un expert en revente sur Vinted. Pour chaque article ci-dessous, estime son potentiel de revente.
Réponds UNIQUEMENT avec un tableau JSON (pas de texte autour), un objet par article, dans le même ordre, avec ces clés exactes :
- "analysisScore": nombre entre 0 et 100 (potentiel global d'opportunité)
- "profitMargin": nombre (pourcentage de marge de revente estimée, peut être négatif)
- "riskLevel": "low", "medium" ou "high"
- "recommendation": "sell", "hold" ou "skip"

Articles :
${products.map((p, i) => `${i + 1}. ${p.title} — marque: ${p.brand || 'inconnue'} — prix: ${p.price}€ — catégorie: ${p.category}`).join('\n')}`

  try {
    const response = await OpenAIProvider.chatCompletion(
      [
        { role: 'system', content: 'Tu réponds uniquement en JSON valide, sans markdown ni explication.' },
        { role: 'user', content: prompt },
      ],
      'gpt-4o-mini',
    )

    const raw = response.choices[0]?.message?.content?.trim() || '[]'
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '')
    const scores: Omit<ScoredProduct, 'vintedId'>[] = JSON.parse(cleaned)

    if (!Array.isArray(scores) || scores.length !== products.length) {
      throw new Error(`Expected ${products.length} scores, got ${Array.isArray(scores) ? scores.length : typeof scores}`)
    }

    await Promise.all(
      products.map((product, i) => {
        const score = scores[i]
        if (!score) return null
        return prisma.product.update({
          where: { vintedId: product.vintedId },
          // `analysisScore` et `profitMargin` ne sont plus écrits ici. Ils sont
          // calculés à chaque collecte à partir de la médiane réelle de la
          // catégorie (voir lib/vinted/scoring-marche.ts), donc pour toutes les
          // annonces et sans dépendre d'un compte OpenAI approvisionné. Le
          // modèle garde ce qu'il fait mieux qu'une formule : le niveau de
          // risque et la recommandation.
          data: {
            riskLevel: score.riskLevel ?? null,
            recommendation: score.recommendation ?? null,
            aiProcessed: true,
          },
        })
      }),
    )

    return { scored: products.length, error: false as const }
  } catch (error) {
    // L'erreur est rendue à l'appelant, pas seulement journalisée : sans ça, un
    // compte OpenAI sans crédit fait échouer chaque appel en silence, et le
    // collecteur continue d'essayer catégorie après catégorie pour rien.
    const raison = error instanceof Error ? error.message : String(error)
    console.error('[ai-scoring] notation impossible :', raison)
    return { scored: 0, error: true as const, reason: raison }
  }
}
