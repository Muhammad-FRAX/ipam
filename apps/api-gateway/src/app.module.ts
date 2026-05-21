import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { createAuthMiddleware } from '@ipam/shared-auth';

const DEV_SECRET = 'ipam-dev-secret-change-in-production';

function getJwtSecret(): string {
  return process.env.JWT_SECRET || DEV_SECRET;
}

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // JWT auth guard — applied first, before all proxy routes.
    // Exemptions: /api/auth/login, /api/*/health
    consumer
      .apply(createAuthMiddleware(getJwtSecret()))
      .forRoutes({ path: '/api/*', method: RequestMethod.ALL });

    // Reverse proxy mappings
    const services: Record<string, string> = {
      '/api/auth':     process.env.AUTH_SERVICE_URL     || 'http://auth-service:3001/auth',
      '/api/ipam':     process.env.IPAM_CORE_SERVICE_URL|| 'http://ipam-core-service:3002/ipam',
      '/api/workflow': process.env.WORKFLOW_SERVICE_URL || 'http://request-workflow-service:3008/workflow',
      '/api/insight':  process.env.INSIGHT_SERVICE_URL  || 'http://forecasting-insight-service:3005/insight',
      '/api/audit':    process.env.AUDIT_SERVICE_URL    || 'http://audit-service:3006/audit',
      '/api/config':   process.env.CONFIG_SERVICE_URL   || 'http://configuration-service:3007/config',
    };

    for (const [route, target] of Object.entries(services)) {
      consumer
        .apply(
          createProxyMiddleware({
            target,
            changeOrigin: true,
            pathRewrite: { [`^${route}`]: '' },
            on: {
              proxyReq: (proxyReq, req: any) => {
                console.log(`[Proxy] Route: ${route} | Original: ${req.originalUrl} | Rewritten: ${proxyReq.path}`);
                // Forward decoded user to downstream services
                if (req.user) {
                  proxyReq.setHeader('x-user-id', req.user.sub);
                  proxyReq.setHeader('x-user-email', req.user.email);
                  proxyReq.setHeader('x-user-roles', JSON.stringify(req.user.roles));
                }
                fixRequestBody(proxyReq, req);
              },
            },
          }),
        )
        .forRoutes(route, route + '/*');
    }
  }
}
