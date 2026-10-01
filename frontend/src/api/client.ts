/**
 * Central HTTP client for the FastAPI backend.
 *
 * Responsibilities:
 *  - resolve the API base URL from Vite env config
 *  - attach the bearer token to every request
 *  - normalise FastAPI errors into a typed `ApiError`
 *  - broadcast `auth:unauthorized` so the app can drop a dead session
 */

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').trim()

/**
 * When VITE_API_BASE_URL is empty we use same-origin requests and rely on the
 * Vite dev proxy (see vite.config.ts) or a reverse proxy in production.
 */
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, '')

/** Dev-only: the upstream the Vite proxy forwards /api to, for error copy. */
export const DEV_PROXY_TARGET = (import.meta.env.VITE_DEV_PROXY_TARGET ?? '').trim()

const TOKEN_STORAGE_KEY = 'nta.token'

export const tokenStorage = {
  get(): string | null {
    try {
      return window.localStorage.getItem(TOKEN_STORAGE_KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } catch {
      /* storage unavailable (private mode) — session stays in memory only */
    }
  },
  clear(): void {
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch {
      /* noop */
    }
  },
}

export type ApiErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'server'
  | 'network'
  | 'unknown'

const STATUS_KIND: Record<number, ApiErrorKind> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  422: 'validation',
  502: 'network',
  503: 'network',
  504: 'network',
}

export class ApiError extends Error {
  readonly status: number
  readonly kind: ApiErrorKind
  readonly detail: string
  readonly errors: unknown[]

  constructor(status: number, detail: string, errors: unknown[] = []) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.kind = STATUS_KIND[status] ?? (status >= 500 ? 'server' : 'unknown')
    this.errors = errors
  }

  /** Human-facing copy for transport failures. */
  static network(
    message = `Cannot reach the backend at ${API_BASE_URL || window.location.origin}. Start it with "cd backend && PYTHONPATH=. uvicorn app.main:app --port 8000".`,
  ): ApiError {
    return new ApiError(0, message)
  }

  /**
   * The Vite dev proxy answers 502 when it cannot connect to its upstream.
   * That is a "backend is not running" signal, not an application error, so it
   * gets actionable copy instead of a bare status.
   */
  static badGateway(status: number): ApiError {
    const target = DEV_PROXY_TARGET || 'http://localhost:8000'
    return new ApiError(
      status,
      `The dev proxy could not reach the backend at ${target}. Check that it is running: "cd backend && PYTHONPATH=. uvicorn app.main:app --port 8000".`,
    )
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

/** Map a caught value onto a message safe to render in the UI. */
export function toErrorMessage(value: unknown, fallback = 'Something went wrong.'): string {
  if (isApiError(value)) return value.detail
  if (value instanceof Error && value.message) return value.message
  return fallback
}

function extractDetail(payload: unknown, fallbackStatus: number): { detail: string; errors: unknown[] } {
  if (typeof payload === 'string' && payload.trim()) {
    return { detail: payload, errors: [] }
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const detail = record.detail
    if (typeof detail === 'string' && detail) return { detail, errors: [] }
    // FastAPI 422 validation payloads: { detail: [{ loc, msg, type }, ...] }
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const entry = item as Record<string, unknown>
          const loc = Array.isArray(entry.loc) ? entry.loc.filter((p) => p !== 'body').join('.') : ''
          const msg = typeof entry.msg === 'string' ? entry.msg : 'Invalid value'
          return loc ? `${loc}: ${msg}` : msg
        })
        .filter((m): m is string => Boolean(m))
      return { detail: messages.join('; ') || 'Request validation failed.', errors: detail }
    }
    return { detail: `Request failed with status ${fallbackStatus}.`, errors: [] }
  }
  return { detail: `Request failed with status ${fallbackStatus}.`, errors: [] }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Multipart payload. Sent as-is so the browser can set the boundary. */
  formData?: FormData
  query?: Record<string, string | number | boolean | null | undefined>
  /** Send the bearer token. Defaults to true. */
  auth?: boolean
  signal?: AbortSignal
  /** Skip the global 401 broadcast (used by the login call itself). */
  silentUnauthorized?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE_URL}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue
    params.append(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    formData,
    query,
    auth = true,
    signal,
    silentUnauthorized = false,
  } = options

  const headers = new Headers()
  headers.set('Accept', 'application/json')
  // Never set Content-Type for FormData: the browser must add the multipart boundary.
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  if (auth) {
    const token = tokenStorage.get()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const payloadBody = formData ?? (body === undefined ? undefined : JSON.stringify(body))

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: payloadBody,
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw ApiError.network()
  }

  if (response.status === 204) return undefined as T

  const raw = await response.text()
  let payload: unknown = raw
  if (raw) {
    try {
      payload = JSON.parse(raw)
    } catch {
      payload = raw
    }
  }

  if (!response.ok) {
    // A proxy-generated 502/503/504 means the backend is down, not that the
    // request was invalid. Replace the empty proxy body with actionable copy.
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw ApiError.badGateway(response.status)
    }
    const { detail, errors } = extractDetail(payload, response.status)
    const error = new ApiError(response.status, detail, errors)
    if (error.kind === 'unauthorized' && auth && !silentUnauthorized) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    throw error
  }

  return payload as T
}
