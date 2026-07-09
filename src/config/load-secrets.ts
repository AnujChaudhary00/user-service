import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

/**
 * Fetches secrets from AWS Secrets Manager and merges them into process.env.
 * Set AWS_SECRET_NAME to enable this. If unset (local dev), this is a no-op
 * and the .env file loaded by dotenv/config is used instead.
 *
 * Secrets Manager secret must be a JSON object, e.g.:
 *   { "JWT_SECRET": "...", "DYNAMODB_TABLE_NAME": "...", ... }
 *
 * Explicit env vars always win — Secrets Manager values only fill gaps.
 */
export async function loadSecrets(): Promise<void> {
  const secretName = process.env.AWS_SECRET_NAME;
  if (!secretName) return;

  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION ?? 'us-east-1',
  });

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName }),
  );

  if (!response.SecretString) {
    throw new Error(`Secret "${secretName}" has no SecretString value`);
  }

  const secrets: Record<string, string> = JSON.parse(response.SecretString);

  for (const [key, value] of Object.entries(secrets)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
