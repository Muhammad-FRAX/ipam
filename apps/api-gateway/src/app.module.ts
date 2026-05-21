import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // Reverse proxy mappings based on Phase 1 structure
    const services = {
      '/api/auth': 'http://auth-service:3001/auth',
      '/api/ipam': 'http://ipam-core-service:3002/ipam',
      '/api/workflow': 'http://request-workflow-service:3008/workflow',
      '/api/insight': 'http://forecasting-insight-service:3005/insight',
      '/api/audit': 'http://audit-service:3006/audit',
      '/api/config': 'http://configuration-service:3007/config'
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
                     fixRequestBody(proxyReq, req);
                 }
             }
           }),
         )
        .forRoutes(route, route + '/*');
    }
  }
}
