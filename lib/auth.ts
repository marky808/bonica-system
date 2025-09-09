import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

export interface UserPayload {
  userId: string
  email: string
  role: string
}

export function verifyJWTToken(token: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload
    return decoded
  } catch (error) {
    return null
  }
}

export function getAuthUser(request: NextRequest): UserPayload | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyJWTToken(token)
}

export function requireAuth(request: NextRequest): UserPayload {
  const user = getAuthUser(request)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

export function requireAdmin(request: NextRequest): UserPayload {
  const user = requireAuth(request)
  if (user.role !== 'ADMIN') {
    throw new Error('Admin access required')
  }
  return user
}

// New async verifyToken function for API routes
export async function verifyToken(request: Request): Promise<UserPayload | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload
    return decoded
  } catch (error) {
    return null
  }
}