import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import InvoiceStatus from 'libs/database/enums/invoice_status.enum';
import { memoryStorage } from 'multer';
import { FastifyFileInterceptor } from 'nest-fastify-multer';
import { CREATE, UPDATE } from 'nestjs-joi';
import { UserId } from 'src/common/decorators/user.decorator';
import { ImageResponseDto } from 'src/common/dto/image_response.dto';
import { ListItemsDto } from 'src/common/dto/list_items.dto';
import OrderBy from 'src/common/types/order_by.enum';
import joi2swagger from 'src/common/utils/joi2swagger';
import { PictureService } from 'src/picture/picture.service';
import { ClientInvoicesStatisticsDto } from './dto/client_invoices_statistics';
import { InvoiceDto } from './dto/invoice.dto';
import { ResponseInvoiceNumberDto } from './dto/response_invoice_number.dto';
import { ResponsePdfLinkDto } from './dto/response_pdf_link.dto';
import { InvoiceService } from './invoice.service';
import InvoiceListSort from './types/invoice_list_sort.enum';

@ApiTags('Invoice')
@Controller('invoice')
export class InvoiceController {
	constructor(private invoiceService: InvoiceService) {}

	@Post('draft')
	@ApiOperation({ summary: 'Create a new draft record' })
	@ApiBody(joi2swagger(InvoiceDto, CREATE))
	@ApiOkResponse(joi2swagger(InvoiceDto, 'RESPONSE'))
	async createDraft(@UserId() userId: string, @Body() createInvoiceDto: InvoiceDto): Promise<InvoiceDto> {
		return await this.invoiceService.createInvoice(userId, createInvoiceDto, true);
	}

	@Patch('draft/:id')
	@ApiOperation({ summary: 'Update draft record' })
	@ApiBody(joi2swagger(InvoiceDto, UPDATE))
	@ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
	@ApiOkResponse(joi2swagger(InvoiceDto, 'RESPONSE'))
	async updateInvoice(
		@Param('id', ParseUUIDPipe) id: string,
		@UserId() userId: string,
		@Body() updateInvoiceDto: InvoiceDto
	): Promise<InvoiceDto> {
		return await this.invoiceService.updateInvoice(userId, id, updateInvoiceDto);
	}

	@Patch('archive/:id')
	@ApiOperation({ summary: 'Move invoice in archive' })
	@ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
	@ApiOkResponse(joi2swagger(InvoiceDto, 'RESPONSE'))
	async setInvoiceArchive(@Param('id', ParseUUIDPipe) id: string, @UserId() userId: string): Promise<InvoiceDto> {
		return await this.invoiceService.setInvoiceArchive(userId, id);
	}

	@Post()
	@ApiOperation({ summary: 'Create a new invoice record' })
	@ApiBody(joi2swagger(InvoiceDto, CREATE))
	@ApiOkResponse(joi2swagger(InvoiceDto, 'RESPONSE'))
	async createInvoice(@UserId() userId: string, @Body() createInvoiceDto: InvoiceDto): Promise<InvoiceDto> {
		return await this.invoiceService.createInvoice(userId, createInvoiceDto);
	}

	@Get('outgoing')
	@ApiOperation({ summary: 'Get list outgoing invoices' })
	@ApiQuery({ name: 'page', schema: { type: 'number' }, required: false })
	@ApiOkResponse(joi2swagger(ListItemsDto, undefined, InvoiceDto))
	async listOutgoingInvoices(@UserId() userId: string, @Query('page') page: number | undefined): Promise<ListItemsDto<InvoiceDto>> {
		return await this.invoiceService.listOutgoingInvoices(userId, page);
	}

	@Get('incoming')
	@ApiOperation({ summary: 'Get list incoming invoices' })
	@ApiQuery({ name: 'page', schema: { type: 'number' }, required: false })
	@ApiOkResponse(joi2swagger(ListItemsDto, undefined, InvoiceDto))
	async listIncomingInvoices(@UserId() userId: string, @Query('page') page: number | undefined): Promise<ListItemsDto<InvoiceDto>> {
		return await this.invoiceService.listIncomingInvoices(userId, page);
	}

	@Get('drafts')
	@ApiOperation({ summary: 'Get list drafts invoices' })
	@ApiQuery({ name: 'page', schema: { type: 'number' }, required: false })
	@ApiOkResponse(joi2swagger(ListItemsDto, undefined, InvoiceDto))
	async listDraftsInvoices(@UserId() userId: string, @Query('page') page: number | undefined): Promise<ListItemsDto<InvoiceDto>> {
		return await this.invoiceService.listDrafts(userId, page);
	}

	@Get('client/:clientId')
	@ApiOperation({ summary: 'Get list invoices by client id' })
	@ApiParam({ name: 'clientId', schema: { type: 'string', format: 'uuid' } })
	@ApiQuery({ name: 'page', schema: { type: 'number' }, required: false })
	@ApiQuery({ name: 'sort_by', schema: { enum: Object.values(InvoiceListSort) }, required: false })
	@ApiQuery({ name: 'order_by', schema: { enum: Object.values(OrderBy) }, required: false })
	@ApiQuery({ name: 'status', schema: { enum: Object.values(InvoiceStatus) }, required: false })
	@ApiOkResponse(joi2swagger(ListItemsDto, undefined, InvoiceDto))
	async listClientInvoices(
		@Param('clientId', ParseUUIDPipe) clientId: string,
		@UserId() userId: string,
		@Query('page') page: number | undefined,
		@Query('sort_by') sortBy: InvoiceListSort | undefined,
		@Query('order_by') orderBy: OrderBy | undefined,
		@Query('status') status: InvoiceStatus | undefined
	): Promise<ListItemsDto<InvoiceDto>> {
		return await this.invoiceService.listClientInvoices(userId, clientId, page, sortBy, orderBy, status);
	}

	@Get('statistics/:clientId')
	@ApiOperation({ summary: 'Get invoices statistics specified client id' })
	@ApiParam({ name: 'clientId', schema: { type: 'string', format: 'uuid' } })
	@ApiOkResponse(joi2swagger(ClientInvoicesStatisticsDto))
	async getClientInvoicesStatistics(
		@Param('clientId', ParseUUIDPipe) clientId: string,
		@UserId() userId: string
	): Promise<ClientInvoicesStatisticsDto> {
		return await this.invoiceService.getClientInvoicesStatistics(userId, clientId);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get one invoice by id' })
	@ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
	@ApiOkResponse(joi2swagger(InvoiceDto, 'GET_INVOICE'))
	async getInvoice(@Param('id', ParseUUIDPipe) id: string, @UserId() userId: string): Promise<InvoiceDto> {
		return await this.invoiceService.getInvoice(userId, id);
	}

	@Get(':id/pdf-link')
	@ApiOperation({ summary: 'Get url pdf invoice' })
	@ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
	@ApiOkResponse(joi2swagger(ResponsePdfLinkDto))
	async getPdfLink(@Param('id', ParseUUIDPipe) id: string, @UserId() userId: string): Promise<ResponsePdfLinkDto> {
		return await this.invoiceService.getPdfLink(userId, id);
	}

	@Post(':id/logo')
	@ApiOperation({ summary: 'Set logo' })
	@FastifyFileInterceptor('logo', {
		storage: memoryStorage(),
		fileFilter: PictureService.imageFileFilter,
		limits: {
			fileSize: 1048576,
		},
	})
	@ApiOkResponse(joi2swagger(ImageResponseDto))
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			required: ['logo'],
			properties: {
				logo: {
					type: 'string',
					format: 'binary',
				},
			},
		},
	})
	async updateLogo(
		@Param('id', ParseUUIDPipe) id: string,
		@UserId() userId: string,
		@UploadedFile() file: Express.Multer.File
	): Promise<ImageResponseDto> {
		return await this.invoiceService.saveLogo(userId, id, file);
	}

	@Get('invoice-number')
	@ApiOperation({ summary: 'Get current invoice number' })
	@ApiOkResponse(joi2swagger(ResponseInvoiceNumberDto))
	async getInvoiceNumber(@UserId() userId: string): Promise<ResponseInvoiceNumberDto> {
		return await this.invoiceService.getInvoiceNumber(userId);
	}
}
