require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { upsertDraftSignup, submitSignup, getSignupByClientId } = require('./db/queries');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline styles/scripts for our static HTML
}));

// CORS configuration - prefer same-origin, but allow for development
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://binaai.ai', 'https://app.binaai.ai']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for frontend assets
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname, {
  index: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database health check (optional)
app.get('/api/health/db', async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    res.json({ 
      ok: true, 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({ 
      ok: false, 
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Utility function to validate UUID
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Utility function to trim and validate non-empty string
function validateString(str, fieldName, required = true) {
  if (typeof str !== 'string') {
    if (required) throw new Error(`${fieldName} must be a string`);
    return null;
  }
  
  const trimmed = str.trim();
  if (required && trimmed.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
  
  return trimmed.length > 0 ? trimmed : null;
}

// POST /api/idea-draft - Silent draft saves by client_id
app.post('/api/idea-draft', async (req, res) => {
  try {
    const { client_id, idea, sourcePath } = req.body;

    // Validate required fields
    if (!client_id || !isValidUUID(client_id)) {
      return res.status(400).json({ error: 'Valid client_id UUID is required' });
    }

    const validatedIdea = validateString(idea, 'idea', true);
    const validatedSourcePath = validateString(sourcePath, 'sourcePath', false);
    
    // Capture user agent
    const userAgent = req.get('User-Agent') || null;

    // Upsert draft signup
    await upsertDraftSignup({
      clientId: client_id,
      idea: validatedIdea,
      sourcePath: validatedSourcePath,
      userAgent: userAgent
    });

    // Return 204 No Content on success
    res.status(204).send();

  } catch (error) {
    console.error('Draft save error:', error);
    
    if (error.message.includes('must be a string') || error.message.includes('cannot be empty')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/waitlist - Final submission
app.post('/api/waitlist', async (req, res) => {
  try {
    const { client_id, idea, name, email, sourcePath } = req.body;

    // Validate required fields
    if (!client_id || !isValidUUID(client_id)) {
      return res.status(400).json({ error: 'Valid client_id UUID is required' });
    }

    const validatedIdea = validateString(idea, 'idea', true);
    const validatedName = validateString(name, 'name', true);
    const validatedEmail = validateString(email, 'email', true);
    const validatedSourcePath = validateString(sourcePath, 'sourcePath', false);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(validatedEmail)) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    // Capture user agent
    const userAgent = req.get('User-Agent') || null;

    // Check if record exists
    const existingRecord = await getSignupByClientId(client_id);
    
    if (existingRecord) {
      // Update existing record to submitted status
      await submitSignup({
        clientId: client_id,
        name: validatedName,
        email: validatedEmail
      });
    } else {
      // Create new record directly as submitted
      await upsertDraftSignup({
        clientId: client_id,
        idea: validatedIdea,
        name: validatedName,
        email: validatedEmail,
        sourcePath: validatedSourcePath,
        userAgent: userAgent
      });
      
      // Then update to submitted status
      await submitSignup({
        clientId: client_id,
        name: validatedName,
        email: validatedEmail
      });
    }

    // Return 201 with success response
    res.status(201).json({ ok: true });

  } catch (error) {
    console.error('Waitlist submission error:', error);
    
    if (error.message.includes('must be a string') || 
        error.message.includes('cannot be empty') ||
        error.message.includes('email address')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve HTML files directly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/intake', (req, res) => {
  res.sendFile(path.join(__dirname, 'intake.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'terms.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Catch-all handler for frontend routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Binaai backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🗃️  DB health check: http://localhost:${PORT}/api/health/db`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
