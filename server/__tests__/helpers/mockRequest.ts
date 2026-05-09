import type { Request, Response } from 'express'
import { vi } from 'vitest'

/**
 * Creates a mock Express Request object.
 * Java analogy: like MockHttpServletRequest in Spring MVC tests.
 */
export const mockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  userId: 'user-123',
  params: {},
  body: {},
  headers: {},
  ...overrides,
})

/**
 * Creates a mock Express Response object with spies on json/status/send.
 * Java analogy: like MockHttpServletResponse in Spring MVC tests.
 */
export const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)   // Chainable: res.status(401).json(...)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  res.setHeader = vi.fn().mockReturnValue(res)
  return res
}
