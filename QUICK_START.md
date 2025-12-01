# 🚀 Quick Start Guide: Cara Backend Setup

Get the complete Cara infrastructure running locally in 5 minutes.

## ⚡ TL;DR

```bash
# 1. Setup database
docker-compose up -d postgres redis

# 2. Install and setup backend
cd backend
npm install
npx prisma migrate deploy
npm run dev

# 3. In another terminal, start frontend
cd ..
npm run dev

# 4. Open `http://localhost:3000` and sign up!
```markdown

---

## 📋 Detailed Setup

### Step 1: Clone & Navigate

```bash
cd /workspaces/Cara-Version-2
```markdown

### Step 2: Start PostgreSQL & Redis

```bash
# Option A: Using Docker (recommended)
docker-compose up -d postgres redis

# Option B: Install locally
# macOS:
brew install postgresql redis
brew services start postgresql
brew services start redis

# Linux (Ubuntu):
sudo apt install postgresql redis-server
sudo systemctl start postgresql
sudo systemctl start redis-server

# Windows:
# Download from https://www.postgresql.org/download/windows/
# Download from https://github.com/microsoftarchive/redis/releases
```markdown

### Step 3: Setup Backend Database

```bash
cd backend

# Install dependencies
npm install

# Setup Prisma
npx prisma generate

# Run migrations to create tables
npx prisma migrate deploy

# Optional: Seed with test data
npx prisma db seed
```markdown

### Step 4: Configure Environment

```bash
# Create backend .env (if not exists)
cat > .env << EOF
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
JWT_SECRET=dev-secret-key-change-in-production
GEMINI_API_KEY=AIzaSyAvrsAqFkw-aKt9ofdjQS4c1Di_oS94EbU
FRONTEND_URL=http://localhost:3000
EOF
```markdown

**Note**: Update `DATABASE_URL` if you installed PostgreSQL locally with different credentials.

### Step 5: Start Backend Server

```bash
npm run dev

# Expected output:
# Server running on port 3001
# Environment: development
```markdown

### Step 6: In New Terminal - Start Frontend

```bash
cd /workspaces/Cara-Version-2

# Ensure frontend .env is set
cat > .env << EOF
VITE_API_URL=http://localhost:3001/api
EOF

npm run dev

# Expected output:
# ➜  Local:   http://localhost:3000/
```markdown

### Step 7: Test the App

1. Open `http://localhost:3000`
2. Click "Sign Up"
3. Fill in:
   - Email: `test@example.com`
   - Name: `Test User`
   - Role: `Software Engineer`
   - Password: `password123`
4. Click "Create Account"
5. Complete the onboarding
6. 🎉 You're in!

---

## 🧪 Quick API Tests

### Test Authentication

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "Jane Doe",
    "role": "Product Manager",
    "password": "secure123"
  }'

# Response will include JWT token - copy it

TOKEN="your-jwt-token-here"

# Test API access
curl -X GET http://localhost:3001/api/gemini/quota \
  -H "Authorization: Bearer $TOKEN"
```markdown

### Create a Session

```bash
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "featureType": "conversation",
    "title": "Salary Negotiation Practice"
  }'
```markdown

### Process a Prompt

```bash
curl -X POST http://localhost:3001/api/gemini/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "Help me practice negotiating a 20% raise",
    "featureType": "conversation"
  }'
```markdown

---

## 🗄️ Database Management

### View Data in Database

```bash
# Connect to PostgreSQL
psql postgresql://postgres:password@localhost:5432/postgres

# View users
SELECT id, email, name, role FROM users;

# View sessions
SELECT id, "userId", "featureType", score, "createdAt" FROM sessions;

# View quota usage
SELECT "userId", "tokensUsed", "requestType", "createdAt" FROM quota_usage;

# Exit
\q
```markdown

### Reset Database (⚠️ Careful!)

```bash
# Delete all data
cd backend
npx prisma migrate reset

# Confirm deletion, then recreate schema
npx prisma migrate deploy
```markdown

---

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Find what's using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use different port:
PORT=3002 npm run dev
```markdown

### Database Connection Error

```bash
# Check if PostgreSQL is running
psql --version

# macOS:
brew services list

# Linux:
sudo systemctl status postgresql

# Try connecting directly
psql postgresql://localhost:5432/postgres
```markdown

### JWT Token Expired

- Tokens expire after 7 days
- Need to login again to get new token
- Change `JWT_EXPIRY` in `backend/src/services/auth.ts` if needed

### Rate Limit Hit

```markdown
Error: API rate limit exceeded
```markdown

- Wait 1 minute for per-minute limit to reset
- Or restart backend to clear memory-based limit

---

## 📊 Monitoring & Logs

### Backend Logs

```bash
# All console output visible in terminal
# Look for:
# - Request logs (method, URL, status, duration)
# - Error messages
# - Database queries
```markdown

### Database Queries

```bash
# Enable Prisma query logging
DEBUG=* npm run dev

# Or in prisma.ts:
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});
```markdown

### Network Requests (Frontend)

```bash
# Open browser DevTools
# F12 or Cmd+Option+I

# Go to Network tab
# Make API calls
# View request/response details
```markdown

---

## 🚀 Next: Deploy to Production

Once local setup works, deploy to production:

### Heroku (Easiest)

```bash
# 1. Create app
heroku create cara-backend

# 2. Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# 3. Set environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set GEMINI_API_KEY=your-key

# 4. Deploy
git push heroku main
```markdown

### AWS

```bash
# Using ECS:
# 1. Create ECR repository
# 2. Build and push Docker image
# 3. Create ECS task definition
# 4. Launch ECS service

# Or use Elastic Beanstalk for simpler setup
```markdown

---

## 📚 Additional Resources

- **Backend Setup**: `backend/README.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Architecture Analysis**: `PROMPT_ENGINEERING_ANALYSIS.md`
- **API Documentation**: `backend/README.md` (API section)
- **Database Schema**: `backend/prisma/schema.prisma`

---

## ✅ Checklist

- [ ] Docker or PostgreSQL installed
- [ ] Backend dependencies installed (`npm install`)
- [ ] Database migrations run (`npx prisma migrate deploy`)
- [ ] `.env` files configured
- [ ] Backend running on `http://localhost:3001
- [ ] Frontend running on `http://localhost:3000
- [ ] Successfully registered and logged in
- [ ] Can see dashboard after onboarding

---

## You're Ready

The complete Cara infrastructure is now running locally:

- ✅ Secure backend API
- ✅ PostgreSQL database
- ✅ User authentication
- ✅ API rate limiting
- ✅ Error tracking ready
- ✅ Analytics tracking

Start building! 🚀
