import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '@/contexts/Shared/infrastructure/config/env';

export type S3UploadResult = {
  key: string;
  url: string;
};

export class S3Storage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly forcePathStyle: boolean;
  private readonly publicBaseUrl: string | null;

  constructor() {
    if (!env.s3Endpoint || !env.s3Bucket || !env.s3AccessKey || !env.s3SecretKey) {
      throw new Error('S3 configuration is incomplete');
    }

    this.bucket = env.s3Bucket;
    this.endpoint = env.s3Endpoint;
    this.forcePathStyle = env.s3ForcePathStyle;

    // Prioritize S3_URL_DEV over S3_PUBLIC_BASE_URL if it exists
    const devUrl = env.s3UrlDev?.trim();
    const prodUrl = env.s3PublicBaseUrl?.trim();

    this.publicBaseUrl = devUrl || prodUrl || null;

    this.client = new S3Client({
      region: env.s3Region,
      endpoint: env.s3Endpoint,
      forcePathStyle: env.s3ForcePathStyle,
      credentials: {
        accessKeyId: env.s3AccessKey,
        secretAccessKey: env.s3SecretKey,
      },
    });
  }

  async uploadBuffer(params: {
    key: string;
    body: Buffer;
    contentType?: string | null;
  }): Promise<S3UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType ?? undefined,
      })
    );

    return {
      key: params.key,
      url: this.buildPublicUrl(params.key),
    };
  }

  private buildPublicUrl(key: string): string {
    if (this.publicBaseUrl) {
      const base = new URL(this.publicBaseUrl);
      const basePath = base.pathname.endsWith('/') ? base.pathname.slice(0, -1) : base.pathname;
      base.pathname = `${basePath}/${key}`;
      return base.toString();
    }

    const endpoint = new URL(this.endpoint);
    if (this.forcePathStyle) {
      endpoint.pathname = `/${this.bucket}/${key}`;
      return endpoint.toString();
    }

    return `${endpoint.protocol}//${this.bucket}.${endpoint.host}/${key}`;
  }
}
