export const PostHogProvider = {
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || '',

  init() {
    // Placeholder: initialize posthog-js or posthog Node client
    return { initialized: Boolean(this.key && this.host) }
  },
}
