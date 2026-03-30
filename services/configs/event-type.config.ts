import { postData, patchData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { CreateEventTypeBody, UpdateEventTypeBody } from './event-type.types'
import type { EventType } from './booking.types'
import type { ApiResponse } from './user.config'

const eventTypeApiConfig = {
	create: endpoint<CreateEventTypeBody, ApiResponse<EventType>>({
		url: () => `/api/event-types`,
		method: postData,
		defaultErrorMessage: 'Failed to create event type',
	}),

	update: endpoint<UpdateEventTypeBody, ApiResponse<EventType>>({
		url: ({ id }) => `/api/event-types/${id}`,
		method: patchData,
		defaultErrorMessage: 'Failed to update event type',
	}),

	remove: endpoint<void, ApiResponse<null>>({
		url: ({ id }) => `/api/event-types/${id}`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete event type',
	}),
}

export default eventTypeApiConfig
