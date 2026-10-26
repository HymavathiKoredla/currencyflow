import express from 'express';
import cors from 'cors';
import currencyRoutes from './routes/currencyRoutes.js';
import conversionRoutes from './routes/conversionRoutes.js';

const app = express();

// Cross-origin resource sharing
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CurrencyFlow Backend API',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api', currencyRoutes);
app.use('/api', conversionRoutes);

// Also mount root routes for convenience
app.use('/', currencyRoutes);
app.use('/', conversionRoutes);

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${status} - ${message}`);
  }

  res.status(status).json({
    success: false,
    error: message,
    status
  });
});

export default app;
