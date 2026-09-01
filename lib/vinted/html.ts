/**
 * Lecture de secours : extraction depuis le HTML de la page catalogue.
 *
 * Ce chemin n'est pas le chemin normal — l'API JSON l'est (voir api.ts). Il
 * sert quand l'API refuse la session alors que la page publique, elle, répond
 * encore. C'est une vraie source de données, pas un jeu d'exemple : ce qui en
 * sort a été lu sur Vinted, ou rien n'en sort.
 *
 * Ce qu'il perd par rapport à l'API : le vendeur, les favoris, les vues, le
 * prix protection incluse et la date de mise en ligne. Le texte de l'attribut
 * `alt` ne les contient pas.
 */

import type { AnnonceVinted } from './api'
import { BASE_VINTED, BROWSER_HEADERS, VintedBlockedError } from './session'

const ENTITES: Record<string, string> = {
  quot: '"',
  apos: "'",
  nbsp: ' ',
  lt: '<',
  gt: '>',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
  ocirc: 'ô',
  icirc: 'î',
  ecirc: 'ê',
  ugrave: 'ù',
  ntilde: 'ñ',
  uuml: 'ü',
  ouml: 'ö',
  auml: 'ä',
}

export function decoderEntitesHtml(entree: string) {
  return entree
    // Entités numériques, hexadécimales (&#x27;) et décimales (&#39;). Vinted
    // écrit les apostrophes en hexadécimal.
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, nom) => ENTITES[nom.toLowerCase()] ?? m)
    // &amp; en dernier, sinon « &amp;#39; » serait décodé deux fois.
    .replace(/&amp;/g, '&')
}

function extrairePrix(texte: string) {
  const m = texte.match(/([0-9]+(?:[.,][0-9]+)?)\s*€/)
  return m ? Number(m[1].replace(',', '.')) : 0
}

export function extraireAnnoncesDuHtml(html: string, categorie: string, limite = 96, vues = new Set<string>()): AnnonceVinted[] {
  const annonces: AnnonceVinted[] = []
  const re = /data-testid="product-item-id-(\d+)"(?!--)/g
  let m: RegExpExecArray | null

  while ((m = re.exec(html)) && annonces.length < limite) {
    const id = m[1]
    if (vues.has(id)) continue

    const fenetre = html.slice(m.index, m.index + 1500)
    const href = fenetre.match(/href="(\/items\/\d+[^"]*)"/)?.[1]
    const src = fenetre.match(/src="(https:\/\/images1\.vinted\.net[^"]*)"/)?.[1]
    const alt = fenetre.match(/alt="([^"]+)"/)?.[1]
    if (!alt) continue

    const brut = decoderEntitesHtml(alt).replace(/\s+/g, ' ').trim()
    if (!brut || brut.includes('Logo Vinted') || !/marque\s*:/i.test(brut)) continue

    vues.add(id)

    const titre = brut.split(/,\s*marque\s*:/i)[0].trim()
    const marque = brut.match(/marque\s*:\s*([^,]+)/i)?.[1]?.trim() || 'Sans marque'
    const etat = brut.match(/état\s*:\s*([^,]+)/i)?.[1]?.trim() || ''
    const taille = brut.match(/taille\s*:\s*([^,]+)/i)?.[1]?.trim() || ''
    const prix = extrairePrix(brut)
    // Le second montant de l'étiquette est le prix protection acheteurs
    // incluse. On le prend s'il est présent, sinon le prix nu.
    const montants = [...brut.matchAll(/([0-9]+(?:[.,][0-9]+)?)\s*€/g)].map((x) => Number(x[1].replace(',', '.')))
    const total = montants.length > 1 ? Math.max(...montants) : prix

    annonces.push({
      id,
      title: titre,
      price: prix,
      totalPrice: total,
      serviceFee: Math.max(0, Number((total - prix).toFixed(2))),
      currency: 'EUR',
      brand: marque,
      size: taille,
      condition: etat,
      category: categorie,
      image: src || '',
      url: href ? `${BASE_VINTED}${href}` : `${BASE_VINTED}/items/${id}`,
      description: [etat, taille ? `Taille ${taille}` : ''].filter(Boolean).join(' • '),
      sellerId: null,
      sellerLogin: null,
      favouriteCount: 0,
      viewCount: 0,
      listedAt: null,
      promoted: false,
    })
  }

  return annonces
}

export async function collecterViaHtml(
  recherche: string,
  cible: number,
  deadline?: number,
): Promise<AnnonceVinted[]> {
  const PAR_PAGE = 96
  const pages = Math.max(1, Math.min(6, Math.ceil(cible / PAR_PAGE)))
  const vues = new Set<string>()
  const annonces: AnnonceVinted[] = []

  for (let p = 1; p <= pages && annonces.length < cible; p++) {
    if (deadline && Date.now() > deadline) break
    const url = `${BASE_VINTED}/catalog?search_text=${encodeURIComponent(recherche)}${p > 1 ? `&page=${p}` : ''}`
    const reponse = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow' })

    if (reponse.status === 403 || reponse.status === 429) {
      throw new VintedBlockedError(reponse.status, `La page catalogue est bloquée (HTTP ${reponse.status}).`)
    }
    if (!reponse.ok) throw new Error(`La page catalogue a répondu HTTP ${reponse.status}`)

    const html = await reponse.text()
    annonces.push(...extraireAnnoncesDuHtml(html, recherche, cible - annonces.length, vues))
    if (p < pages) await new Promise((r) => setTimeout(r, 400))
  }

  return annonces
}
