import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { WorkflowModule } from './workflow.module';

@Module({
  imports: [DatabaseModule, WorkflowModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
