import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(price)
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat('fr-FR').format(num)
}

export function formatPercent(num: number) {
  return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`
}

export function getDemandColor(score: number) {
  if (score >= 90) return 'text-accent'
  if (score >= 75) return 'text-blue-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

export function getTrendIcon(trend: 'up' | 'down' | 'stable') {
  if (trend === 'up') return '↑'
  if (trend === 'down') return '↓'
  return '→'
}

export function getTrendColor(trend: 'up' | 'down' | 'stable') {
  if (trend === 'up') return 'text-accent'
  if (trend === 'down') return 'text-red-400'
  return 'text-yellow-400'
}
