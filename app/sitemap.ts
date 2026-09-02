import { MetadataRoute } from 'next'
import { marquesPubliables } from '@/lib/prix-public'

const baseUrl = 'https://www.resellq.com'

/**
 * Le plan du site.
 *
 * Les pages de prix par marque y sont ajoutées automatiquement : elles se
 * créent et disparaissent au rythme du relevé, et une liste écrite à la main
 * finirait par annoncer des pages qui n'existent plus.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/prix`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/payment`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/cgv`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/confidentialite`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/mentions-legales`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  try {
    const marques = await marquesPubliables()
    return [
      ...fixes,
      ...marques.map((m) => ({
        url: `${baseUrl}/prix/${m.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
    ]
  } catch {
    // Un plan de site amputé vaut mieux qu'un plan de site en erreur : les
    // pages fixes restent indexables même si la base ne répond pas.
    return fixes
  }
}
