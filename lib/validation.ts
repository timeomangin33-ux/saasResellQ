/**
 * Input Validation Schemas
 * Central validation for all API inputs using Zod
 */

import { z } from 'zod'

// Common reusable schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

export const SearchSchema = z.object({
  q: z.string().min(1).max(255),
  limit: z.coerce.number().int().positive().max(100).default(10),
  page: z.coerce.number().int().positive().default(1),
})

// Brand validation
export const BrandFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['rotation', 'sales', 'products']).default('rotation'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Category validation
export const CategoryFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['rotation', 'sales', 'growth']).default('rotation'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(255).optional(),
})

// Product validation
export const ProductFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  minPrice: z.coerce.number().nonnegative().default(0),
  maxPrice: z.coerce.number().positive().default(1000),
  category: z.string().max(255).optional(),
  brand: z.string().max(255).optional(),
})

// API response wrapper
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
})

/**
 * Validate and parse request data
 * Usage:
 * 
 * import { validateInput, BrandFiltersSchema } from '@/lib/validation'
 * 
 * export async function GET(req: NextRequest) {
 *   const query = await req.nextUrl.searchParams
 *   const validation = validateInput(Object.fromEntries(query), BrandFiltersSchema)
 *   
 *   if (!validation.success) {
 *     return NextResponse.json({ error: validation.error.message }, { status: 400 })
 *   }
 *   
 *   const filters = validation.data
 *   // ... use filters
 * }
 */
export function validateInput<T>(data: unknown, schema: z.ZodSchema<T>) {
  try {
    const result = schema.safeParse(data)
    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation error',
    } as const
  }
}
