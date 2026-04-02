import { getData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { UserSearchResult } from './user-search.types'
import type { ApiResponse } from './user.config'

const userSearchApiConfig = {
	searchByEmail: endpoint<void, ApiResponse<UserSearchResult[]>>({
		url: () => `/api/users/search`,
		method: getData,
		defaultErrorMessage: 'Failed to search users',
	}),
}

export default userSearchApiConfig
