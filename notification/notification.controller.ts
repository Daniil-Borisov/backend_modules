import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiQuery, ApiOperation, ApiOkResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import joi2swagger from 'src/common/utils/joi2swagger';
import { UserId } from 'src/common/decorators/user.decorator';
import { NotificationService } from './notification.service';
import { NotificationsListDto } from './dto/notifications_list.dto';
import { ListItemsDto } from 'src/common/dto/list_items.dto';
import { NotificationDto } from './dto/notification.dto';

@ApiTags('Notification')
@Controller('notification')
export class NotificationController {
	constructor(private notificationService: NotificationService) {}

	@Get()
	@ApiOperation({ summary: 'Get list notifications' })
	@ApiQuery({ name: 'fromId', schema: { type: 'string', format: 'uuid' }, required: false })
	@ApiQuery({ name: 'page', schema: { type: 'number' }, required: false })
	@ApiQuery({ name: 'status', schema: { enum: ['read', 'unread'] }, required: false })
	@ApiOkResponse(joi2swagger(ListItemsDto, 'LIST', NotificationDto))
	async listNotifications(
		@UserId() userId: string,
		@Query('fromId') fromId: string | undefined,
		@Query('page') page: number | undefined,
		@Query('status') status: 'read' | 'unread'
	): Promise<ListItemsDto<NotificationDto>> {
		return await this.notificationService.listNotifications(userId, fromId, page, status);
	}

	@Patch('mark-read/:id')
	@ApiOperation({ summary: 'Mark read notification by id' })
	@ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
	@ApiOkResponse({ status: 200 })
	async markRead(@UserId() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
		await this.notificationService.markRead(userId, id);
	}

	@Patch('mark-read-list')
	@ApiOperation({ summary: 'Mark read notifications' })
	@ApiBody(joi2swagger(NotificationsListDto))
	@ApiOkResponse({ status: 200 })
	async markReadList(@UserId() userId: string, @Body() notificationsListDto: NotificationsListDto): Promise<void> {
		await this.notificationService.markReadList(userId, notificationsListDto.notifications);
	}

	@Patch('mark-read-all')
	@ApiOperation({ summary: 'Mark read notifications' })
	@ApiOkResponse({ status: 200 })
	async markReadAll(@UserId() userId: string): Promise<void> {
		await this.notificationService.markReadAll(userId);
	}
}
