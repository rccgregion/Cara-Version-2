/**
 * Environment validation and configuration
 * Ensures all required environment variables are set and validates their values
 */

export interface AppConfig {
  env: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  geminiApiKey: string;
  frontendUrl: string;
  sentryDsn: string;
  nodeEnv: 'development' | 'staging' | 'production';
}

/**
 * Validate that all required environment variables are set
 */
export const validateEnvironment = (): AppConfig => {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'GEMINI_API_KEY',
  ];

  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please set them in your .env file before running the application.`
    );
  }

  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production';

  // Additional validation for production
  if (nodeEnv === 'production') {
    const productionVars = ['SENTRY_DSN'];
    const missingProd = productionVars.filter(v => !process.env[v]);
    
    if (missingProd.length > 0) {
      console.warn(
        `⚠️  Missing production environment variables: ${missingProd.join(', ')}`
      );
    }

    // Verify JWT secrets are strong in production
    if (process.env.JWT_SECRET!.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    if (process.env.JWT_REFRESH_SECRET!.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in production');
    }
  }

  return {
    env: process.env.ENV || 'default',
    port: parseInt(process.env.PORT || '3001', 10),
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
    geminiApiKey: process.env.GEMINI_API_KEY!,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    sentryDsn: process.env.SENTRY_DSN || '',
    nodeEnv,
  };
};

/**
 * Get configuration singleton
 */
let config: AppConfig | null = null;

export const getConfig = (): AppConfig => {
  if (!config) {
    config = validateEnvironment();
  }
  return config;
};
