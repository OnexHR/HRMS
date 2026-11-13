import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { R2_BUCKET, signGetUrl } from "../services/employee/s3.service.js";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  forcePathStyle: true,
});

export const getUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType, folderMain, folderSub } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: "fileName and fileType are required" });
    }

    const rootFolder = folderMain || 'trainers';
    const subFolder = folderSub || (fileType.startsWith('image/') ? 'profiles' : 'resumes');

    const key = `${rootFolder}/${subFolder}/${Date.now()}-${fileName}`;


    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
    res.json({ uploadUrl, key });
  } catch (err) {
    console.error("R2 Backend Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getDownloadUrl = async (req, res) => {
  try {
    const { fileKey } = req.body;
    const signedUrl = await signGetUrl(fileKey, { expiresIn: 3600 });
    res.json({ signedUrl });
  } catch (err) {
    res.status(500).json({ error: "Access denied" });
  }
};

// Delete File from R2
export const deleteFile = async (req, res) => {
  try {
    const { fileKey } = req.body;

    if (!fileKey) {
      return res.status(400).json({ error: "File key is required" });
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    });

    await s3.send(command);
    res.json({ message: "File deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: "Failed to delete file" });
  }
};
