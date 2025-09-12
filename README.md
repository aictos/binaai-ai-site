# Binaai Backend

A modern Node.js backend for the Binaai vision AI platform, built with Express.js and PostgreSQL.

## 🏗️ Architecture

This application follows a clean, modular architecture with clear separation of concerns:

```
├── public/                 # Static files (HTML, CSS, JS, assets)
├── src/
│   ├── config/            # Configuration and environment setup
│   ├── controllers/       # HTTP request handlers
│   ├── db/               # Database connection and migrations
│   ├── middleware/       # Express middleware functions
│   ├── routes/           # Route definitions
│   ├── services/         # Business logic and data access
│   ├── utils/            # Utility functions and helpers
│   ├── index.js          # Application entry point
│   └── server.js         # Express app configuration
├── scripts/              # Utility scripts (migrations, etc.)
├── logs/                 # Application logs
└── tests/                # Test files
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone and install dependencies:**

   ```bash
   git clone <repository-url>
   cd binaai_ai
   npm install
   ```

2. **Environment setup:**

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Database setup:**

   ```bash
   # Run migrations
   npm run migrate
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## 📋 Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://username:password@localhost:5432/binaai_dev
LOG_LEVEL=debug
```

### Production Environment

For production deployment (e.g., Render, Railway, Heroku):

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://user:pass@host:5432/dbname?sslmode=require
LOG_LEVEL=info
```

## 🛠️ Scripts

| Command           | Description                               |
| ----------------- | ----------------------------------------- |
| `npm start`       | Start production server                   |
| `npm run dev`     | Start development server with auto-reload |
| `npm run migrate` | Run database migrations                   |
| `npm run lint`    | Run ESLint                                |
| `npm run format`  | Format code with Prettier                 |

## 📡 API Endpoints

### Health Checks

- `GET /api/health` - Basic health check
- `GET /api/health/db` - Database health check

### Waitlist Management

- `POST /api/idea-draft` - Silent draft save (returns 204)
- `POST /api/waitlist` - Final submission (returns 201)

#### Draft Submission

```bash
curl -X POST http://localhost:3000/api/idea-draft \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "123e4567-e89b-12d3-a456-426614174000",
    "idea": "An app that detects objects in real-time video",
    "sourcePath": "/"
  }'
```

#### Final Submission

```bash
curl -X POST http://localhost:3000/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "123e4567-e89b-12d3-a456-426614174000",
    "idea": "An app that detects objects in real-time video",
    "name": "John Doe",
    "email": "john@example.com",
    "sourcePath": "/intake.html"
  }'
```

## 🗃️ Database

### Schema

The application uses PostgreSQL with the following main table:

```sql
CREATE TABLE waitlist_signups (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id uuid NOT NULL UNIQUE,
    idea text NOT NULL,
    name text,
    email text,
    user_agent text,
    source_path text,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);
```

### Migrations

Migrations are located in `src/db/migrations/` and run automatically with:

```bash
npm run migrate
```

The migration system is idempotent - safe to run multiple times.

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API endpoint protection
- **Input Validation** - Request payload validation
- **SQL Injection Protection** - Parameterized queries
- **Error Handling** - Centralized error management

## 📊 Logging

The application uses structured JSON logging with Pino:

- **Development**: Pretty-printed logs to console
- **Production**: JSON logs suitable for log aggregation services

Log levels: `error`, `warn`, `info`, `debug`

## 🚀 Deployment

### Render.com

1. **Create a new Web Service**
2. **Set environment variables:**
   - `NODE_ENV=production`
   - `DATABASE_URL=postgres://...` (from Render PostgreSQL service)
3. **Deploy commands:**
   - Build: `npm install`
   - Start: `npm start`

### Railway

1. **Connect GitHub repository**
2. **Add PostgreSQL service**
3. **Set environment variables**
4. **Deploy automatically on push**

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Testing

Currently, the application includes:

- Health check endpoints for monitoring
- Database connection testing
- Input validation testing

To add comprehensive tests:

```bash
npm install --save-dev jest supertest
# Add test files in /tests directory
```

## 🔧 Development

### Code Style

- **ESLint** for code linting
- **Prettier** for code formatting
- **EditorConfig** for consistent editor settings

Run code quality checks:

```bash
npm run lint
npm run format
```

### Database Development

- Use migrations for schema changes
- Test with local PostgreSQL instance
- Use connection pooling for performance

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 🆘 Troubleshooting

### Common Issues

**Database Connection Errors:**

- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure database exists

**Port Already in Use:**

```bash
lsof -ti:3000 | xargs kill -9
```

**Migration Errors:**

- Check database permissions
- Verify SQL syntax in migration files
- Run migrations in order

### Support

For issues and questions:

- Check the logs: `tail -f logs/app.log`
- Verify environment variables
- Test database connectivity: `npm run migrate`

---

Built with ❤️ by the Binaai team
