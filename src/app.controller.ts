import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getApiInfo() {
    return this.appService.getApiInfo();
  }

  @Get('health')
  @Public()
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('ready')
  @Public()
  getReady() {
    return this.appService.getReady();
  }

  @Get('live')
  @Public()
  getLive() {
    return this.appService.getLive();
  }
}
