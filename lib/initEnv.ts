/**
 * Initialize environment validation at application startup
 * This file is imported at the root level to validate env vars before app runs
 */

import { validateEnv } from './validateEnv'

// Validate environment on application startup
if (typeof window === 'undefined') {
  // Server-side only
  try {
    validateEnv()
  } catch (error) {
    console.error('Fatal error: Environment validation failed')
    process.exit(1)
  }
}
