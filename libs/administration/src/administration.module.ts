import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AdministrationService } from './service/administration.service';

@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [AdministrationService],
  exports: [AdministrationService],
})
export class AdministrationModule {}
