import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 S3 client, shared by the upload routes and any other signer
// (e.g. task attachments). forcePathStyle is required for the R2 endpoint.
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

export const R2_BUCKET = process.env.R2_BUCKET_NAME;

// Sign a GET URL for an S3 key. `disposition: "inline"` makes PDFs and images
// open in the browser instead of downloading; `contentType` overrides the stored
// type so the browser renders it correctly.
export async function signGetUrl(key, { expiresIn = 3600, contentType, disposition = "inline" } = {}) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ResponseContentDisposition: disposition,
    ...(contentType ? { ResponseContentType: contentType } : {}),
  });
  return getSignedUrl(s3, command, { expiresIn });
}
