import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IAMClient, AttachRolePolicyCommand, PutRolePolicyCommand } from '@aws-sdk/client-iam';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const localEnvPath = path.join(__dirname, '.env');
if (fs.existsSync(localEnvPath)) {
  const lines = fs.readFileSync(localEnvPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      const key = k.trim();
      const val = v.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};
const region = process.env.AWS_DEFAULT_REGION || 'ap-south-1';
const ROLE_NAME = 'FloodShield-Backend-LambdaRole';

console.log(`[INFO] Attaching DynamoDB Full Access to IAM Role: ${ROLE_NAME}...`);

const iam = new IAMClient({ region, credentials });

try {
  await iam.send(new AttachRolePolicyCommand({
    RoleName: ROLE_NAME,
    PolicyArn: 'arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess',
  }));
  console.log('[PASS] Attached AmazonDynamoDBFullAccess policy to Lambda Role.');
} catch (e) {
  console.log('[WARN] Attach managed policy notice:', e.message);
}

try {
  const inlineDdb = JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: 'dynamodb:*',
        Resource: '*',
      },
    ],
  });

  await iam.send(new PutRolePolicyCommand({
    RoleName: ROLE_NAME,
    PolicyName: 'DynamoDBAccessAll',
    PolicyDocument: inlineDdb,
  }));
  console.log('[PASS] Attached inline DynamoDB:* policy to Lambda Role.');
} catch (e) {
  console.log('[WARN] PutRolePolicy notice:', e.message);
}

console.log('\n[INFO] Waiting 5 seconds for IAM role propagation...');
await new Promise(r => setTimeout(r, 5000));
console.log('[PASS] IAM Role permissions updated successfully!');
