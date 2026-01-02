require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
require('./config/firebase-admin'); // Initialize Firebase Admin

const app = express();

// Connect to MongoDB
connectDB();

// CORS Configuration - Multiple Origins Support
const allowedOrigins = [
  'https://www.bharatcloudtechnologies.online',
  'https://bharatcloudtechnologies.online',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000'
];

// Add origins from environment variable
if (process.env.FRONTEND_URL) {
  const envOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim());
  allowedOrigins.push(...envOrigins);
}

// Custom CORS Middleware (More flexible)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Security headers

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev')); // Logging

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/keys', require('./routes/api-keys'));
app.use('/api/admin', require('./routes/admin'));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Bharat Cloud API Backend',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      keys: '/api/keys',
      admin: '/api/admin'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   🚀 Bharat Cloud API Server Started  ║
  ╠════════════════════════════════════════╣
  ║   Environment: ${process.env.NODE_ENV || 'development'}              ║
  ║   Port: ${PORT}                           ║
  ║   Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}  ║
  ╠════════════════════════════════════════╣
  ║   Allowed Origins:                     ║
  ${allowedOrigins.slice(0, 3).map(o => `║   - ${o.padEnd(36)} ║`).join('\n')}
  ╚════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
