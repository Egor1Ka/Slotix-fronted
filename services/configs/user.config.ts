import { getData, putData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface User {
	id: string
	name: string
	email: string
	avatar: string
	description: string | null
	address: string | null
	phone: string | null
	website: string | null
	createdAt: string
	updatedAt: string
}

interface UpdateUserBody {
	name?: string
	description?: string | null
	address?: string | null
	phone?: string | null
	website?: string | null
}

interface ApiResponse<T> {
	data: T
	statusCode: number
	status: string
}

const userApiConfig = {
	me: endpoint<void, ApiResponse<User>>({
		url: () => `/api/user/profile`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch profile',
	}),

	update: endpoint<UpdateUserBody, ApiResponse<User>>({
		url: ({ id }) => `/api/user/${id}`,
		method: putData,
		defaultErrorMessage: 'Failed to update profile',
	}),
}

export default userApiConfig
export type { User, UpdateUserBody, ApiResponse }
