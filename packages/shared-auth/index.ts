export * from './jwt';
import { verifyJwt } from './jwt';

const EXEMPT_PATTERNS = [
  /^\/api\/auth\/login$/,
  /^\/api\/[^/]+\/health$/,
];

function isExempt(path: string): boolean {
  return EXEMPT_PATTERNS.some((p) => p.test(path));
}

export function createAuthMiddleware(secret: string) {
  return (req: any, res: any, next: any) => {
    const path: string = req.path || req.url || '';
    if (isExempt(path)) {
      return next();
    }

    const authHeader: string | undefined = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.slice(7);
    try {
      const payload = verifyJwt(token, secret);
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
}

// Legacy passthrough kept for backward compatibility during migration
export const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};
