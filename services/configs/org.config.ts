import {
	getData,
	postData,
	putData,
	patchData,
	deleteData,
} from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type {
	OrgListItem,
	CreateOrgBody,
	UpdateOrgBody,
	AddStaffBody,
	OrgMembership,
} from './org.types'
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

	update: endpoint<UpdateOrgBody, ApiResponse<OrgByIdResponse>>({
		url: ({ id }) => `/api/org/${id}`,
		method: putData,
		defaultErrorMessage: 'Failed to update organization',
	}),

	addStaff: endpoint<AddStaffBody, ApiResponse<OrgStaffMember>>({
		url: ({ id }) => `/api/org/${id}/staff`,
		method: postData,
		defaultErrorMessage: 'Failed to add staff member',
	}),

	acceptInvitation: endpoint<
		Record<string, never>,
		ApiResponse<{ success: boolean }>
	>({
		url: ({ id }) => `/api/org/${id}/membership/accept`,
		method: patchData,
		defaultErrorMessage: 'Failed to accept invitation',
	}),

	declineInvitation: endpoint<void, ApiResponse<{ success: boolean }>>({
		url: ({ id }) => `/api/org/${id}/membership/decline`,
		method: deleteData,
		defaultErrorMessage: 'Failed to decline invitation',
	}),

	updateStaffBio: endpoint<{ bio: string | null }, ApiResponse<OrgStaffMember>>(
		{
			url: ({ orgId, staffId }) => `/api/org/${orgId}/staff/${staffId}`,
			method: patchData,
			defaultErrorMessage: 'Failed to update bio',
		},
	),

	getMyMembership: endpoint<void, ApiResponse<OrgMembership>>({
		url: ({ id }) => `/api/org/${id}/my-membership`,
		method: getData,
		defaultErrorMessage: 'Failed to check membership',
	}),
}

export default orgApiConfig
