const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, 'apps');

const dbConfig = `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'postgres',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      username: process.env.DB_USER || 'ipam_user',
      password: process.env.DB_PASSWORD || 'ipam_password',
      database: process.env.DB_NAME || 'ipam_db',
      autoLoadEntities: false, // We use raw queries for speed and cross-service boundary adherence
      synchronize: false,
    }),
  ],
})
export class DatabaseModule {}
`;

const servicesMetadata = {
  'auth-service': { controller: 'Auth', path: 'auth' },
  'ipam-core-service': { controller: 'Ipam', path: 'ipam' },
  'validation-engine-service': { controller: 'Validation', path: 'validation' },
  'request-workflow-service': { controller: 'Workflow', path: 'workflow' },
  'forecasting-insight-service': { controller: 'Insight', path: 'insight' },
  'audit-service': { controller: 'Audit', path: 'audit' },
  'configuration-service': { controller: 'Config', path: 'config' }
};

Object.entries(servicesMetadata).forEach(([app, meta]) => {
  const srcDir = path.join(basePath, app, 'src');
  
  // Write DatabaseModule
  fs.writeFileSync(path.join(srcDir, 'database.module.ts'), dbConfig);
  
  // Write Feature Module
  const featureModule = `import { Module } from '@nestjs/common';
import { ${meta.controller}Controller } from './${meta.path}.controller';
import { ${meta.controller}Service } from './${meta.path}.service';

@Module({
  controllers: [${meta.controller}Controller],
  providers: [${meta.controller}Service],
})
export class ${meta.controller}Module {}
`;
  fs.writeFileSync(path.join(srcDir, `${meta.path}.module.ts`), featureModule);
  
  // Write Feature Service
  const featureService = `import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ${meta.controller}Service {
  constructor(private dataSource: DataSource) {}
  
  async getHealth() {
    try {
       await this.dataSource.query('SELECT 1');
       return { status: 'UP', service: '${app}' };
    } catch(e) {
       return { status: 'DOWN', error: e.message };
    }
  }
}
`;
  fs.writeFileSync(path.join(srcDir, `${meta.path}.service.ts`), featureService);

  // Write Feature Controller
  const featureController = `import { Controller, Get } from '@nestjs/common';
import { ${meta.controller}Service } from './${meta.path}.service';

@Controller('${meta.path}')
export class ${meta.controller}Controller {
  constructor(private readonly service: ${meta.controller}Service) {}

  @Get('health')
  async health() {
    return this.service.getHealth();
  }
}
`;
  fs.writeFileSync(path.join(srcDir, `${meta.path}.controller.ts`), featureController);

  // Rewrite AppModule
  const appModuleTemplate = `import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { ${meta.controller}Module } from './${meta.path}.module';

@Module({
  imports: [DatabaseModule, ${meta.controller}Module],
  controllers: [],
  providers: [],
})
export class AppModule {}
`;
  fs.writeFileSync(path.join(srcDir, 'app.module.ts'), appModuleTemplate);
  
  // Remove old app.controller.ts
  if (fs.existsSync(path.join(srcDir, 'app.controller.ts'))) {
      fs.unlinkSync(path.join(srcDir, 'app.controller.ts'));
  }
  
  console.log('Scaffolded full DI container for ' + app);
});

// Setup API Gateway differently
const gatewaySrc = path.join(basePath, 'api-gateway', 'src');
const gatewayModuleTemplate = `import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { createProxyMiddleware } from 'http-proxy-middleware';

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
      '/api/validation': 'http://validation-engine-service:3003/validation',
      '/api/workflow': 'http://request-workflow-service:3004/workflow',
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
             pathRewrite: { [\`^\${route}\`]: '' },
           }),
        )
        .forRoutes({ path: route + '/*', method: RequestMethod.ALL });
    }
  }
}
`;
fs.writeFileSync(path.join(gatewaySrc, 'app.module.ts'), gatewayModuleTemplate);
if (fs.existsSync(path.join(gatewaySrc, 'app.controller.ts'))) {
   fs.unlinkSync(path.join(gatewaySrc, 'app.controller.ts'));
}
console.log('Scaffolded API Gateway Reverse Proxy module');
