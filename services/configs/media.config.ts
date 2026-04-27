// services/configs/media.config.ts
import { postData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { ApiResponse, User } from './user.config'
import type {
	UploadAvatarResponse,
	StaffAvatarResponse,
	OrgLogoResponse,
	ServicePhotoResponse,
} from './media.types'

const mediaApiConfig = {
	uploadUserAvatar: endpoint<FormData, ApiResponse<User>>({
		url: () => `/api/user/avatar`,
		method: postData,
		defaultErrorMessage: 'Failed to upload avatar',
	}),
	deleteUserAvatar: endpoint<void, ApiResponse<User>>({
		url: () => `/api/user/avatar`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete avatar',
	}),
	uploadStaffAvatar: endpoint<FormData, ApiResponse<StaffAvatarResponse>>({
		url: ({ orgId, staffId }) => `/api/org/${orgId}/staff/${staffId}/avatar`,
		method: postData,
		defaultErrorMessage: 'Failed to upload avatar',
	}),
	deleteStaffAvatar: endpoint<void, ApiResponse<StaffAvatarResponse>>({
		url: ({ orgId, staffId }) => `/api/org/${orgId}/staff/${staffId}/avatar`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete avatar',
	}),

	uploadOrgLogo: endpoint<FormData, ApiResponse<OrgLogoResponse>>({
		url: ({ orgId }) => `/api/org/${orgId}/logo`,
		method: postData,
		defaultErrorMessage: 'Failed to upload logo',
	}),
	deleteOrgLogo: endpoint<void, ApiResponse<OrgLogoResponse>>({
		url: ({ orgId }) => `/api/org/${orgId}/logo`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete logo',
	}),
	uploadServicePhoto: endpoint<FormData, ApiResponse<ServicePhotoResponse>>({
		url: ({ id }) => `/api/event-types/${id}/photo`,
		method: postData,
		defaultErrorMessage: 'Failed to upload service photo',
	}),
	deleteServicePhoto: endpoint<void, ApiResponse<ServicePhotoResponse>>({
		url: ({ id }) => `/api/event-types/${id}/photo`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete service photo',
	}),
}

export default mediaApiConfig
export type {
	UploadAvatarResponse,
	StaffAvatarResponse,
	OrgLogoResponse,
	ServicePhotoResponse,
}
