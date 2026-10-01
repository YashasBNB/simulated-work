import { apiRequest } from './client'
import type { Role, TokenResponse, UserWithRole } from '../types/api'

/**
 * POST /api/v1/auth/login — email-only login, returns bearer token + profile.
 * The backend answers 404 for an unknown email, so the UI must render it as
 * "unknown account" rather than "invalid credentials".
 */
export function login(email: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: { email },
    auth: false,
    silentUnauthorized: true,
  })
}

/** GET /api/v1/auth/me — current profile with the resolved role. */
export function getCurrentUser(signal?: AbortSignal): Promise<UserWithRole> {
  return apiRequest<UserWithRole>('/api/v1/auth/me', { signal })
}

/** GET /api/v1/auth/roles — all roles and their permitted categories. */
export function getRoles(signal?: AbortSignal): Promise<Role[]> {
  return apiRequest<Role[]>('/api/v1/auth/roles', { signal })
}

/** GET /api/v1/auth/users — active platform users with assigned roles. */
export function getUsers(signal?: AbortSignal): Promise<UserWithRole[]> {
  return apiRequest<UserWithRole[]>('/api/v1/auth/users', { signal })
}
