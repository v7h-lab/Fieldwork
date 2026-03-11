import { Storage } from '@google-cloud/storage';

function getStorage() {
    const key = process.env.GCS_SERVICE_ACCOUNT_KEY;
    if (!key) throw new Error('GCS_SERVICE_ACCOUNT_KEY not configured');
    return new Storage({ credentials: JSON.parse(key) });
}

function getBucket() {
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) throw new Error('GCS_BUCKET_NAME not configured');
    return getStorage().bucket(bucketName);
}

export async function getUploadUrl(filePath: string): Promise<string> {
    const bucket = getBucket();
    const [url] = await bucket.file(filePath).getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000,
        contentType: 'video/webm',
    });
    return url;
}

export async function getPlaybackUrl(filePath: string): Promise<string> {
    const bucket = getBucket();
    const [url] = await bucket.file(filePath).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000,
    });
    return url;
}
