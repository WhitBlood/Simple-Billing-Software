import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { AppSecrets, AppConfig } from './types';

let cachedSecrets: AppSecrets | null = null;

export function getAppConfig(): AppConfig {
  return {
    env: (process.env.ENV as 'local' | 'aws') || 'local',
    port: parseInt(process.env.PORT || '4000', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    awsSecretName: process.env.AWS_SECRET_NAME || 'billing-app-backend-secret',
  };
}

async function fetchAwsSecrets(config: AppConfig): Promise<AppSecrets> {
  const client = new SecretsManagerClient({ region: config.awsRegion });
  const command = new GetSecretValueCommand({ SecretId: config.awsSecretName });
  const response = await client.send(command);

  if (!response.SecretString) {
    throw new Error('AWS Secret is empty');
  }

  const parsed = JSON.parse(response.SecretString);
  return {
    DB_HOST: parsed.DB_HOST,
    DB_PORT: parseInt(parsed.DB_PORT || '5432', 10),
    DB_NAME: parsed.DB_NAME,
    DB_USER: parsed.DB_USER,
    DB_PASSWORD: parsed.DB_PASSWORD,
    JWT_SECRET: parsed.JWT_SECRET,
    JWT_EXPIRES_IN: parsed.JWT_EXPIRES_IN || '7d',
  };
}

function getLocalSecrets(): AppSecrets {
  return {
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
    DB_NAME: process.env.DB_NAME || 'billflow_db',
    DB_USER: process.env.DB_USER || 'billflow_admin',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    JWT_SECRET: process.env.JWT_SECRET || 'local-dev-secret',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  };
}

export async function getSecrets(): Promise<AppSecrets> {
  if (cachedSecrets) return cachedSecrets;

  const config = getAppConfig();

  if (config.env === 'aws') {
    console.log('🔐 Fetching secrets from AWS Secrets Manager...');
    cachedSecrets = await fetchAwsSecrets(config);
  } else {
    console.log('🔑 Loading secrets from local .env...');
    cachedSecrets = getLocalSecrets();
  }

  return cachedSecrets;
}
