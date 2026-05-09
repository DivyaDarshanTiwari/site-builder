import { vi } from 'vitest'

/**
 * Shared Prisma mock — import this in every test file.
 * Java analogy: like a shared @MockBean in a Spring test base class.
 */

export const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  websiteProject: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  conversation: {
    create: vi.fn(),
  },
  version: {
    create: vi.fn(),
  },
}

// Mock the Prisma module so all controllers use this mock instead of the real DB
vi.mock('../../lib/prisma.js', () => ({
  default: mockPrisma,
}))
