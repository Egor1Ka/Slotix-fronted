import { getData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { BookingStatusListResponse } from './bookingStatus.types'

const bookingStatusApiConfig = {
	list: endpoint<void, BookingStatusListResponse>({
		url: ({ scope, orgId }) => {
			const params = new URLSearchParams({ scope: String(scope) })
			if (orgId) params.set('orgId', String(orgId))
			return `/api/booking-statuses?${params.toString()}`
		},
		method: getData,
		defaultErrorMessage: 'Failed to load booking statuses',
	}),
}

export default bookingStatusApiConfig
