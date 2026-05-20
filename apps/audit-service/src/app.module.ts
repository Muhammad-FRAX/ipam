import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { AuditModule } from './audit.module';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
