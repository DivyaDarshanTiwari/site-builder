import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../helpers/mockPrisma.js'
import { mockRequest, mockResponse } from '../helpers/mockRequest.js'

vi.mock('../../configs/openai.js', () => ({
  default: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}))

import {
  makeRevision,
  saveProjectCode,
  rollbackToVersion,
  deleteProject,
  getProjectPreview,
  getPublishedProjects,
  getProjectById,
  remixProject,
  applyTheme,
  uploadAsset,
} from '../../controllers/projectController.js'
import openai from '../../configs/openai.js'

const mockOpenai = openai as any

describe('projectController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('makeRevision', () => {
    it('returns 401 if user not authenticated', async () => {
      const req = mockRequest({ userId: undefined })
      const res = mockResponse()
      await makeRevision(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 if message is empty', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' }, body: { message: '' } })
      const res = mockResponse()
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' })
      await makeRevision(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('processes revision and returns OK', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' }, body: { message: 'update this' } })
      const res = mockResponse()

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' })
      mockPrisma.websiteProject.findUnique.mockResolvedValue({ id: 'p1', current_code: '<html></html>', userId: 'u1' })
      mockPrisma.conversation.create.mockResolvedValue({})
      mockPrisma.version.create.mockResolvedValue({ id: 'v1' })
      mockPrisma.websiteProject.update.mockResolvedValue({})
      
      mockOpenai.chat.completions.create
        .mockResolvedValueOnce({ choices: [{ message: { content: 'enhanced prompt' } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: '<html new></html>' } }] })

      await makeRevision(req as any, res as any)

      expect(res.json).toHaveBeenCalledWith({ message: 'Changes made successfully' })
      expect(mockOpenai.chat.completions.create).toHaveBeenCalled()
    })
  })

  describe('rollbackToVersion', () => {
    it('returns 401 if unauthorized', async () => {
      const req = mockRequest({ userId: undefined })
      const res = mockResponse()
      await rollbackToVersion(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 404 if project not found', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1', versionId: 'v1' } })
      const res = mockResponse()
      mockPrisma.websiteProject.findUnique.mockResolvedValue(null)
      await rollbackToVersion(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 404 if version not found', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1', versionId: 'v2' } })
      const res = mockResponse()
      mockPrisma.websiteProject.findUnique.mockResolvedValue({ versions: [{ id: 'v1' }] })
      await rollbackToVersion(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('rolls back successfully', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1', versionId: 'v1' } })
      const res = mockResponse()
      mockPrisma.websiteProject.findUnique.mockResolvedValue({ versions: [{ id: 'v1', code: 'old code' }] })
      mockPrisma.websiteProject.update.mockResolvedValue({})
      mockPrisma.conversation.create.mockResolvedValue({})

      await rollbackToVersion(req as any, res as any)

      expect(mockPrisma.websiteProject.update).toHaveBeenCalledWith({
        where: { id: 'p1', userId: 'u1' },
        data: { current_code: 'old code', current_version_index: 'v1' }
      })
      expect(res.json).toHaveBeenCalledWith({ message: 'Version rolled back' })
    })
  })

  describe('saveProjectCode', () => {
    it('saves code successfully', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' }, body: { code: 'new code' } })
      const res = mockResponse()

      mockPrisma.websiteProject.findUnique.mockResolvedValue({ id: 'p1' })
      mockPrisma.websiteProject.update.mockResolvedValue({})
      mockPrisma.version.create.mockResolvedValue({ id: 'v2' })

      await saveProjectCode(req as any, res as any)

      expect(res.json).toHaveBeenCalledWith({ message: 'Project saved successfully' })
    })

    it('returns 400 if code missing', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' }, body: { code: '' } })
      const res = mockResponse()

      await saveProjectCode(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 500 on DB error', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' }, body: { code: 'code' } })
      const res = mockResponse()
      mockPrisma.websiteProject.findUnique.mockRejectedValue(new Error('DB Error'))
      await saveProjectCode(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('deleteProject', () => {
    it('deletes project and related data', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' } })
      const res = mockResponse()

      // Prisma transaction mock
      mockPrisma.websiteProject.delete.mockResolvedValue({})

      await deleteProject(req as any, res as any)

      expect(res.json).toHaveBeenCalledWith({ message: 'Project deleted successfully' })
    })
  })

  describe('applyTheme', () => {
    it('returns 400 if theme missing', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' }, body: { theme: '' } })
      const res = mockResponse()
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' })
      await applyTheme(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('applies theme successfully', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' }, body: { theme: 'Dark Mode' } })
      const res = mockResponse()
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' })
      mockPrisma.websiteProject.findFirst.mockResolvedValue({ id: 'p1', current_code: '<html></html>' })
      
      mockOpenai.chat.completions.create.mockResolvedValueOnce({ choices: [{ message: { content: '<html dark></html>' } }] })
      mockPrisma.version.create.mockResolvedValue({ id: 'v1' })
      mockPrisma.websiteProject.update.mockResolvedValue({})

      await applyTheme(req as any, res as any)

      expect(res.json).toHaveBeenCalledWith({ message: 'Theme "Dark Mode" applied successfully' })
    })

    it('returns 401 if user not found', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' }, body: { theme: 'Dark Mode' } })
      const res = mockResponse()
      mockPrisma.user.findUnique.mockResolvedValue(null)
      await applyTheme(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 404 if project has no code', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' }, body: { theme: 'Dark Mode' } })
      const res = mockResponse()
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' })
      mockPrisma.websiteProject.findFirst.mockResolvedValue({ id: 'p1', current_code: '' })
      await applyTheme(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 500 if AI code generation fails', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' }, body: { theme: 'Dark Mode' } })
      const res = mockResponse()
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' })
      mockPrisma.websiteProject.findFirst.mockResolvedValue({ id: 'p1', current_code: '<html></html>' })
      
      mockOpenai.chat.completions.create.mockResolvedValueOnce({ choices: [{ message: { content: '' } }] })

      await applyTheme(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getProjectPreview', () => {
    it('returns 404 if project not found', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' } })
      const res = mockResponse()
      mockPrisma.websiteProject.findFirst.mockResolvedValue(null)
      await getProjectPreview(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns project preview code', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' } })
      const res = mockResponse()
      mockPrisma.websiteProject.findFirst.mockResolvedValue({ current_code: 'preview' })
      await getProjectPreview(req as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ project: { current_code: 'preview' } })
    })
  })

  describe('getPublishedProjects', () => {
    it('returns published projects', async () => {
      const req = mockRequest()
      const res = mockResponse()
      mockPrisma.websiteProject.findMany.mockResolvedValue([{ id: 'p1' }])
      await getPublishedProjects(req as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ projects: [{ id: 'p1' }] })
    })
  })

  describe('getProjectById', () => {
    it('returns 404 if project not found or not published', async () => {
      const req = mockRequest({ params: { projectId: 'p1' } })
      const res = mockResponse()
      mockPrisma.websiteProject.findFirst.mockResolvedValue({ isPublished: false })
      await getProjectById(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns project code if published', async () => {
      const req = mockRequest({ params: { projectId: 'p1' } })
      const res = mockResponse()
      mockPrisma.websiteProject.findFirst.mockResolvedValue({ isPublished: true, current_code: 'public code' })
      await getProjectById(req as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ code: 'public code' })
    })
  })

  describe('remixProject', () => {
    it('returns 401 if unauthorized', async () => {
      const req = mockRequest({ userId: undefined })
      const res = mockResponse()
      await remixProject(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('remixes project successfully', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' } })
      const res = mockResponse()

      mockPrisma.websiteProject.findFirst.mockResolvedValue({ id: 'p1', current_code: 'code', initial_prompt: 'prompt' })
      mockPrisma.websiteProject.create.mockResolvedValue({ id: 'new_p' })
      mockPrisma.version.create.mockResolvedValue({ id: 'v1' })
      mockPrisma.websiteProject.update.mockResolvedValue({})
      mockPrisma.conversation.create.mockResolvedValue({})
      mockPrisma.user.update.mockResolvedValue({})

      await remixProject(req as any, res as any)

      expect(res.json).toHaveBeenCalledWith({ projectId: 'new_p' })
    })

    it('returns 404 if published project has no code', async () => {
      const req = mockRequest({ userId: 'u1', params: { projectId: 'p1' } })
      const res = mockResponse()
      mockPrisma.websiteProject.findFirst.mockResolvedValue({ id: 'p1', current_code: null })
      await remixProject(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('uploadAsset', () => {
    it('returns 401 if unauthorized', async () => {
      const req = mockRequest({ userId: undefined })
      const res = mockResponse()
      await uploadAsset(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 if no file', async () => {
      const req = mockRequest({ userId: 'u1' }) // no req.file
      const res = mockResponse()
      await uploadAsset(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns file URL successfully', async () => {
      const req = mockRequest({ userId: 'u1' })
      // @ts-ignore
      req.file = { filename: 'test.jpg', originalname: 'test.jpg' }
      const res = mockResponse()

      await uploadAsset(req as any, res as any)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'File uploaded successfully',
        url: expect.stringContaining('test.jpg')
      }))
    })

    it('returns 500 on DB error', async () => {
      const req = mockRequest({ userId: 'u1' })
      // @ts-ignore
      req.file = { filename: 'test.jpg', originalname: 'test.jpg' }
      const res = mockResponse()
      // mock a failure on res.json just to trigger catch, or mock some other internal fail.
      // since there is no db call, we can force error by making res.json throw.
      res.json = vi.fn().mockImplementationOnce(() => { throw new Error('fail') }).mockReturnValue(res)
      
      await uploadAsset(req as any, res as any)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
