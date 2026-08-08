export const getCheckoutPlan = (plan?: string) => {
  const normalized = plan?.toLowerCase() ?? ''
  if (normalized === 'starter' || normalized === '29') return '29'
  if (normalized === 'pro' || normalized === '75') return '75'
  if (normalized === 'business' || normalized === '149') return '149'
  return '75'
}

export const checkoutCallbackUrl = `/payment?plan=75`
