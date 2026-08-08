/**
 * Pagination Helpers
 * Utilities for implementing pagination on API endpoints
 */

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasMore: boolean
  }
}

/**
 * Calculate pagination offsets
 * 
 * Usage:
 * import { getPaginationParams } from '@/lib/pagination'
 * 
 * export async function GET(req: NextRequest) {
 *   const searchParams = req.nextUrl.searchParams
 *   const { page, limit, skip } = getPaginationParams(
 *     searchParams.get('page'),
 *     searchParams.get('limit')
 *   )
 *   
 *   const items = await prisma.item.findMany({
 *     skip,
 *     take: limit,
 *   })
 *   
 *   const total = await prisma.item.count()
 *   
 *   return NextResponse.json(
 *     createPaginatedResponse(items, { page, limit, total })
 *   )
 * }
 */
export function getPaginationParams(
  pageParam?: string | null,
  limitParam?: string | null,
  maxLimit = 100
): PaginationParams & { skip: number } {
  let page = parseInt(pageParam || '1', 10)
  let limit = parseInt(limitParam || '10', 10)

  // Validate and sanitize
  page = Math.max(1, isNaN(page) ? 1 : page)
  limit = Math.min(maxLimit, Math.max(1, isNaN(limit) ? 10 : limit))

  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number }
): PaginatedResponse<T> {
  const pages = Math.ceil(pagination.total / pagination.limit)
  const hasMore = pagination.page < pages

  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages,
      hasMore,
    },
  }
}

/**
 * Generate pagination links (for cursor-based pagination)
 */
export function generatePaginationLinks(
  baseUrl: string,
  currentPage: number,
  totalPages: number
): {
  first?: string
  previous?: string
  next?: string
  last?: string
} {
  const links: {
    first?: string
    previous?: string
    next?: string
    last?: string
  } = {}

  if (currentPage > 1) {
    links.first = `${baseUrl}?page=1`
    links.previous = `${baseUrl}?page=${currentPage - 1}`
  }

  if (currentPage < totalPages) {
    links.next = `${baseUrl}?page=${currentPage + 1}`
    links.last = `${baseUrl}?page=${totalPages}`
  }

  return links
}

/**
 * Type-safe pagination builder for database queries
 * Usage:
 * const paginationBuilder = new PaginationBuilder(1, 20)
 * const items = await prisma.item.findMany({
 *   ...paginationBuilder.toQuery()
 * })
 */
export class PaginationBuilder {
  page: number
  limit: number
  skip: number

  constructor(page = 1, limit = 10, maxLimit = 100) {
    this.page = Math.max(1, page)
    this.limit = Math.min(maxLimit, Math.max(1, limit))
    this.skip = (this.page - 1) * this.limit
  }

  toQuery() {
    return {
      skip: this.skip,
      take: this.limit,
    }
  }

  toResponse<T>(data: T[], total: number): PaginatedResponse<T> {
    return createPaginatedResponse(data, {
      page: this.page,
      limit: this.limit,
      total,
    })
  }
}
