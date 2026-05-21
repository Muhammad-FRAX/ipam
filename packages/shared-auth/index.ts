export * from './jwt';

export const authMiddleware = (req: any, res: any, next: any) => {
  // Full JWT middleware is in Task 2.3 (api-gateway/src/app.module.ts).
  // This passthrough is kept for services that may apply it directly.
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};
