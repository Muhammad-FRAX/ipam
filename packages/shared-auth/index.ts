export const authMiddleware = (req: any, res: any, next: any) => {
  // Simple passthrough for Phase 1 scaffolding
  // Full JWT logic will be injected here during Security Phase
  const authHeader = req.headers.authorization;
  if (!authHeader) {
     return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};
