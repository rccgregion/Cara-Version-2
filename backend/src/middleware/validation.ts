import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

export interface ValidationError extends Error {
  statusCode?: number;
  field?: string;
}

// Sanitize user input
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  }).trim();
};

// Validate and sanitize request body
export const validateAndSanitize = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize all string fields in request body
    if (req.body && typeof req.body === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string') {
          // Validate length
          if (value.length > 5000) {
            const error: ValidationError = new Error(`Field '${key}' exceeds maximum length`);
            error.statusCode = 400;
            error.field = key;
            throw error;
          }
          sanitized[key] = sanitizeInput(value);
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map(v => 
            typeof v === 'string' ? sanitizeInput(v) : v
          );
        } else {
          sanitized[key] = value;
        }
      }
      
      req.body = sanitized;
    }
    
    next();
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error && 'message' in error) {
      const validationError = error as ValidationError;
      return res.status(validationError.statusCode || 400).json({
        error: validationError.message,
        field: validationError.field,
      });
    }
    next(error);
  }
};

// Validate user prompt for Gemini
export const validatePrompt = (prompt: string): { valid: boolean; error?: string } => {
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt must be a non-empty string' };
  }

  if (prompt.length < 5) {
    return { valid: false, error: 'Prompt must be at least 5 characters' };
  }

  if (prompt.length > 4000) {
    return { valid: false, error: 'Prompt must be less than 4000 characters' };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /javascript:/i,
    /<script/i,
    /on\w+=/i,
    /eval\(/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(prompt)) {
      return { valid: false, error: 'Invalid content detected' };
    }
  }

  return { valid: true };
};

// Middleware to validate prompt in requests
export const validatePromptMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const prompt = req.body.prompt || req.body.text || '';
    const validation = validatePrompt(prompt);

    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
