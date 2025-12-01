import { Router, Request, Response } from 'express';
import { validateAndSanitize } from '../middleware/validation';
import { generateTokens, refreshAccessToken, createUser, authenticateUser, validatePasswordStrength } from '../services/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyAuthToken } from '../middleware/authMiddleware';

const router: ReturnType<typeof Router> = Router();

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

// Register - Create new account
router.post(
  '/register',
  validateAndSanitize,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, name, role, password } = req.body;

    // Validate required fields
    if (!email || !name || !role || !password) {
      return res.status(400).json({
        error: 'Missing required fields: email, name, role, password',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    try {
      // Validate password strength
      validatePasswordStrength(password);
      
      const user = await createUser(email, name, role, password);
      const tokens = generateTokens({ userId: user.id, email: user.email });

      // Set secure HTTP-only cookie for refresh token
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      // Return user-friendly error messages
      return res.status(400).json({ error: error.message || 'Registration failed' });
    }
  })
);

// Login - Authenticate user
router.post(
  '/login',
  validateAndSanitize,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password required',
      });
    }

    try {
      const user = await authenticateUser(email, password);
      const tokens = generateTokens({ userId: user.id, email: user.email });

      // Set secure HTTP-only cookie for refresh token
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error: any) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  })
);

// Refresh access token
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const accessToken = refreshAccessToken(refreshToken);
    if (!accessToken) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    res.json({
      accessToken,
      expiresIn: 900, // 15 minutes
    });
  })
);

// Verify token and get user info
router.get(
  '/verify',
  verifyAuthToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      valid: true,
      user: req.user,
    });
  })
);

// Logout
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.json({ message: 'Logged out successfully' });
  })
);

export default router;
