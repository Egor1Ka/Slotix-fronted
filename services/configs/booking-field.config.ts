import {
	getData,
	postData,
	patchData,
	deleteData,
} from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type {
	BookingField,
	CreateBookingFieldBody,
	UpdateBookingFieldBody,
	MergedBookingForm,
} from './booking-field.types'
import type { ApiResponse } from './user.config'

const bookingFieldApiConfig = {
	getAll: endpoint<void, ApiResponse<BookingField[]>>({
		url: ({ ownerId, ownerType, eventTypeId }) => {
			const params = new URLSearchParams({
				ownerId: String(ownerId),
				ownerType: String(ownerType),
			})
			if (eventTypeId) params.set('eventTypeId', String(eventTypeId))
			return `/api/booking-fields?${params.toString()}`
		},
		method: getData,
	}),

	create: endpoint<CreateBookingFieldBody, ApiResponse<BookingField>>({
		url: () => `/api/booking-fields`,
		method: postData,
	}),

	update: endpoint<UpdateBookingFieldBody, ApiResponse<BookingField>>({
		url: ({ id }) => `/api/booking-fields/${id}`,
		method: patchData,
	}),

	remove: endpoint<void, ApiResponse<null>>({
		url: ({ id }) => `/api/booking-fields/${id}`,
		method: deleteData,
	}),

	getMergedForm: endpoint<void, ApiResponse<MergedBookingForm>>({
		url: ({ eventTypeId }) => `/api/booking-form/${eventTypeId}`,
		method: getData,
	}),
}

export default bookingFieldApiConfig
