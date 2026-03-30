import { getData, postData, patchData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type {
	Position,
	CreatePositionBody,
	UpdatePositionBody,
} from './position.types'
import type { ApiResponse } from './user.config'

const positionApiConfig = {
	getByOrg: endpoint<void, ApiResponse<Position[]>>({
		url: ({ orgId }) => `/api/positions?orgId=${orgId}`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch positions',
	}),

	create: endpoint<CreatePositionBody, ApiResponse<Position>>({
		url: () => `/api/positions`,
		method: postData,
		defaultErrorMessage: 'Failed to create position',
	}),

	update: endpoint<UpdatePositionBody, ApiResponse<Position>>({
		url: ({ id }) => `/api/positions/${id}`,
		method: patchData,
		defaultErrorMessage: 'Failed to update position',
	}),

	remove: endpoint<void, ApiResponse<null>>({
		url: ({ id }) => `/api/positions/${id}`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete position',
	}),
}

export default positionApiConfig
