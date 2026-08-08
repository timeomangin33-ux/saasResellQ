/**
 * Environment Variable Validation
 * Validates all required environment variables at application startup
 * Fails loudly with helpful error messages if any required vars are missing
 */

interface EnvConfig {
  required: string[]
  optional: string[]
}

const ENV_CONFIG: EnvConfig = {
  required: [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'DATABASE_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'VINTED_COOKIE_SECRET',
  ],
  optional: [
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'ADMIN_PASSWORD',
    'TEST_USER_PASSWORD',
  ],
}

export function validateEnv(): void {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required variables
  for (const key of ENV_CONFIG.required) {
    if (!process.env[key]) {
      errors.push(`❌ Missing required environment variable: ${key}`)
    }
  }

  // Check optional but important variables
  for (const key of ENV_CONFIG.optional) {
    if (!process.env[key]) {
      warnings.push(`⚠️  Optional environment variable not set: ${key}`)
    }
  }

  // Log warnings (non-blocking)
  if (warnings.length > 0) {
    console.warn('\n' + warnings.join('\n') + '\n')
  }

  // Fail on errors
  if (errors.length > 0) {
    console.error('\n' + errors.join('\n'))
    console.error('\n📝 Required environment variables for ResellQ:')
    console.error('   - NEXTAUTH_SECRET: JWT secret for sessions')
    console.error('   - NEXTAUTH_URL: Full URL of your app (http://localhost:3000)')
    console.error('   - DATABASE_URL: Database connection string (SQLite or PostgreSQL)')
    console.error('   - STRIPE_SECRET_KEY: Stripe API secret key')
    console.error('   - STRIPE_PUBLISHABLE_KEY: Stripe publishable key')
    console.error('   - STRIPE_WEBHOOK_SECRET: Stripe webhook signing secret')
    console.error('\n💡 Copy .env.example to .env.local and fill in the values\n')
    throw new Error('Missing required environment variables')
  }

  console.log('✅ All required environment variables are configured')
}

/**
 * Get a required environment variable with type safety
 */
export function getEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`)
  }
  return value
}

/**
 * Get an optional environment variable
 */
export function getEnvOptional(key: string): string | undefined {
  return process.env[key]
}
