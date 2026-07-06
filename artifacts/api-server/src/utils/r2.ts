import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
} = process.env;

export const isR2Available = !!(
  R2_ACCOUNT_ID &&
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY
);

export const r2Client = isR2Available
  ? new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

export const R2_BUCKET = R2_BUCKET_NAME ?? "tmh-uploads";
// Public URL for serving uploaded files (e.g. https://pub-xxx.r2.dev or custom domain)
export { R2_PUBLIC_URL };

/**
 * Upload a buffer to R2 under the given key. Throws if R2 isn't configured.
 */
export async function uploadBuffer(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  if (!r2Client) {
    throw new Error("R2 is not configured (missing R2_* env vars)");
  }
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}
