import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export interface R2Config {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  publicUrl?: string;
}

export class R2StorageService {
  private client: S3Client | null = null;
  private bucketName: string = '';
  private publicUrl?: string;

  constructor(config?: R2Config) {
    this.initialize(config);
  }

  public initialize(config?: R2Config) {
    const clean = (val?: string) => (val || '').replace(/^\uFEFF/, '').trim();
    const accountId = clean(config?.accountId || process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID);
    const accessKeyId = clean(config?.accessKeyId || process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID);
    const secretAccessKey = clean(config?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY);
    this.bucketName = clean(config?.bucketName || process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME);
    const rawPublicUrl = config?.publicUrl || process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL;
    this.publicUrl = rawPublicUrl ? clean(rawPublicUrl) : undefined;

    if (accountId && accessKeyId && secretAccessKey && this.bucketName) {
      try {
        this.client = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
        console.log(`[R2 Storage Service] Initialized Cloudflare R2 client for bucket: "${this.bucketName}"`);
      } catch (err: any) {
        console.error('[R2 Storage Service] Failed to initialize S3Client:', err?.message);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  public isConfigured(): boolean {
    return this.client !== null && Boolean(this.bucketName);
  }

  public getStorageStatus() {
    return {
      enabled: this.isConfigured(),
      bucketName: this.bucketName || null,
      provider: 'Cloudflare R2 (S3 API)',
      hasPublicUrl: Boolean(this.publicUrl),
    };
  }

  /**
   * Uploads call audio recording buffer to Cloudflare R2
   */
  public async uploadCallAudio(
    callId: string,
    audioBuffer: Buffer,
    contentType: string = 'audio/wav'
  ): Promise<{ key: string; url?: string } | null> {
    if (!this.client || !this.bucketName) {
      return null;
    }

    const key = `recordings/${callId}.wav`;

    try {
      console.log(`[R2 Storage Service] Archiving call audio to Cloudflare R2: s3://${this.bucketName}/${key} (${audioBuffer.length} bytes)...`);
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: audioBuffer,
          ContentType: contentType,
          Metadata: {
            callId,
            archivedAt: new Date().toISOString(),
          },
        })
      );

      const publicUrl = this.publicUrl ? `${this.publicUrl.replace(/\/$/, '')}/${key}` : undefined;
      console.log(`[R2 Storage Service] Successfully archived call audio to R2: ${key}`);
      return { key, url: publicUrl };
    } catch (err: any) {
      console.error(`[R2 Storage Service] Failed to upload audio to R2 for call ${callId}:`, err?.message);
      return null;
    }
  }

  /**
   * Retrieves call audio from Cloudflare R2
   */
  public async getCallAudio(callId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!this.client || !this.bucketName) {
      return null;
    }

    const key = `recordings/${callId}.wav`;

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );

      if (!response.Body) {
        return null;
      }

      // Convert stream to Buffer
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      const contentType = response.ContentType || 'audio/wav';

      console.log(`[R2 Storage Service] Served call recording directly from Cloudflare R2 for call: ${callId}`);
      return { buffer, contentType };
    } catch (err: any) {
      // If object not found (NoSuchKey / 404), return null so fallback to Sarvam can happen
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      console.warn(`[R2 Storage Service] Error reading audio for call ${callId} from R2:`, err?.message);
      return null;
    }
  }

  /**
   * Checks if audio recording already exists in Cloudflare R2
   */
  public async hasCallAudio(callId: string): Promise<boolean> {
    if (!this.client || !this.bucketName) {
      return false;
    }

    const key = `recordings/${callId}.wav`;

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}

export const r2StorageService = new R2StorageService();

