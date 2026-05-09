import { describe, it, expect, vi, beforeEach } from 'vitest'
import { protect } from '../../middlewares/auth.js'
import { mockRequest, mockResponse } from '../helpers/mockRequest.js'
import { auth } from '../../lib/auth.js'

vi.mock('../../lib/auth.js', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

describe('Auth Middleware - protect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls next() and sets req.userId when session is valid', async () => {
    const req = mockRequest({ headers: { cookie: 'session=123' } })
    const res = mockResponse()
    const next = vi.fn()

    // @ts-ignore
    auth.api.getSession.mockResolvedValue({ user: { id: 'user-123' } })

    await protect(req as any, res as any, next)

    expect(auth.api.getSession).toHaveBeenCalled()
    expect(req.userId).toBe('user-123')
    expect(next).toHaveBeenCalled()
  })

  it('returns 401 when there is no session', async () => {
    const req = mockRequest()
    const res = mockResponse()
    const next = vi.fn()

    // @ts-ignore
    auth.api.getSession.mockResolvedValue(null)

    await protect(req as any, res as any, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized user' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when there is an error getting session', async () => {
    const req = mockRequest()
    const res = mockResponse()
    const next = vi.fn()

    // @ts-ignore
    auth.api.getSession.mockRejectedValue(new Error('Auth failed'))

    await protect(req as any, res as any, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Auth failed' })
    expect(next).not.toHaveBeenCalled()
  })
})
