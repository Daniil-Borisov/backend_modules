import { Controller, Get, Param, ParseEnumPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserId } from 'src/common/decorators/user.decorator';
import { joi2swaggerList } from 'src/common/utils/joi2swagger';
import { ChartDto } from './dto/chart.dto';
import ChartPeriod from './enums/chart_period.enum';
import { InvoiceService } from './invoice.service';

@ApiTags('Chart')
@Controller('invoice/chart')
export class ChartController {
	constructor(private invoiceService: InvoiceService) {}

	@Get('outgoing/:period')
	@ApiOperation({ summary: 'Get information about the amount received from paid invoices for a specific period' })
	@ApiParam({ name: 'period', schema: { type: 'string', enum: Object.values(ChartPeriod) } })
	@ApiOkResponse(joi2swaggerList(ChartDto))
	async sumOutgoingInvoicesDates(
		@UserId() userId: string,
		@Param('period', new ParseEnumPipe(ChartPeriod)) period: ChartPeriod
	): Promise<ChartDto[]> {
		return await this.invoiceService.chartSumInvoicesDates(userId, period, 'outcoming');
	}

	@Get('incoming/:period')
	@ApiOperation({ summary: 'Get information about the amount spent on received invoices for a specific period' })
	@ApiParam({ name: 'period', schema: { type: 'string', enum: Object.values(ChartPeriod) } })
	@ApiOkResponse(joi2swaggerList(ChartDto))
	async sumIncomingInvoicesDates(
		@UserId() userId: string,
		@Param('period', new ParseEnumPipe(ChartPeriod)) period: ChartPeriod
	): Promise<ChartDto[]> {
		return await this.invoiceService.chartSumInvoicesDates(userId, period, 'incoming');
	}

	@Get('tags/outgoing')
	@ApiOperation({ summary: 'Get information about the amount received for services' })
	@ApiOkResponse(joi2swaggerList(ChartDto))
	async sumOutgoingInvoicesTags(@UserId() userId: string): Promise<ChartDto[]> {
		return await this.invoiceService.chartSumInvoicesTags(userId, 'outcoming');
	}

	@Get('tags/incoming')
	@ApiOperation({ summary: 'Get information about the amount spent on services' })
	@ApiOkResponse(joi2swaggerList(ChartDto))
	async sumIncomingInvoicesTags(@UserId() userId: string): Promise<ChartDto[]> {
		return await this.invoiceService.chartSumInvoicesTags(userId, 'incoming');
	}
}
