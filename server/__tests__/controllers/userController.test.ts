import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../helpers/mockPrisma.js'
import { mockRequest, mockResponse } from '../helpers/mockRequest.js'

// Mock OpenAI before importing the controller
vi.mock('../../configs/openai.js', () => ({
  default: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}))

// Import after mocks are set up
import {
  getUserCredits,
  createUserProject,
  getUserProject,
  getUserProjects,
  togglePublish,
} from '../../controllers/userController.js'
import openai from '../../configs/openai.js'

const mockOpenai = openai as any

// ─────────────────────────────────────────────
// getUserCredits
// ─────────────────────────────────────────────
describe('getUserCredits', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when userId is missing', async () => {
    const req = mockRequest({ userId: undefined })
    const res = mockResponse()

    await getUserCredits(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' })
  })

  it('returns credits when user exists', async () => {
    const req = mockRequest({ userId: 'user-123' })
    const res = mockResponse()
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123', credits: 15 })

    await getUserCredits(req as any, res as any)

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-123' } })
    expect(res.json).toHaveBeenCalledWith({ credits: 15 })
  })

  it('returns null credits when user not found', async () => {
    const req = mockRequest({ userId: 'ghost-user' })
    const res = mockResponse()
    mockPrisma.user.findUnique.mockResolvedValue(null)

    await getUserCredits(req as any, res as any)

    expect(res.json).toHaveBeenCalledWith({ credits: null })
  })

  it('returns 500 on DB error', async () => {
    const req = mockRequest({ userId: 'user-123' })
    const res = mockResponse()
    mockPrisma.user.findUnique.mockRejectedValue(new Error('DB connection failed'))

    await getUserCredits(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'DB connection failed' })
  })
})

// ─────────────────────────────────────────────
// createUserProject
// ─────────────────────────────────────────────
describe('createUserProject', () => {
  const fakeProject = { id: 'proj-abc', name: 'Build me a landing page' }

  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when userId is missing', async () => {
    const req = mockRequest({ userId: undefined, body: { initial_prompt: 'hello' } })
    const res = mockResponse()

    await createUserProject(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' })
  })

  it('creates project and responds with projectId immediately', async () => {
    const req = mockRequest({
      userId: 'user-123',
      body: { initial_prompt: 'Build me a landing page' },
    })
    const res = mockResponse()

    mockPrisma.websiteProject.create.mockResolvedValue(fakeProject)
    mockPrisma.user.update.mockResolvedValue({})
    mockPrisma.conversation.create.mockResolvedValue({})
    mockPrisma.version.create.mockResolvedValue({ id: 'ver-1' })
    mockPrisma.websiteProject.update.mockResolvedValue({})

    mockOpenai.chat.completions.create
      .mockResolvedValueOnce({ choices: [{ message: { content: 'Enhanced prompt text' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: '<html>...</html>' } }] })

    await createUserProject(req as any, res as any)

    expect(res.json).toHaveBeenCalledWith({ projectId: 'proj-abc' })
  })

  it('handles empty code generation from AI', async () => {
    const req = mockRequest({
      userId: 'user-123',
      body: { initial_prompt: 'Build me a landing page' },
    })
    const res = mockResponse()

    mockPrisma.websiteProject.create.mockResolvedValue(fakeProject)
    mockPrisma.user.update.mockResolvedValue({})
    mockPrisma.conversation.create.mockResolvedValue({})
    mockPrisma.version.create.mockResolvedValue({ id: 'ver-1' })
    mockPrisma.websiteProject.update.mockResolvedValue({})

    mockOpenai.chat.completions.create
      .mockResolvedValueOnce({ choices: [{ message: { content: 'Enhanced prompt text' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: '' } }] }) // Empty code

    await createUserProject(req as any, res as any)

    // Check if conversation create was called for "Unable to generate the code"
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: 'Unable to generate the code, please try again',
        }),
      })
    )
  })

  it('returns 500 on DB error', async () => {
    const req = mockRequest({ userId: 'user-123', body: { initial_prompt: 'hi' } })
    const res = mockResponse()
    mockPrisma.websiteProject.create.mockRejectedValue(new Error('DB connection failed'))

    await createUserProject(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'DB connection failed' })
  })
})

// ─────────────────────────────────────────────
// getUserProject
// ─────────────────────────────────────────────
describe('getUserProject', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when userId is missing', async () => {
    const req = mockRequest({ userId: undefined, params: { projectId: 'proj-1' } })
    const res = mockResponse()

    await getUserProject(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns project with conversation and versions', async () => {
    const fakeProject = {
      id: 'proj-1',
      conversation: [{ role: 'user', content: 'Hello' }],
      versions: [{ id: 'v1', code: '<html/>' }],
    }
    const req = mockRequest({ userId: 'user-123', params: { projectId: 'proj-1' } })
    const res = mockResponse()
    mockPrisma.websiteProject.findUnique.mockResolvedValue(fakeProject)

    await getUserProject(req as any, res as any)

    expect(res.json).toHaveBeenCalledWith({ project: fakeProject })
  })

  it('returns 500 on DB error', async () => {
    const req = mockRequest({ userId: 'user-123', params: { projectId: 'proj-1' } })
    const res = mockResponse()
    mockPrisma.websiteProject.findUnique.mockRejectedValue(new Error('Timeout'))

    await getUserProject(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Timeout' })
  })
})

// ─────────────────────────────────────────────
// getUserProjects
// ─────────────────────────────────────────────
describe('getUserProjects', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns list of projects for the user', async () => {
    const projects = [{ id: 'p1' }, { id: 'p2' }]
    const req = mockRequest({ userId: 'user-123' })
    const res = mockResponse()
    mockPrisma.websiteProject.findMany.mockResolvedValue(projects)

    await getUserProjects(req as any, res as any)

    expect(res.json).toHaveBeenCalledWith({ projects })
  })

  it('returns 500 on DB error', async () => {
    const req = mockRequest({ userId: 'user-123' })
    const res = mockResponse()
    mockPrisma.websiteProject.findMany.mockRejectedValue(new Error('Timeout'))

    await getUserProjects(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Timeout' })
  })
})

// ─────────────────────────────────────────────
// togglePublish
// ─────────────────────────────────────────────
describe('togglePublish', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 when project not found', async () => {
    const req = mockRequest({ userId: 'user-123', params: { projectId: 'missing' } })
    const res = mockResponse()
    mockPrisma.websiteProject.findUnique.mockResolvedValue(null)

    await togglePublish(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('publishes an unpublished project', async () => {
    const req = mockRequest({ userId: 'user-123', params: { projectId: 'proj-1' } })
    const res = mockResponse()
    mockPrisma.websiteProject.findUnique.mockResolvedValue({ id: 'proj-1', isPublished: false })
    mockPrisma.websiteProject.update.mockResolvedValue({})

    await togglePublish(req as any, res as any)

    expect(mockPrisma.websiteProject.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: { isPublished: true },
    })
    expect(res.json).toHaveBeenCalledWith({ message: 'Project Published Successfully' })
  })

  it('returns 500 on DB error', async () => {
    const req = mockRequest({ userId: 'user-123', params: { projectId: 'p1' } })
    const res = mockResponse()
    mockPrisma.websiteProject.findUnique.mockRejectedValue(new Error('Timeout'))

    await togglePublish(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Timeout' })
  })
})
