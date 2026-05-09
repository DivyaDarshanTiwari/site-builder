import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'

// Mock fs to track mkdirSync
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
  },
}))

const { capturedStorageArgs, capturedMulterArgs } = vi.hoisted(() => {
  return {
    capturedStorageArgs: {} as any,
    capturedMulterArgs: {} as any,
  }
})

// Mock multer BEFORE importing the module
vi.mock('multer', () => {
  return {
    default: Object.assign(
      (args: any) => {
        Object.assign(capturedMulterArgs, args)
        return 'mocked-upload-instance'
      },
      {
        diskStorage: (args: any) => {
          Object.assign(capturedStorageArgs, args)
          return 'mocked-storage-instance'
        }
      }
    )
  }
})

import { upload } from '../../middlewares/upload.js'

describe('Upload Middleware', () => {
  it('creates uploads directory if it does not exist', () => {
    expect(fs.mkdirSync).toHaveBeenCalled()
  })

  it('configures multer correctly', () => {
    expect(upload).toBe('mocked-upload-instance')
    expect(capturedMulterArgs.storage).toBe('mocked-storage-instance')
    expect(capturedMulterArgs.limits.fileSize).toBe(5 * 1024 * 1024)
  })

  it('accepts valid image types', () => {
    const cb = vi.fn()
    const req = {}
    const file = { mimetype: 'image/png' }
    
    capturedMulterArgs.fileFilter(req, file, cb)
    expect(cb).toHaveBeenCalledWith(null, true)
  })

  it('rejects invalid file types', () => {
    const cb = vi.fn()
    const req = {}
    const file = { mimetype: 'application/pdf' }
    
    capturedMulterArgs.fileFilter(req, file, cb)
    expect(cb).toHaveBeenCalledWith(expect.any(Error))
  })

  it('tests diskStorage destination callback', () => {
    const cb = vi.fn()
    capturedStorageArgs.destination({}, {}, cb)
    expect(cb).toHaveBeenCalledWith(null, expect.stringContaining('uploads'))
  })

  it('tests diskStorage filename callback', () => {
    const cb = vi.fn()
    const file = { fieldname: 'testfile', originalname: 'test.jpg' }
    capturedStorageArgs.filename({}, file, cb)
    expect(cb).toHaveBeenCalledWith(null, expect.stringMatching(/^testfile-\d+-\d+\.jpg$/))
  })
})
