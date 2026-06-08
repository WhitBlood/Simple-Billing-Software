import dotenv from 'dotenv';
// Only load .env file in local development (not in Kubernetes/containers)
// Kubernetes always sets KUBERNETES_SERVICE_HOST environment variable
if (!process.env.KUBERNETES_SERVICE_HOST) {
  dotenv.config();
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import morgan from 'morgan';

import { getAppConfig, getSecrets } from './config/secrets';
import { initDatabase } from './config/database';
import { generalLimiter } from './middleware/rateLimiter';
import { requireDb } from './middleware/requireDb';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import healthRouter from './routes/health';
import authRouter from './routes/auth';
import billsRouter from './routes/bills';

async function bootstrap() {
  const config = getAppConfig();
  const app = express();

  // ─── SECURITY ───────────────────────────────────────────
  app.use(helmet());                          // Security headers
  app.use(hpp());                             // HTTP parameter pollution
  app.use(compression());                     // Gzip
  app.use(generalLimiter);                    // DDoS rate limiting
  app.disable('x-powered-by');                // Hide Express

  // ─── CORS ───────────────────────────────────────────────
  app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ─── BODY PARSING ───────────────────────────────────────
  app.use(express.json({ limit: '10kb' }));   // Limit payload size (DDoS protection)
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  // ─── LOGGING ────────────────────────────────────────────
  app.use(morgan(config.env === 'aws' ? 'combined' : 'dev'));

  // ─── ROUTES ─────────────────────────────────────────────
  app.use('/api/health', healthRouter);                       // Health — always available
  app.use('/api/auth', requireDb, authRouter);                // Auth — needs DB
  app.use('/api/bills', requireDb, billsRouter);              // Bills — needs DB

  // ─── ERROR HANDLING ─────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ─── START ──────────────────────────────────────────────
  // Load secrets + attempt DB connection (server starts regardless)
  try {
    const secrets = await getSecrets();
    await initDatabase(secrets);
  } catch (err) {
    console.warn('⚠️  Could not initialize database:', (err as Error).message);
    console.warn('   Server will start WITHOUT database connectivity.');
  }

  app.listen(config.port, () => {
    console.log(`\n🚀 BillFlow API running on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.env}`);
    console.log(`   Health check: http://localhost:${config.port}/api/health\n`);
  });
}

bootstrap().catch((err) => {
  console.error('💥 Fatal startup error:', err);
  process.exit(1);
});

