import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { InsightModule } from './insight.module';

@Module({
  imports: [DatabaseModule, InsightModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
