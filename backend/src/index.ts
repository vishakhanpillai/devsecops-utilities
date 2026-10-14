import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Server } from 'http';
import { sonarRouter } from './routes/sonar.routes';
import { subdomainRouter } from './routes/subdomain.routes';

// Allow internal / self-signed SSL certificates commonly used in on-premise SonarQube servers
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'DevSecOps Utilities Suite',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api', sonarRouter);
app.use('/api', subdomainRouter);

// Serve static frontend build from ../../frontend/dist with no-cache headers
const staticDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(
  express.static(staticDistPath, {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    },
  })
);

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.sendFile(path.join(staticDistPath, 'index.html'));
});

// Start server with automatic port retry if port is occupied
function startServer(port: number, maxRetries = 10): void {
  const server: Server = app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 DevSecOps Utilities Suite Server is LIVE!`);
    console.log(`👉 Access URL: http://localhost:${port}`);
    console.log(`🛡️  SonarQube API: http://localhost:${port}/api/proxy`);
    console.log(`🌐 Subdomain API: http://localhost:${port}/api/scan/stream`);
    console.log(`======================================================\n`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${port} is currently in use.`);
      if (maxRetries > 0) {
        const nextPort = port + 1;
        console.log(`🔄 Attempting next available port: ${nextPort}...`);
        startServer(nextPort, maxRetries - 1);
      } else {
        console.error(`❌ Could not find an available port after multiple retries.`);
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer(DEFAULT_PORT);
