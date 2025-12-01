# Cara Backend API

Production-ready backend server for the Cara AI Communication Coach application.

## 🏗️ Architecture Overview

```text
┌─────────────────┐
│   Frontend      │
│   (Vite/React)  │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────────┐
│   Express Backend Server    │ ◄─── API Gateway
│   ├── Authentication (JWT)  │
│   ├── Rate Limiting         │
│   ├── Input Validation      │
│   ├── Gemini API Proxy      │
│   └── Session Management    │
└────────┬────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌──────────────┐
│PostgreSQL│ │ Gemini API   │
│ Database │ │ (Backend)    │
└─────────┘ └──────────────┘
```

## ✨ Key Features

### 1. **Security** 🔐

- **JWT Authentication**: Token-based auth for all protected routes
- **Rate Limiting**: Per-IP and per-user quota enforcement
- **Input Sanitization**: DOMPurify on all user inputs
- **API Key Protection**: Gemini API key never exposed to client
- **Environment Isolation**: All secrets in `.env` file
- **Error Tracking**: Sentry integration for production monitoring

### 2. **Database** 📊

- **PostgreSQL**: Relational database with JSON support
- **Prisma ORM**: Type-safe database queries
- **Session Tracking**: Store all user interactions and feedback
- **Quota Management**: Track daily API usage per user
- **Analytics Events**: Measure feature adoption and engagement

### 3. **API Endpoints**

#### Authentication

- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login to account
- `GET /api/auth/verify` - Verify JWT token

#### Gemini Integration

- `POST /api/gemini/process` - Process user prompt with Gemini
- `POST /api/gemini/generate-feedback` - Generate structured feedback
- `GET /api/gemini/quota` - Check daily quota usage

#### Sessions

- `POST /api/sessions` - Create new session
- `PATCH /api/sessions/:id` - Update session
- `GET /api/sessions` - List user sessions
- `GET /api/sessions/:id` - Get session details

#### Analytics

- `POST /api/analytics/events` - Track user event
- `GET /api/analytics/stats` - Get user statistics
- `GET /api/analytics/adoption` - Get feature adoption metrics

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for session caching)

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

**Required variables:**

```env
DATABASE_URL=postgresql://user:password@localhost:5432/cara_db
JWT_SECRET=your-super-secret-key
GEMINI_API_KEY=AIzaSyAvrsAqFkw-aKt9ofdjQS4c1Di_oS94EbU
FRONTEND_URL=http://localhost:3000
```

### 3. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed test data
npx prisma db seed
```

### 4. Run Server

```bash
npm run dev    # Development with hot-reload
npm run build  # Build for production
npm start      # Production
```

## 📝 Example API Calls

### Register User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Software Engineer",
    "password": "secure123"
  }'
```

### Process Gemini Prompt

```bash
curl -X POST http://localhost:3001/api/gemini/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "prompt": "Can you help me practice a salary negotiation?",
    "featureType": "conversation"
  }'
````

### Create Session

```bash
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "featureType": "conversation",
    "title": "Salary Negotiation Practice"
  }'
```

## 🗄️ Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR,
  passwordHash VARCHAR,
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  streak INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### Sessions Table

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL REFERENCES users(id),
  featureType VARCHAR,
  durationSeconds INT,
  score DECIMAL,
  completed BOOLEAN DEFAULT FALSE,
  clarity DECIMAL,
  pace DECIMAL,
  confidence DECIMAL,
  tone DECIMAL,
  transcript TEXT,
  feedbackJson JSON,
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX(userId, createdAt)
);
```

### Quota Usage Table

```sql
CREATE TABLE quota_usage (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL REFERENCES users(id),
  tokensUsed INT,
  requestType VARCHAR,
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX(userId, createdAt)
);
```

### Analytics Events Table

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL REFERENCES users(id),
  eventType VARCHAR,
  metadata JSON,
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX(userId, eventType, createdAt)
);
```

## 🔒 Security Best Practices

1. **Never expose API keys** - Keep Gemini API key on backend only
2. **Validate all inputs** - Use `validateAndSanitize` middleware
3. **Rate limit aggressively** - Protect against abuse and quota exhaustion
4. **Use HTTPS in production** - Always encrypt data in transit
5. **Rotate JWT secrets** - Implement secret rotation strategy
6. **Monitor errors** - Use Sentry to track production issues
7. **Log access** - Maintain audit trail of API usage

## 📊 Monitoring & Metrics

### Sentry Error Tracking

All server errors automatically logged to Sentry for monitoring.

Configure in `.env`:

```env
SENTRY_DSN=https://your-key@sentry.io/project-id
```

### Request Logging

All requests logged with:

- Request method and URL
- Response status code
- Duration
- User ID (if authenticated)
- IP address

### Quota Metrics

Daily quota tracking per user:

- 50,000 tokens/day per user
- Resets at midnight UTC
- Tracked in `QuotaUsage` table

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts
```

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT_SECRET
- [ ] Configure PostgreSQL backups
- [ ] Enable HTTPS/TLS
- [ ] Setup environment-specific variables
- [ ] Configure Sentry for error tracking
- [ ] Setup Redis for caching (optional)
- [ ] Configure CORS for production domain

### Deploy to Heroku

```bash
# Create Heroku app
heroku create cara-api

# Add PostgreSQL add-on
heroku addons:create heroku-postgresql:standard-0

# Set environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set GEMINI_API_KEY=your-key

# Deploy
git push heroku main
```

### Deploy to AWS

```bash
# Using Docker
docker build -t cara-backend .
docker tag cara-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/cara-backend
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/cara-backend

# Use ECS, Lambda, or Elastic Beanstalk
```

## 📝 Environment Variables

```env
# Server
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-super-secret-key

# Gemini API
GEMINI_API_KEY=your-api-key

# Frontend CORS
FRONTEND_URL=https://cara.example.com

# Error Tracking
SENTRY_DSN=https://...

# Optional: Redis
REDIS_URL=redis://...
```

## 🔗 Integration with Frontend

Frontend communicates with backend via `/api` endpoints.

**Frontend `.env`:**

```env
VITE_API_URL=http://localhost:3001/api  # Development
VITE_API_URL=https://api.cara.com/api   # Production
```

**Frontend auth flow:**

1. User registers/logs in → backend returns JWT
2. JWT stored in localStorage
3. All requests include `Authorization: Bearer {JWT}`
4. Backend validates token before processing

## 📚 References

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [Gemini API Docs](https://ai.google.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Write tests for new functionality
3. Follow TypeScript strict mode
4. Run linting: `npm run lint`
5. Submit pull request

## 📞 Support

For issues or questions:

- Check existing GitHub issues
- Review API documentation in this README
- Check backend logs in Sentry
- Contact development team
