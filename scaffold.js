const fs = require('fs');
const path = require('path');

const apps = [
  'api-gateway', 'auth-service', 'ipam-core-service',
  'validation-engine-service', 'request-workflow-service',
  'forecasting-insight-service', 'audit-service', 'configuration-service'
];

const basePath = path.join(__dirname, 'apps');

const packageJsonTemplate = (name) => '{\n' +
'  "name": "@ipam/' + name + '",\n' +
'  "version": "1.0.0",\n' +
'  "private": true,\n' +
'  "scripts": {\n' +
'    "build": "nest build",\n' +
'    "start": "nest start",\n' +
'    "start:dev": "nest start --watch",\n' +
'    "start:prod": "node dist/main"\n' +
'  },\n' +
'  "dependencies": {\n' +
'    "@nestjs/common": "^10.0.0",\n' +
'    "@nestjs/core": "^10.0.0",\n' +
'    "@nestjs/platform-express": "^10.0.0",\n' +
'    "reflect-metadata": "^0.1.13",\n' +
'    "rxjs": "^7.8.1",\n' +
'    "@ipam/shared-types": "1.0.0",\n' +
'    "@ipam/shared-config": "1.0.0",\n' +
'    "@ipam/shared-logging": "1.0.0"\n' +
'  },\n' +
'  "devDependencies": {\n' +
'    "@nestjs/cli": "^10.0.0",\n' +
'    "@nestjs/schematics": "^10.0.0",\n' +
'    "@types/express": "^4.17.17",\n' +
'    "@types/node": "^20.3.1",\n' +
'    "typescript": "^5.1.3"\n' +
'  }\n' +
'}';

const tsconfigTemplate = '{\n' +
'  "extends": "../../tsconfig.json",\n' +
'  "compilerOptions": {\n' +
'    "outDir": "./dist",\n' +
'    "rootDir": "./src"\n' +
'  },\n' +
'  "include": ["src/**/*"]\n' +
'}';

const nestCliTemplate = '{\n' +
'  "collection": "@nestjs/schematics",\n' +
'  "sourceRoot": "src",\n' +
'  "compilerOptions": {\n' +
'    "typeCheck": true\n' +
'  }\n' +
'}';

const mainTsTemplate = "import { NestFactory } from '@nestjs/core';\n" +
"import { AppModule } from './app.module';\n" +
"import { logger } from '@ipam/shared-logging';\n\n" +
"async function bootstrap() {\n" +
"  const app = await NestFactory.create(AppModule);\n" +
"  const port = process.env.PORT || Math.floor(Math.random() * 1000 + 3000);\n" +
"  await app.listen(port);\n" +
"  logger.info('Application listening on port ' + port);\n" +
"}\n" +
"bootstrap();\n";

const appModuleTemplate = "import { Module } from '@nestjs/common';\n" +
"import { AppController } from './app.controller';\n\n" +
"@Module({\n" +
"  imports: [],\n" +
"  controllers: [AppController],\n" +
"  providers: [],\n" +
"})\n" +
"export class AppModule {}\n";

const appControllerTemplate = (name) => "import { Controller, Get } from '@nestjs/common';\n\n" +
"@Controller()\n" +
"export class AppController {\n" +
"  @Get('health')\n" +
"  getHealth(): string {\n" +
"    return '" + name + " is healthy';\n" +
"  }\n" +
"}\n";

apps.forEach(app => {
  const appDir = path.join(basePath, app);
  const srcDir = path.join(appDir, 'src');

  if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(path.join(appDir, 'package.json'), packageJsonTemplate(app));
  fs.writeFileSync(path.join(appDir, 'tsconfig.json'), tsconfigTemplate);
  fs.writeFileSync(path.join(appDir, 'nest-cli.json'), nestCliTemplate);
  
  fs.writeFileSync(path.join(srcDir, 'main.ts'), mainTsTemplate);
  fs.writeFileSync(path.join(srcDir, 'app.module.ts'), appModuleTemplate);
  fs.writeFileSync(path.join(srcDir, 'app.controller.ts'), appControllerTemplate(app));
  
  console.log("Scaffolded " + app);
});

console.log('Done scaffolding all microservices!');
