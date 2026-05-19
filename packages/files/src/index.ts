import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { loadEnv } from '@aura/config';

let cachedClient: S3Client | undefined;

export function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;
  const env = loadEnv();
  cachedClient = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE ?? true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
  });
  return cachedClient;
}

export function resetS3ClientCache(): void {
  cachedClient = undefined;
}

export interface PieceObjectKeyInput {
  tenantId: string;
  pieceId: string;
  filename: string;
  variant?: 'thumb' | 'medium' | 'original';
}

/// `aura/<tenant>/pieces/<piece>/[variant-]uuid.ext`
export function buildPieceObjectKey(input: PieceObjectKeyInput): string {
  const variantPrefix = input.variant && input.variant !== 'original' ? `${input.variant}-` : '';
  return `aura/${input.tenantId}/pieces/${input.pieceId}/${variantPrefix}${input.filename}`;
}

const DEFAULT_GET_TTL_SECONDS = 15 * 60;
const DEFAULT_PUT_TTL_SECONDS = 5 * 60;

export async function presignGet(key: string, ttlSeconds = DEFAULT_GET_TTL_SECONDS): Promise<string> {
  const env = loadEnv();
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(getS3Client(), command, { expiresIn: ttlSeconds });
}

export async function presignPut(
  key: string,
  contentType: string,
  ttlSeconds = DEFAULT_PUT_TTL_SECONDS,
): Promise<string> {
  const env = loadEnv();
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: ttlSeconds });
}

export async function deleteObject(key: string): Promise<void> {
  const env = loadEnv();
  await getS3Client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const env = loadEnv();
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}
