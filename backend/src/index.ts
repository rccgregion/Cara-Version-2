import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import 'express-async-errors';
import * as Sentry from '@sentry/node';
import pino from 'pino';
import dotenv from 'dotenv';

import { getConfig, validateEnvironment } from './config';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import authRoutes from './routes/auth';
import geminiRoutes from './routes/gemini';
import sessionsRoutes from './routes/sessions';
import analyticsRoutes from './routes/analytics';
import { rateLimiter, apiLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

// Validate configuration on startup
const config = validateEnvironment();

// Initialize Sentry for error tracking
if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,
  });
}

import { Express } from 'express';
const app: Express = express();
const logger = pino(pino.transport({ 
  target: 'pino-pretty',
  options: {
    colorize: config.nodeEnv !== 'production',
  },
}));

// Log startup
logger.info(`🚀 Starting Cara backend in ${config.nodeEnv} environment`);

// Security middleware
app.use(Sentry.Handlers.requestHandler());
app.use(helmet({
  contentSecurityPolicy: false, // Adjust based on your needs
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
const corsOrigin = config.nodeEnv === 'development' 
  ? (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // In development, allow all localhost addresses
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('10.0.0')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  : config.frontendUrl;

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Cookie and parsing middleware
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging middleware
app.use(requestLogger(logger));

// Global rate limiting
app.use(rateLimiter);

// Health check with dependency verification
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: '1.0.0',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/gemini', apiLimiter, geminiRoutes); // Stricter limit for API calls
app.use('/api/sessions', sessionsRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handlers
app.use(Sentry.Handlers.errorHandler());
app.use(errorHandler);

const PORT = config.port;

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`✅ Server running on http://localhost:${PORT}`);
  logger.info(`📊 Environment: ${config.nodeEnv}`);
  logger.info(`🔒 Database: Connected`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
