import { getData, postData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { OrgListItem, CreateOrgBody } from './org.types'
import type { OrgByIdResponse, OrgStaffMember } from './booking.types'
import type { ApiResponse } from './user.config'

const orgApiConfig = {
	getUserOrgs: endpoint<void, ApiResponse<OrgListItem[]>>({
		url: () => `/api/org/user-orgs`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch organizations',
	}),

	getById: endpoint<void, ApiResponse<OrgByIdResponse>>({
		url: ({ id }) => `/api/org/${id}`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch organization',
	}),

	getStaff: endpoint<void, ApiResponse<OrgStaffMember[]>>({
		url: ({ id }) => `/api/org/${id}/staff`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch staff',
	}),

	create: endpoint<CreateOrgBody, ApiResponse<OrgByIdResponse>>({
		url: () => `/api/org`,
		method: postData,
		defaultErrorMessage: 'Failed to create organization',
	}),
}

export default orgApiConfig
