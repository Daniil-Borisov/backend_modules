import { InjectRepository } from '@mikro-orm/nestjs';
import { Collection, QueryFlag, QueryOrderMap } from '@mikro-orm/core';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ListItemsDto } from 'src/common/dto/list_items.dto';
import InvoiceEntity from 'libs/database/entities/invoice.entity';
import ServiceEntity from 'libs/database/entities/service.entity';
import InvoiceStatus from 'libs/database/enums/invoice_status.enum';
import { InvoiceDto } from './dto/invoice.dto';
import UserEntity from 'libs/database/entities/user.entity';
import { ResponsePdfLinkDto } from './dto/response_pdf_link.dto';
import { NotificationService } from 'src/notification/notification.service';
import { FileStorageService } from 'libs/file-storage';
import { Browser } from 'puppeteer';
import { TemplateFunction } from 'ejs';
import { ImageResponseDto } from 'src/common/dto/image_response.dto';
import path from 'path';
import ChartPeriod from './enums/chart_period.enum';
import { ChartDto } from './dto/chart.dto';
import ClientEntity from 'libs/database/entities/client.entity';
import { ResponseInvoiceNumberDto } from './dto/response_invoice_number.dto';
import InvoiceNumber from 'libs/database/enums/invoice_number.enum';
import InvoiceListSort from './types/invoice_list_sort.enum';
import OrderBy from 'src/common/types/order_by.enum';
import { ClientInvoicesStatisticsDto } from './dto/client_invoices_statistics';
import UserEmailStatus from 'libs/database/enums/user_email_status.enum';

@Injectable()
export class InvoiceService {
	readonly #numberItemsPerPage = 6;

	constructor(
		private readonly em: EntityManager,
		@InjectRepository(InvoiceEntity)
		private readonly invoiceRepository: EntityRepository<InvoiceEntity>,
		@InjectRepository(ServiceEntity)
		private readonly serviceRepository: EntityRepository<ServiceEntity>,
		@InjectRepository(UserEntity)
		private readonly userRepository: EntityRepository<UserEntity>,
		@InjectRepository(ClientEntity)
		private readonly clientRepository: EntityRepository<ClientEntity>,
		private readonly notificationService: NotificationService,
		private readonly fileStorageService: FileStorageService,
		@Inject('PUPPETEER_INSTANCE') private readonly browser: Browser,
		@Inject('EJS_TEMPLATE_INSTANCE') private readonly template: TemplateFunction
	) {}

	public async createInvoice(userId: string, invoice: InvoiceDto, isDraft = false): Promise<InvoiceDto> {
		invoice.status = isDraft ? InvoiceStatus.Draft : InvoiceStatus.New;
		invoice.author = userId;

		const user = await this.userRepository.findOne(userId, { populate: ['emails', 'wallets'] });

		if (user == null) {
			throw new BadRequestException('Not Found User');
		}

		const isValidEmail = user.emails
			.getItems()
			.some(
				(emailEntity) =>
					emailEntity.status == UserEmailStatus.Verified && emailEntity.email == invoice.invoiceFromEmail
			);

		if (isValidEmail == false) {
			throw new BadRequestException('Not Verified Email');
		}

		const isValidWallet = user.wallets.getItems().some((walletEntity) => walletEntity.publicAddress == invoice.walletNumber);

		if (isValidWallet == false) {
			throw new BadRequestException('This wallet does not belong to the user');
		}

		const client = await this.clientRepository.count(invoice.client);

		if (client == 0) {
			throw new BadRequestException('Not Found Client');
		}

		invoice.total = 0;

		for (const service of invoice.services) {
			service.amount = service.rate * service.qty;

			invoice.total += service.amount;
		}

		const invoiceNumberDto = await this.getInvoiceNumber(userId);
		invoice.number = invoiceNumberDto.invoiceNumber;

		const newInvoice = this.invoiceRepository.create(invoice);

		newInvoice.logoUrl = user.logoUrl;
		newInvoice.services = new Collection<ServiceEntity>(newInvoice);

		await this.invoiceRepository.persistAndFlush(newInvoice);

		for (const service of invoice.services) {
			newInvoice.services.add(this.serviceRepository.create(service));
		}

		await this.invoiceRepository.persistAndFlush(newInvoice);

		user.invoiceNumberCounter += 1;

		this.userRepository.persistAndFlush(user);

		if (invoice.status == InvoiceStatus.New) {
			await this.generateInvoice(userId, newInvoice);
			await this.notificationService.notifyInvoiceSent(userId, newInvoice.id);
		}

		return newInvoice;
	}

	public async updateInvoice(userId: string, id: string, newInvoiceData: InvoiceDto): Promise<InvoiceDto> {
		const invoice = await this.invoiceRepository.findOne({ id, author: userId }, { populate: ['services', 'services.tag'] });

		if (invoice == null) {
			throw new NotFoundException('Invoice not found');
		}

		if (invoice.status != InvoiceStatus.Draft) {
			throw new NotFoundException('You can only change the draft');
		}

		const user = await this.userRepository.findOne(userId, { populate: ['emails', 'wallets'] });

		if (user == null) {
			throw new BadRequestException('Not Found User');
		}

		if (newInvoiceData.invoiceFromEmail !== undefined) {
			const isValidEmail = user.emails
				.getItems()
				.some(
					(emailEntity) =>
						emailEntity.status == UserEmailStatus.Verified &&
						emailEntity.email == newInvoiceData.invoiceFromEmail
				);

			if (isValidEmail == false) {
				throw new BadRequestException('Not Verified Email');
			}
		}

		if (newInvoiceData.walletNumber !== undefined) {
			const isValidWallet = user.wallets
				.getItems()
				.some((walletEntity) => walletEntity.publicAddress == newInvoiceData.walletNumber);

			if (isValidWallet == false) {
				throw new BadRequestException('This wallet does not belong to the user');
			}
		}

		if (newInvoiceData.client !== undefined) {
			const client = await this.clientRepository.count(newInvoiceData.client);

			if (client == 0) {
				throw new BadRequestException('Not Found Client');
			}
		}

		if (newInvoiceData.services !== undefined) {
			const serviceMap = new Map<string, ServiceEntity>();

			for (const service of newInvoiceData.services) {
				serviceMap.set(service.id, service);
			}

			for (const service of invoice.services) {
				if (serviceMap.has(service.id)) {
					this.serviceRepository.assign(service, serviceMap.get(service.id)!);
				}
			}
		}

		invoice.total = 0;

		for (const service of invoice.services) {
			service.amount = service.rate * service.qty;
			invoice.total += service.amount;
		}

		await this.invoiceRepository.persistAndFlush(invoice);

		if (newInvoiceData.status == InvoiceStatus.New) {
			await this.generateInvoice(userId, invoice);
			await this.notificationService.notifyInvoiceSent(userId, id);
		}

		return invoice;
	}

	public async setInvoiceArchive(userId: string, id: string): Promise<InvoiceDto> {
		const invoice = await this.invoiceRepository.findOne({ id, author: userId }, { populate: ['services', 'services.tag'] });

		if (invoice == null) {
			throw new NotFoundException('Invoice not found');
		}

		if (invoice.status != InvoiceStatus.Paid) {
			throw new NotFoundException('You can only move a paid invoice to the archive');
		}

		invoice.status = InvoiceStatus.Archive;

		await this.invoiceRepository.persistAndFlush(invoice);

		return invoice;
	}

	public async listOutgoingInvoices(userId: string, page = 1): Promise<ListItemsDto<InvoiceDto>> {
		if (page < 1) {
			throw new BadRequestException('Page cannot be less than 1');
		}

		const [invoices, count] = await this.invoiceRepository.findAndCount(
			{ author: userId, status: { $ne: InvoiceStatus.Draft } },
			{
				offset: (page - 1) * this.#numberItemsPerPage,
				limit: this.#numberItemsPerPage,
				populate: ['services', 'services.tag'],
				flags: [QueryFlag.PAGINATE],
			}
		);

		const response = ListItemsDto.init<InvoiceDto>(invoices, page, count, this.#numberItemsPerPage);

		return response;
	}

	public async chartSumInvoicesDates(userId: string, period: ChartPeriod, side: 'outcoming' | 'incoming'): Promise<ChartDto[]> {
		let dateTrunc = '';
		let interval = '';
		let periodTime = '';

		switch (period) {
			case ChartPeriod.Daily:
				dateTrunc = 'hour';
				interval = '1 hour';
				periodTime = '1 day';
				break;
			case ChartPeriod.Weekly:
				dateTrunc = 'day';
				interval = '1 day';
				periodTime = '1 week';
				break;
			case ChartPeriod.Monthly:
				dateTrunc = 'day';
				interval = '1 day';
				periodTime = '1 month';
				break;
			case ChartPeriod.Yearly:
				dateTrunc = 'month';
				interval = '1 month';
				periodTime = '1 year';
				break;
			case ChartPeriod.All:
				dateTrunc = 'year';
				periodTime = '1 year';
				break;
		}

		const qb = this.invoiceRepository.qb();

		const sumInvoicesDates = `
			SELECT extract(epoch from date_trunc('${dateTrunc}',  create_date))::BIGINT as date, SUM(total::BIGINT) as value
			FROM public.invoice
			WHERE create_date > CURRENT_TIMESTAMP - interval '${periodTime}'  AND :side: = :userId AND status = '${InvoiceStatus.Paid}'
			GROUP BY date_trunc('${dateTrunc}', create_date)
		`;
		const turnTimePeriod = `
			SELECT extract(epoch from date_trunc('${dateTrunc}',  key))::BIGINT as key, COALESCE(value, 0)::BIGINT as value
			FROM generate_series (CURRENT_TIMESTAMP - interval '${periodTime}', CURRENT_TIMESTAMP, interval  '${interval}') as key
			LEFT JOIN(
				${sumInvoicesDates}
			) as chartData
			ON extract(epoch from date_trunc('${dateTrunc}',  key)) = chartData.date
		`;
		const sql = period == ChartPeriod.All ? sumInvoicesDates : turnTimePeriod;
		const result = await qb.raw(sql, {
			side: side == 'outcoming' ? 'author_id' : 'client_user_id',
			userId,
		});

		return result.rows;
	}

	public async chartSumInvoicesTags(userId: string, side: 'outcoming' | 'incoming'): Promise<ChartDto[]> {
		const qb = this.invoiceRepository.qb();

		const sumInvoicesTag = `
			SELECT tag.name as key, COALESCE(SUM(amount::BIGINT), 0) as value
			FROM tag
			LEFT JOIN (
				SELECT service.tag_id, service.amount
				FROM service
				JOIN invoice
				ON invoice.id = service.invoice_id
				WHERE invoice.status = '${InvoiceStatus.Paid}' AND :side: = :userId
			) as service
			ON tag.id = service.tag_id
			WHERE tag.user_id ISNULL OR tag.user_id = :userId
			GROUP BY tag.name
		`;

		const result = await qb.raw(sumInvoicesTag, {
			side: side == 'outcoming' ? 'author_id' : 'client_user_id',
			userId,
		});

		return result.rows;
	}

	public async listIncomingInvoices(userId: string, page = 1): Promise<ListItemsDto<InvoiceDto>> {
		if (page < 1) {
			throw new BadRequestException('Page cannot be less than 1');
		}

		const [invoices, count] = await this.invoiceRepository.findAndCount(
			{
				clientUser: userId,
				status: { $ne: InvoiceStatus.Draft },
			},
			{
				offset: (page - 1) * this.#numberItemsPerPage,
				limit: this.#numberItemsPerPage,
				populate: ['services', 'services.tag'],
				flags: [QueryFlag.PAGINATE],
			}
		);

		const response = ListItemsDto.init<InvoiceDto>(invoices, page, count, this.#numberItemsPerPage);

		return response;
	}

	public async listDrafts(userId: string, page = 1): Promise<ListItemsDto<InvoiceDto>> {
		if (page < 1) {
			throw new BadRequestException('Page cannot be less than 1');
		}

		const [invoices, count] = await this.invoiceRepository.findAndCount(
			{ author: userId, status: InvoiceStatus.Draft },
			{
				offset: (page - 1) * this.#numberItemsPerPage,
				limit: this.#numberItemsPerPage,
				populate: ['services', 'services.tag'],
				flags: [QueryFlag.PAGINATE],
			}
		);

		const response = ListItemsDto.init<InvoiceDto>(invoices, page, count, this.#numberItemsPerPage);

		return response;
	}

	public async listClientInvoices(
		userId: string,
		clientId: string,
		page = 1,
		sortBy?: InvoiceListSort,
		orderBy: OrderBy = OrderBy.ASC,
		status?: InvoiceStatus
	): Promise<ListItemsDto<InvoiceDto>> {
		if (page < 1) {
			throw new BadRequestException('Page cannot be less than 1');
		}

		const statusObject = status == undefined ? {} : { status };
		let orderByObject: QueryOrderMap<InvoiceEntity> | undefined = undefined;

		switch (sortBy) {
			case InvoiceListSort.InvoiceNumber:
				orderByObject = {
					number: orderBy,
				};
				break;
			case InvoiceListSort.DueDate:
				orderByObject = {
					dueDate: orderBy,
				};
				break;
			case InvoiceListSort.Total:
				orderByObject = {
					total: orderBy,
				};
				break;
		}

		const [invoices, count] = await this.invoiceRepository.findAndCount(
			{ author: userId, client: clientId, ...statusObject },
			{
				offset: (page - 1) * this.#numberItemsPerPage,
				limit: this.#numberItemsPerPage,
				populate: ['services', 'services.tag'],
				flags: [QueryFlag.PAGINATE],
				orderBy: orderByObject,
			}
		);

		const response = ListItemsDto.init<InvoiceDto>(invoices, page, count, this.#numberItemsPerPage);

		return response;
	}

	public async getClientInvoicesStatistics(userId: string, clientId: string): Promise<ClientInvoicesStatisticsDto> {
		type Statistic = {
			status: string;
			countStatusInvoices: number;
			sumAmountInvoices: number;
			countInvoices: number;
		};

		const knex = this.em.getConnection().getKnex();
		const query = knex
			.select(
				knex.raw('statuses as "status"'),
				knex.raw(
					`(SELECT COUNT(id)::INTEGER 
					  FROM invoice 
					  WHERE status = statuses AND author_id = :userId AND client_id = :clientId
					) as "countStatusInvoices"`
				),
				knex.raw(
					`(SELECT COALESCE(SUM(total), 0)::INTEGER 
					  FROM invoice 
					  WHERE status = statuses AND author_id = :userId AND client_id = :clientId
					) as "sumAmountInvoices"`
				),
				knex.raw(
					'(SELECT COUNT(id)::INTEGER FROM invoice WHERE author_id = :userId AND client_id = :clientId) as "countInvoices"'
				)
			)
			.fromRaw(`unnest(ARRAY['${Object.values(InvoiceStatus).join("','")}']) as statuses`);

		const result = await this.em.raw(query.toQuery(), { userId, clientId });
		const statistics: Statistic[] = result.rows;
		const response = new ClientInvoicesStatisticsDto();

		let totalAmountEarned = 0;

		for (const statistic of statistics) {
			switch (statistic.status) {
				case 'draft':
					response.draftCount = statistic.countStatusInvoices;
					break;
				case 'new':
					response.newCount = statistic.countStatusInvoices;
					break;
				case 'pending_payment':
					response.pendingPaymentCount = statistic.countStatusInvoices;
					break;
				case 'paid':
					response.paidCount = statistic.countStatusInvoices;
					totalAmountEarned += statistic.sumAmountInvoices;
					break;
				case 'archive':
					response.archiveCount = statistic.countStatusInvoices;
					totalAmountEarned += statistic.sumAmountInvoices;
					break;
			}
		}

		response.total = statistics[0].countInvoices;
		response.totalAmountEarned = totalAmountEarned;

		return response;
	}

	public async getInvoice(userId: string, id: string): Promise<InvoiceDto> {
		const invoice = await this.invoiceRepository.findOne(
			{ id, author: userId },
			{ populate: ['services', 'services.tag', 'client'] }
		);

		if (invoice == null) {
			throw new NotFoundException('Invoice not found');
		}

		return invoice;
	}

	public async getPdfLink(userId: string, id: string): Promise<ResponsePdfLinkDto> {
		const invoice = await this.invoiceRepository.findOne({ id, author: userId });

		if (invoice == null) {
			throw new NotFoundException('Invoice not found');
		}

		if (invoice.status == InvoiceStatus.Draft || invoice.status == InvoiceStatus.New) {
			throw new NotFoundException('An invoice with this status does not have a pdf');
		}

		return {
			url: await this.fileStorageService.getInvoiceUrl(id),
		};
	}

	private async generateInvoice(userId: string, invoice: InvoiceEntity): Promise<void> {
		const client = await this.clientRepository.findOne(invoice.client);

		if (client == null) {
			return;
		}

		const page = await this.browser.newPage();

		await page.setContent(this.template({ ...invoice, ...client }));

		const pdfStream = await page.createPDFStream();

		await this.fileStorageService.saveInvoice(invoice.id, pdfStream);
		await page.close();

		invoice.status = InvoiceStatus.PendingPayment;

		await this.invoiceRepository.persistAndFlush(invoice);
		await this.notificationService.notifyInvoiceChangeStatus(userId, invoice.id);
	}

	public async saveLogo(userId: string, id: string, file: Express.Multer.File): Promise<ImageResponseDto> {
		const invoice = await this.invoiceRepository.findOne({ id, author: userId });

		if (invoice == null) {
			throw new NotFoundException('Invoice not found');
		}

		if (invoice.status != InvoiceStatus.Draft) {
			throw new NotFoundException('You can only change the draft');
		}

		const url = await this.fileStorageService.saveImage(id, file.buffer, path.extname(file.originalname), 'invoice');

		invoice.logoUrl = url;

		this.invoiceRepository.persistAndFlush(invoice);

		return { image: url };
	}

	public async getInvoiceNumber(userId: string): Promise<ResponseInvoiceNumberDto> {
		const user = await this.userRepository.findOne(userId);

		if (user == null) {
			throw new NotFoundException('User not found');
		}

		const currentDate = new Date();
		const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, '0');
		const day = currentDate.getUTCDate().toString().padStart(2, '0');
		const year = currentDate.getUTCFullYear().toString().slice(-2);
		const counterValue = user.invoiceNumberCounter.toString().padStart(4, '0');
		const prefix = user.invoiceNumberType == InvoiceNumber.Prefix ? user.invoiceNumberPrefix : '';

		const invoiceNumber = `${prefix}${month}${day}${year}-${counterValue}`;

		return { invoiceNumber };
	}
}
