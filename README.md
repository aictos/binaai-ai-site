# Binaai Platform

Full-stack application with Node.js backend and static frontend using Tailwind CDN.

## Structure
- `index.html` — Landing page (Hero → Problem → Benefits → CTA). The **Join Waitlist** button links to `/intake.html`.
- `intake.html` — Waitlist intake form (idea, name, email).
- `terms.html` — Terms of Use page.
- `privacy.html` — Privacy Policy page.
- `server.js` — Express backend with API endpoints.
- `assets/` — Static assets (logos, images).

## Backend Setup

### Prerequisites
- Node.js 16+ 
- PostgreSQL database (local or hosted)

### Installation
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your database URL
# DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

### Running Locally
```bash
# Start the server
npm run dev

# Server will run on http://localhost:3000
```

### Database Migrations

Before running the server, you need to set up the database schema:

```bash
# Run all pending migrations
node db/migrate.js

# See what would be executed (dry run)
node db/migrate.js --dry-run

# Reset database (DANGER: drops all tables)
node db/migrate.js --reset
```

#### Migration Files
- `db/migrations/001_create_waitlist_signups.sql` — Initial schema

#### Testing the Schema
```bash
# Test database schema and operations
npm run test:schema

# Test API endpoints (requires running server + database)
npm run test:api
```

#### For Render/Production
1. Set `DATABASE_URL` environment variable
2. Run migrations once after deployment: `node db/migrate.js`
3. Optionally test schema: `node db/test-schema.js`

### API Endpoints

#### Health Check
- `GET /api/health` — Health check endpoint
- `GET /api/health/db` — Database connection check

#### Waitlist Management

##### `POST /api/idea-draft`
Silent draft saves by client_id. Used for auto-saving user ideas without submitting to waitlist.

**Request:**
```json
{
  "client_id": "uuid (required)",
  "idea": "string (required)",
  "sourcePath": "string (optional)"
}
```

**Behavior:**
- UPSERT by client_id
- Set idea, source_path, status='draft'
- Captures user-agent header automatically
- Rate limited to 100 requests per 15 minutes

**Response:**
- `204 No Content` on success
- `400 Bad Request` with `{ "error": "..." }` for validation errors
- `500 Internal Server Error` with `{ "error": "..." }` for server errors

**Example:**
```bash
curl -X POST http://localhost:3000/api/idea-draft \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "123e4567-e89b-12d3-a456-426614174000",
    "idea": "Monitor my cat sleeping patterns",
    "sourcePath": "/intake"
  }'
```

##### `POST /api/waitlist`
Final waitlist submission. Requires all user details and changes status to 'submitted'.

**Request:**
```json
{
  "client_id": "uuid (required)",
  "idea": "string (required)",
  "name": "string (required)",
  "email": "string (required, valid email)",
  "sourcePath": "string (optional)"
}
```

**Behavior:**
- UPSERT by client_id
- If record exists: update idea, name, email, source_path, status='submitted'
- If record doesn't exist: create new record with status='submitted'
- Trims all inputs and validates required fields
- Basic email format validation
- Rate limited to 100 requests per 15 minutes

**Response:**
- `201 Created` with `{ "ok": true }` on success
- `400 Bad Request` with `{ "error": "..." }` for validation errors
- `500 Internal Server Error` with `{ "error": "..." }` for server errors

**Example:**
```bash
curl -X POST http://localhost:3000/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "123e4567-e89b-12d3-a456-426614174000",
    "idea": "Monitor my cat sleeping patterns",
    "name": "John Doe",
    "email": "john@example.com",
    "sourcePath": "/intake"
  }'
```

#### Rate Limiting
All `/api/*` endpoints are rate limited to 100 requests per IP per 15-minute window.

## Frontend

The frontend is served statically by the Express server. All HTML pages include:
- Responsive design with Tailwind CSS
- Rotating placeholder text for idea generation
- Form submissions ready for backend integration
- Accessibility features (reduced motion support)

## Deploy

### Render
1. Connect your GitHub repository
2. Set environment variables:
   - `DATABASE_URL` — PostgreSQL connection string with SSL
   - `NODE_ENV=production`
3. Deploy command: `npm install`
4. Start command: `npm start`

### Local Development
```bash
# Start development server
npm run dev

# Access the application
open http://localhost:3000
```

## Environment Variables
- `PORT` — Server port (default: 3000)
- `NODE_ENV` — Environment (development/production)
- `DATABASE_URL` — PostgreSQL connection string
