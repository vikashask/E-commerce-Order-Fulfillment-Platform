import { Module } from '@nestjs/common';
import { GatewayController } from './proxy/gateway.controller.js';
import { GatewayService } from './proxy/gateway.service.js';

@Module({
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class AppModule {}
