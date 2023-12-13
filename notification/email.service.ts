import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { Attachment } from 'nodemailer/lib/mailer';

type Template = 'newInvoice' | 'confirmEmail' | 'invoicePaid';

@Injectable()
export class EmailService {
	constructor(private readonly mailerService: MailerService) {}

	public async send(
		email: string,
		subject: string,
		template: Template,
		params?: {
			[name: string]: any;
		},
		attachments?: Attachment[]
	) {
		await this.mailerService.sendMail({
			to: email,
			subject: subject,
			template: `${template}.html`,
			context: params,
			attachments: attachments,
		});
	}
}
