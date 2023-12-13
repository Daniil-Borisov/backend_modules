import NotificationEvent from 'libs/database/enums/notification_event.enum';
import NotificationEventMetadata from './notification-event-metadata.type';

export interface NotificationEventRequest<Key extends NotificationEvent> {
	key: Key;
	value: NotificationEventMetadata[Key];
}
