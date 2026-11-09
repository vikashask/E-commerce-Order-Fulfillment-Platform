import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { NotificationService } from './notification.service.js';

@Controller('api/v1')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('notifications')
  create(@Body() body: { eventId?: string; recipientId?: string; channel?: string; templateKey: string; payload: Record<string, unknown> }) {
    return this.notificationService.createNotification(body);
  }

  @Get('notifications/:id')
  get(@Param('id') id: string) { return this.notificationService.getNotification(id); }

  @Get('notifications')
  list(@Query('recipientId') recipientId?: string, @Query('limit') limit?: string) {
    return this.notificationService.listNotifications(recipientId, limit ? parseInt(limit) : 20);
  }
}
