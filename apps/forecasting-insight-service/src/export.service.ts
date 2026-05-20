import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
  constructor(private dataSource: DataSource) {}

  async fetchExportData(entity: string, id: string | null) {
    let data: any = {};
    if (entity === 'full-system') {
      const blocks = await this.dataSource.query(`SELECT * FROM ip_blocks`);
      const subnets = await this.dataSource.query(`SELECT * FROM subnets`);
      const ips = await this.dataSource.query(`SELECT * FROM ip_addresses`);
      data = { blocks, subnets, ips };
    } else if (entity === 'block') {
      if (!id) throw new BadRequestException('ID is required for block export');
      const block = await this.dataSource.query(`SELECT * FROM ip_blocks WHERE id = $1`, [id]);
      const subnets = await this.dataSource.query(`SELECT * FROM subnets WHERE block_id = $1`, [id]);
      data = { block: block[0], subnets };
    } else if (entity === 'subnet') {
      if (!id) throw new BadRequestException('ID is required for subnet export');
      const subnet = await this.dataSource.query(`SELECT * FROM subnets WHERE id = $1`, [id]);
      const ips = await this.dataSource.query(`SELECT * FROM ip_addresses WHERE subnet_id = $1`, [id]);
      data = { subnet: subnet[0], ips };
    } else if (entity === 'request') {
      if (!id) throw new BadRequestException('ID is required for request export');
      const request = await this.dataSource.query(`SELECT * FROM allocation_requests WHERE id = $1`, [id]);
      data = { request: request[0] };
    } else {
      throw new BadRequestException('Unknown entity: ' + entity);
    }
    
    // Log the audit
    await this.dataSource.query(`
      INSERT INTO audit_logs (action, entity, user_id, details)
      VALUES ($1, $2, $3, $4)
    `, ['EXPORT', entity, null, { format: 'export', id, timestamp: new Date() }]);

    return data;
  }

  async generateCSV(data: any): Promise<string> {
    try {
      let flatData = [];
      if (data.blocks) {
         flatData = [...data.blocks.map(b => ({ type: 'Block', id: b.id, name: b.name, cidr: b.cidr, status: b.status }))];
      } else if (data.subnet) {
         flatData = [...data.ips.map(i => ({ type: 'IP', id: i.id, ip: i.ip_address, status: i.status }))];
         flatData.unshift({ type: 'Subnet', id: data.subnet.id, name: data.subnet.name, cidr: data.subnet.cidr, status: data.subnet.status });
      }
      
      const parser = new Parser();
      return parser.parse(flatData.length > 0 ? flatData : { empty: true });
    } catch (err) {
      console.error(err);
      throw new BadRequestException('Failed to generate CSV');
    }
  }

  async generateExcel(data: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    if (data.blocks) {
      const w1 = workbook.addWorksheet('Blocks');
      w1.columns = [{ header: 'ID', key: 'id' }, { header: 'Name', key: 'name' }, { header: 'CIDR', key: 'cidr' }, { header: 'Status', key: 'status' }];
      w1.addRows(data.blocks);
      
      const w2 = workbook.addWorksheet('Subnets');
      w2.columns = [{ header: 'ID', key: 'id' }, { header: 'Block ID', key: 'block_id' }, { header: 'Name', key: 'name' }, { header: 'CIDR', key: 'cidr' }];
      w2.addRows(data.subnets);
    } else if (data.subnet) {
      const w1 = workbook.addWorksheet('Subnet Details');
      w1.columns = [{ header: 'ID', key: 'id' }, { header: 'Name', key: 'name' }, { header: 'CIDR', key: 'cidr' }];
      w1.addRow(data.subnet);

      const w2 = workbook.addWorksheet('IP Allocations');
      w2.columns = [{ header: 'IP', key: 'ip_address' }, { header: 'Status', key: 'status' }];
      w2.addRows(data.ips);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }

  async generatePDF(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        doc.fontSize(20).text('IPAM Platform Export Report', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(12).text(`Generated On: ${new Date().toISOString()}`);
        doc.moveDown();

        if (data.blocks) {
           doc.text(`Total Root Blocks: ${data.blocks.length}`);
           doc.text(`Total Subnets Managed: ${data.subnets.length}`);
           doc.text(`Total IP Operations Logged: ${data.ips.length}`);
        } else if (data.subnet) {
           doc.text(`Subnet: ${data.subnet.name} (${data.subnet.cidr})`);
           doc.text(`Total Assigned IPs: ${data.ips.length}`);
           doc.moveDown();
           data.ips.slice(0, 100).forEach(ip => {
             doc.list([`${ip.ip_address} - ${ip.status}`]);
           });
           if(data.ips.length > 100) doc.text('... (truncated view)');
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async generateJSON(data: any) {
    return JSON.stringify(data, null, 2);
  }
}
