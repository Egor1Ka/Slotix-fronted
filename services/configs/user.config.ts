import { getData, putData, postData, deleteData } from '@/services/api/methods'
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
	telegramConnected: boolean
	createdAt: string
	updatedAt: string
}

interface TelegramLinkResponse {
	url: string
	token: string
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

	connectTelegram: endpoint<void, ApiResponse<TelegramLinkResponse>>({
		url: () => `/api/user/telegram/connect`,
		method: postData,
	}),

	disconnectTelegram: endpoint<void, ApiResponse<void>>({
		url: () => `/api/user/telegram/disconnect`,
		method: deleteData,
	}),
}

export default userApiConfig
export type { User, UpdateUserBody, ApiResponse, TelegramLinkResponse }
