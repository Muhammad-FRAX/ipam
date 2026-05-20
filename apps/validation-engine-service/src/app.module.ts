import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { ValidationModule } from './validation.module';

@Module({
  imports: [DatabaseModule, ValidationModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
