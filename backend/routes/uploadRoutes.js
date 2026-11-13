import express from 'express';
import { getDownloadUrl, getUploadUrl, deleteFile } from '../controllers/uploadController.js';

const router = express.Router();
router.post('/get-upload-url', getUploadUrl);
router.post('/get-download-url', getDownloadUrl);
router.delete("/delete-file", deleteFile);
export default router;

