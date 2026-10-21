import fs from 'fs';
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  }
}

import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

async function testR2() {
  const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME || 'call-recordings';

  console.log('Testing Cloudflare R2 connection...');
  console.log(`Account ID: ${accountId ? accountId.slice(0, 6) + '...' : 'MISSING'}`);
  console.log(`Access Key ID: ${accessKeyId ? accessKeyId.slice(0, 6) + '...' : 'MISSING'}`);
  console.log(`Bucket Name: ${bucketName}`);

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error('ERROR: Missing R2 environment variables in .env');
    process.exit(1);
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    console.log(`Pinging bucket "${bucketName}"...`);
    const listRes = await client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 5,
    }));
    console.log(`SUCCESS: Connected to R2 bucket "${bucketName}". Object count preview: ${listRes.KeyCount ?? 0}`);

    const testKey = 'test-ping.txt';
    console.log(`Testing write permission: uploading ${testKey}...`);
    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: Buffer.from('Cloudflare R2 test connection successful!'),
      ContentType: 'text/plain',
    }));
    console.log('SUCCESS: Write permission verified!');

    console.log(`Cleaning up test file ${testKey}...`);
    await client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    }));
    console.log('SUCCESS: Delete permission verified!');
    console.log('Cloudflare R2 is 100% ready for Call Audio Storage!');
  } catch (err: any) {
    console.error('R2 Connection Failed:', err?.message || err);
  }
}

testR2();

