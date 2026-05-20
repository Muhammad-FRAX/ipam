import { Module } from '@nestjs/common';
import { InsightController } from './insight.controller';
import { InsightService } from './insight.service';
import { DatabaseModule } from './database.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { Planning360Controller } from './planning-360.controller';
import { Planning360Service } from './planning-360.service';

@Module({
  imports: [DatabaseModule],
  controllers: [InsightController, ExportController, Planning360Controller],
  providers: [InsightService, ExportService, Planning360Service],
})
export class InsightModule {}
