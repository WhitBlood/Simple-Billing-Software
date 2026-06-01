export interface AppSecrets {
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

export interface AppConfig {
  env: 'local' | 'aws';
  port: number;
  frontendUrl: string;
  awsRegion: string;
  awsSecretName: string;
}
