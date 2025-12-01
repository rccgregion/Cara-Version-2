# 👥 User Flow Documentation - Production Ready

## 1. REGISTRATION FLOW

```markdown
User visits app
    ↓
Clicks "Join Cara" button
    ↓
Enters registration form:
  - Email: "john@company.com"
  - Name: "John Doe"
  - Role: "Sales Manager"
  - Password: "MyPassword123" (must have: uppercase, lowercase, number, 8+ chars)
    ↓
Frontend validates:
  ✓ Email format correct
  ✓ Password meets requirements
  ✓ All fields filled
    ↓
Sends to backend: POST /api/auth/register
    ↓
Backend validates:
  ✓ Email not already registered
  ✓ Password strength requirements
  ✓ Input sanitization (DOMPurify)
    ↓
Backend hashes password with bcrypt (12 rounds)
    ↓
Creates user in database:
  {
    id: "uuid",
    email: "john@company.com",
    name: "John Doe",
    role: "Sales Manager",
    passwordHash: "$2b$12$...",  // Bcrypt hash, not reversible
    level: 1,
    xp: 0,
    streak: 0,
    lastActiveAt: now()
  }
    ↓
Generates tokens:
  {
    accessToken: "eyJ..." (15 min expiry),
    refreshToken: "eyJ..." (7 day expiry),
    expiresIn: 900
  }
    ↓
Stores refreshToken in secure HTTP-only cookie:
  - httpOnly: true     → Can't be accessed by JavaScript (XSS safe)
  - secure: true       → Only sent over HTTPS
  - sameSite: strict   → CSRF protection
    ↓
Frontend receives:
  {
    accessToken,
    expiresIn: 900,
    user: { id, email, name, role }
  }
    ↓
Frontend stores:
  - accessToken in localStorage
  - refreshToken in cookie (from Set-Cookie header)
  - token expiry time
    ↓
Frontend redirects to Dashboard
    ↓
✅ User logged in and authenticated
```markdown

### What Gets Stored

```javascript
// Frontend localStorage
{
  cara_access_token: "eyJ...",  // 15-minute token
  cara_token_expiry: 1701354600000  // Unix timestamp
}

// HTTP-only cookie (automatic, secure)
{
  refreshToken: "eyJ..."  // 7-day token, auto-refreshed
}
```markdown

---

## 2. LOGIN FLOW

```markdown
User visits app
    ↓
Clicks "Sign In"
    ↓
Enters login form:
  - Email: "john@company.com"
  - Password: "MyPassword123"
    ↓
Frontend validates email format
    ↓
Sends to backend: POST /api/auth/login
    ↓
Backend validates:
  ✓ Email exists in database
  ✓ Password matches (bcrypt.compare)
    ↓
If password wrong:
  ❌ Returns 401: "Invalid credentials"
  (Same message whether email doesn't exist or password wrong)
  (This is security! Prevents email enumeration)
    ↓
Backend updates user:
  lastActiveAt = now()  // Track last activity
    ↓
Generates new tokens:
  accessToken: 15 min expiry
  refreshToken: 7 day expiry
    ↓
Frontend stores tokens (same as registration)
    ↓
✅ User logged in
```markdown

### Security Note

Notice "Invalid credentials" is returned for both:

- Email that doesn't exist
- Correct email but wrong password

This prevents attackers from using the login endpoint to enumerate valid emails.

---

## 3. ONGOING SESSION MANAGEMENT

```markdown
User is logged in and using app
    ↓
Every API request includes access token:
  Authorization: Bearer <accessToken>
    ↓
Backend verifies token (JWT signature):
  - ✓ Token hasn't been tampered with
  - ✓ Token hasn't expired
  - ✓ Token was signed with our secret
    ↓
If token valid:
  ✓ Request continues
  ✓ User ID attached to request
    ↓
If token expired:
  ❌ Backend returns 401 Unauthorized
    ↓
Frontend detects 401:
  1. Takes refreshToken from cookie
  2. Sends to backend: POST /api/auth/refresh
  3. Backend validates refreshToken
  4. Backend issues new accessToken
  5. Frontend retries original request with new token
  6. Request succeeds
  7. User unaware token was refreshed!
    ↓
✅ Transparent token rotation complete
```markdown

### What About Token Expiry?

```markdown
Frontend proactively checks (every API call):

If (now > tokenExpiry - 2 minutes):
  // Token expiring in 2 minutes, refresh now
  1. Call /api/auth/refresh
  2. Get new accessToken
  3. Update localStorage
  4. Continue using app
    ↓
    Else if (now <= tokenExpiry - 2 minutes):
  // Token still valid, use as-is
  1. Make normal API request
  2. Request succeeds
    ↓
    Else (tokenExpiry - now <= 2 minutes):
  // Token expired, use refreshToken
  1. Try to refresh
  2. Get new token or redirect to login
```markdown

### Example: 15-Minute Access Token

```markdown
Login: 2:00 PM
Access Token Expires: 2:15 PM
Frontend checks at: 2:13 PM (2 minutes before)
  → Refreshes proactively at 2:13 PM
  → User gets new token valid until 2:28 PM
  → No interruption!

Without proactive refresh:
Login: 2:00 PM
Access Token Expires: 2:15 PM
User makes API call: 2:15:30 PM (30 seconds after expiry)
  → Token rejected
  → Frontend refreshes
  → Retries request
  → Slight delay, but transparent to user
```markdown

---

## 4. FEATURE ACCESS (Protected Routes)

```markdown
User tries to access protected feature (e.g., Write Resume)
    ↓
Component loads:
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    // getSessions() automatically includes:
    // Authorization: Bearer <accessToken>
    const data = await getSessions();
    setSessions(data);
  }, []);
    ↓
Frontend makes API call:
  GET /api/sessions
  Authorization: Bearer eyJ...
    ↓
Backend receives request:
  1. Extracts token from Authorization header
  2. Verifies token signature
  3. Checks token expiry
  4. Checks user ID in token
    ↓
If token valid:
  ✓ Attaches user: { id: "uuid", email: "john@..." }
  ✓ Continues to route handler
  ✓ Route handler uses req.user.id to fetch user-specific data
  ✓ Returns sessions for this user
    ↓
If token invalid:
  ❌ Returns 401
  ❌ Frontend catches and offers to refresh/login
    ↓
✅ User sees their sessions
```markdown

---

## 5. LOGOUT FLOW

```markdown
User clicks "Logout" button
    ↓
Frontend calls: POST /api/auth/logout
    ↓
Backend response:
  - Clears refreshToken cookie
  - Returns success message
    ↓
Frontend clears:
  - localStorage.cara_access_token
  - localStorage.cara_refresh_token
  - localStorage.cara_token_expiry
    ↓
Frontend redirects to login page
    ↓
✅ User logged out
   - Tokens deleted
   - Cookies cleared
   - Can't access protected routes
```markdown

---

## 6. TOKEN EXPIRY SCENARIOS

### Scenario A: Normal Activity (Every 15 minutes)

```markdown
2:00 PM - Login
  → Access token: valid until 2:15 PM
  → Refresh token: valid until 2:07 PM (7 days)
    ↓
2:13 PM - Frontend detects expiry in 2 minutes
  → Calls /api/auth/refresh
  → Gets new access token: valid until 2:28 PM
    ↓
2:26 PM - Frontend detects expiry in 2 minutes again
  → Calls /api/auth/refresh again
  → Gets new access token: valid until 2:41 PM
    ↓
... pattern repeats every 15 minutes while user is active
```markdown

### Scenario B: User Away 1 Hour

```markdown
2:00 PM - Login, access token expires 2:15 PM
  → Refresh token expires 2:07 PM next week
    ↓
2:30 PM - User steps away from computer
    ↓
3:00 PM - User comes back and clicks something
  → Access token expired at 2:15 PM ❌
  → Refresh token still valid ✅
    ↓
Frontend:
  1. Makes API request (fails with 401)
  2. Catches error
  3. Calls /api/auth/refresh
  4. Refresh succeeds, gets new access token
  5. Retries original request
  6. ✅ Works!
    ↓
User experience: Seamless, like nothing happened
```markdown

### Scenario C: User Away 8 Days

```markdown
2:00 PM Day 1 - Login
  → Access token: valid 15 min
  → Refresh token: expires Day 8 @ 2:00 PM ❌
    ↓
3:00 PM Day 8 - User tries to use app
  → Both tokens expired ❌
  → /api/auth/refresh returns 401
  → Frontend redirects to login
    ↓
User sees: "Session expired. Please log in again."
User logs in again: ✅ Gets new tokens
```markdown

---

## 7. SECURITY IN ACTION

### Protection 1: Password Strength

```markdown
User tries weak password: "pass123"
  ❌ Missing uppercase letter
  → Backend: "Password must contain uppercase, lowercase, and numbers"
  → User tries again with "Pass123" ✅
```markdown

### Protection 2: Bcrypt Hashing

```markdown
Database stores: $2b$12$L2.Y2Vf1kf/o0CqMkjqYh...
  (Not the password! Only the bcrypt hash)
  (Even if database is hacked, passwords are safe)
  (Bcrypt is specifically designed to be slow)
  (Would take 100+ years to brute force one password)
```markdown

### Protection 3: Token Expiry

```markdown
Attacker steals access token
  → Token valid for 15 minutes only
  → Attacker has limited window
  → Refresh token in HTTP-only cookie can't be stolen by JavaScript
  → Attacker can't use it
```markdown

### Protection 4: Same-Site Cookies

```markdown
Attacker tries CSRF attack:
  1. Gets victim to click malicious link
  2. That link tries to make request to our API
  3. Browser sees request is cross-site
  4. Browser doesn't include the refresh token cookie
  5. Request fails
  → Protected! ✅
```markdown

### Protection 5: Email Validation

```markdown
Attacker tries to identify valid emails:
  POST /login with email1@test.com ❌ → "Invalid credentials"
  POST /login with email2@test.com ❌ → "Invalid credentials"

  Attacker doesn't know if emails are registered or not
  → Email enumeration prevented! ✅
```markdown

---

## 8. DATA FLOW DIAGRAM

```markdown
┌─────────────┐
│   Frontend  │
│ (Browser)   │
└──────┬──────┘
       │ Request with token
       │ Authorization: Bearer xyz
       ↓
┌─────────────┐         ┌──────────────┐
│  Middleware │────────→│ Auth Check   │
│  Express    │         │ Verify JWT   │
└─────────────┘         └──────┬───────┘
       │                       │
       │ Valid?                │
       │ ✓ Yes → Continue      │ ✗ No → 401
       │                       │
       ↓                       ↓
┌─────────────┐         ┌──────────────┐
│  Route      │         │   Frontend   │
│  Handler    │         │ Refresh or   │
│  (req.user) │         │   Redirect   │
└──────┬──────┘         └──────────────┘
       │
       ↓
┌─────────────┐
│  Database   │
│  (Query     │
│   user data)│
└──────┬──────┘
       │
       ↓
    Response
       │
       ↓
┌──────────────┐
│   Frontend   │
│   (Display   │
│    data)     │
└──────────────┘
```markdown

---

## 9. ERROR HANDLING

### Registration Errors

```markdown
❌ Email already registered
→ "Email already registered"
→ Suggest: "Try logging in instead"

❌ Weak password
→ "Password must contain uppercase, lowercase, and numbers"
→ Suggest: "Try: MyPassword123"

❌ Missing fields
→ "Email, name, role, and password are required"
→ Suggest: "Fill in all fields"

❌ Invalid email
→ "Invalid email format"
→ Suggest: "Use: user@company.com"
```markdown

### Login Errors

```markdown
❌ Wrong email or password
→ "Invalid credentials"
→ Suggest: "Check spelling and try again"

❌ Account disabled
→ (Future: "Account is disabled. Contact support.")

❌ Too many login attempts
→ (Future: Rate limiting engaged)
```markdown

### API Errors

```markdown
❌ Token expired
→ Frontend auto-refreshes, user might not see this

❌ Unauthorized
→ "Please log in to continue"

❌ Server error
→ "Something went wrong. Our team has been notified."
→ (Error logged to Sentry automatically)
```markdown

---

## 10. PRODUCTION CONSIDERATIONS

### Session Timeout

```markdown
Current: Access token = 15 minutes
Option: Could be adjusted (5, 30 min, etc.)

Tradeoff:
- Shorter token → More secure but more refresh calls
- Longer token → Fewer refresh calls but less secure
- 15 minutes = Sweet spot for most apps
```markdown

### Refresh Token Rotation (Future Enhancement)

```markdown
Current: Refresh token stays 7 days
Future: Could rotate refresh token on each use
  - More secure (limits attack window)
  - Requires more backend calls
  - Implementation: Return new refresh token with each token refresh
```markdown

### Multi-Device Sessions (Future Enhancement)

```markdown
Current: No tracking of device sessions
Future: Could track:
  - Each device gets unique refresh token
  - User can "logout all other devices"
  - User can see active sessions
  - Implementation: Add session_id to token, store device info
```markdown

---

## 📊 Summary Table

| Aspect              | Details                                     |
| ------------------- | ------------------------------------------- |
| **Registration**    | Email, name, role, strong password required |
| **Password**        | 8+ chars, uppercase, lowercase, number      |
| **Hashing**         | bcrypt 12 rounds (not reversible)           |
| **Access Token**    | 15 minutes (short-lived)                    |
| **Refresh Token**   | 7 days (long-lived, HTTP-only)              |
| **Cookie Security** | httpOnly, Secure, SameSite=Strict           |
| **Token Refresh**   | Automatic every 15 min or on demand         |
| **Error Messages**  | Generic (don't reveal user existence)       |
| **Session**         | Tracked with lastActiveAt                   |
| **Logout**          | Clears tokens and cookies                   |

---

**Version**: 1.0.0  
**Created**: November 30, 2025  
**Status**: ✅ Production Ready
