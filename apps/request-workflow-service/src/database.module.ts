import { Module } from '@nestjs/common';
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
