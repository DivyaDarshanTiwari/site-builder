import express from 'express';
import { protect } from '../middlewares/auth.js';
import { applyTheme, deleteProject, getProjectById, getProjectPreview, getPublishedProjects, makeRevision, remixProject, rollbackToVersion, saveProjectCode, uploadAsset } from '../controllers/projectController.js';
import { upload } from '../middlewares/upload.js';

const projectRouter = express.Router();

projectRouter.post('/revision/:projectId', protect, makeRevision)
projectRouter.put('/save/:projectId', protect, saveProjectCode)
projectRouter.get('/rollback/:projectId/:versionId', protect, rollbackToVersion)
projectRouter.delete('/:projectId', protect, deleteProject)
projectRouter.get('/preview/:projectId', protect, getProjectPreview)
projectRouter.get('/published', getPublishedProjects)
projectRouter.get('/published/:projectId', getProjectById)
projectRouter.post('/remix/:projectId', protect, remixProject)

projectRouter.post('/theme/:projectId', protect, applyTheme)
projectRouter.post('/upload', protect, upload.single('asset'), uploadAsset)

export default projectRouter