import { Controller, Get, Param, Query, Res, BadRequestException } from '@nestjs/common';
import { ExportService } from './export.service';
import { Response } from 'express';

@Controller('insight/export')
export class ExportController {
  constructor(private readonly service: ExportService) {}

  @Get(':entity')
  async exportData(
    @Param('entity') entity: string,
    @Query('format') format: string,
    @Query('id') id: string,
    @Res() res: Response
  ) {
    if (!['xlsx', 'csv', 'json', 'pdf'].includes(format)) {
      throw new BadRequestException('Invalid format requested');
    }

    const data = await this.service.fetchExportData(entity, id);
    const dateStamp = new Date().toISOString().split('T')[0];
    const baseFilename = `ipam_export_${entity}_${dateStamp}`;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.json"`);
      const payload = await this.service.generateJSON(data);
      return res.send(payload);
    } 
    else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.csv"`);
      const payload = await this.service.generateCSV(data);
      return res.send(payload);
    } 
    else if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.xlsx"`);
      const buffer = await this.service.generateExcel(data);
      return res.send(buffer);
    } 
    else if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.pdf"`);
      const buffer = await this.service.generatePDF(data);
      return res.send(buffer);
    }
  }
}
