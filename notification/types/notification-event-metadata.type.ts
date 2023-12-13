import NotificationEvent from 'libs/database/enums/notification_event.enum';

type NotificationEventMetadata = {
	invoice_sent: { key: NotificationEvent.InvoiceSent; userId: string; invoiceId: string };
	invoice_change_status: { key: NotificationEvent.InvoiceChangeStatus; userId: string; invoiceId: string };
	email_verification: {
		key: NotificationEvent.EmailVerification;
		userId: string;
		token: string;
		email: string;
		frontendUrl: string;
	};
	invoice_paid: { key: NotificationEvent.InvoicePaid; userId: string; invoiceId: string; email: string };
};

export default NotificationEventMetadata;
