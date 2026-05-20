import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { ConfigModule } from './config.module';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
