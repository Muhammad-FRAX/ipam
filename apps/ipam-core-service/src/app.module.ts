import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { IpamModule } from './ipam.module';

@Module({
  imports: [DatabaseModule, IpamModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
