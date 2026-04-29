import type { RatingTargetType } from './rating.types'

export interface CommentAuthor {
	id: string
	name: string | null
	avatar: string | null
}

export interface ReviewComment {
	id: string
	body: string
	author: CommentAuthor
	targetType: RatingTargetType
	targetId: string
	createdAt: string
	updatedAt: string
}

export interface CommentListResponse {
	items: ReviewComment[]
	total: number
}

export interface CommentBody {
	body: string
}
