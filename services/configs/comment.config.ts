import { getData, postData, patchData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { ApiResponse } from './user.config'
import type {
	ReviewComment,
	CommentBody,
	CommentListResponse,
} from './comment.types'

const commentApiConfig = {
	list: endpoint<void, ApiResponse<CommentListResponse>>({
		url: ({ targetType, targetId }) =>
			`/api/comments/${targetType}/${targetId}`,
		method: getData,
		defaultErrorMessage: 'Failed to load comments',
	}),
	create: endpoint<CommentBody, ApiResponse<ReviewComment>>({
		url: ({ targetType, targetId }) =>
			`/api/comments/${targetType}/${targetId}`,
		method: postData,
		defaultErrorMessage: 'Failed to post comment',
	}),
	update: endpoint<CommentBody, ApiResponse<ReviewComment>>({
		url: ({ id }) => `/api/comments/${id}`,
		method: patchData,
		defaultErrorMessage: 'Failed to update comment',
	}),
	remove: endpoint<void, ApiResponse<null>>({
		url: ({ id }) => `/api/comments/${id}`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete comment',
	}),
}

export default commentApiConfig
