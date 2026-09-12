import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /partenaire/<jeton> est un relevé nominatif ouvert par un secret dans
      // l'URL : rien n'a à en être indexé. La page porte aussi son propre
      // noindex, celui-ci ne fait qu'éviter la visite.
      disallow: ['/api/', '/partenaire/'],
    },
    sitemap: 'https://www.resellq.com/sitemap.xml',
  }
}
