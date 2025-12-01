import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const BCRYPT_ROUNDS = 12;

// Validate required secrets on import
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET environment variables are required');
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate both access and refresh tokens
 */
export const generateTokens = (payload: TokenPayload): AuthTokens => {
  const accessToken = jwt.sign(payload, JWT_SECRET!, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET!, { expiresIn: REFRESH_TOKEN_EXPIRY });
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
};

/**
 * Generate access token from refresh token
 */
export const refreshAccessToken = (refreshToken: string): string | null => {
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET!) as TokenPayload;
    return jwt.sign(payload, JWT_SECRET!, { expiresIn: ACCESS_TOKEN_EXPIRY });
  } catch {
    return null;
  }
};

/**
 * Verify access token
 */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET!) as TokenPayload;
  } catch {
    return null;
  }
};

/**
 * Hash password using bcrypt with high salt rounds
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcryptjs.genSalt(BCRYPT_ROUNDS);
  return bcryptjs.hash(password, salt);
};

/**
 * Compare password with hash
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcryptjs.compare(password, hash);
};


/**
 * Create new user with secure password
 */
export const createUser = async (
  email: string,
  name: string,
  role: string,
  password: string
) => {
  // Check for password complexity
  validatePasswordStrength(password);
  
  const passwordHash = await hashPassword(password);
  
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role,
      passwordHash,
      lastActiveAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
  
  return user;
};

/**
 * Authenticate user and return secure response
 */
export const authenticateUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    // Don't reveal whether email exists
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Update last active time
  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
};

/**
 * Validate password strength
 * - At least 8 characters
 * - Mix of uppercase, lowercase, numbers
 */
export const validatePasswordStrength = (password: string): void => {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!hasUppercase || !hasLowercase || !hasNumber) {
    throw new Error('Password must contain uppercase, lowercase, and numbers');
  }
};
