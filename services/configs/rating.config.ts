import { getData, putData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { ApiResponse } from './user.config'
import type { RatingSummary, SetRatingBody } from './rating.types'

const ratingApiConfig = {
	get: endpoint<void, ApiResponse<RatingSummary>>({
		url: ({ targetType, targetId }) =>
			`/api/ratings/${targetType}/${targetId}`,
		method: getData,
		defaultErrorMessage: 'Failed to load rating',
	}),
	set: endpoint<SetRatingBody, ApiResponse<RatingSummary>>({
		url: ({ targetType, targetId }) =>
			`/api/ratings/${targetType}/${targetId}`,
		method: putData,
		defaultErrorMessage: 'Failed to save rating',
	}),
	remove: endpoint<void, ApiResponse<RatingSummary>>({
		url: ({ targetType, targetId }) =>
			`/api/ratings/${targetType}/${targetId}`,
		method: deleteData,
		defaultErrorMessage: 'Failed to remove rating',
	}),
}

export default ratingApiConfig
