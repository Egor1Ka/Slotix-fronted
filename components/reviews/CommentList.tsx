'use client'

import { useTranslations } from 'next-intl'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReviewComment } from '@/services'
import { CommentItem } from './CommentItem'

interface CommentListProps {
	items: ReviewComment[]
	total: number
	currentUserId: string | null
	loading: boolean
	onLoadMore: () => void
	onUpdate: (next: ReviewComment) => void
	onDelete: (id: string) => void
}

const renderItem =
	(
		currentUserId: string | null,
		onUpdate: (next: ReviewComment) => void,
		onDelete: (id: string) => void,
	) =>
	(comment: ReviewComment) => (
		<CommentItem
			key={comment.id}
			comment={comment}
			currentUserId={currentUserId}
			onUpdate={onUpdate}
			onDelete={onDelete}
		/>
	)

function CommentList({
	items,
	total,
	currentUserId,
	loading,
	onLoadMore,
	onUpdate,
	onDelete,
}: CommentListProps) {
	const t = useTranslations('reviews')

	if (items.length === 0 && !loading) {
		return (
			<div className="flex flex-col items-center gap-2 py-8 text-center">
				<div className="bg-muted/50 flex size-11 items-center justify-center rounded-full">
					<MessageSquare className="text-muted-foreground/70 size-5" />
				</div>
				<p className="text-muted-foreground text-sm">{t('empty')}</p>
			</div>
		)
	}

	const hasMore = items.length < total

	return (
		<div className="flex flex-col gap-2">
			{items.map(renderItem(currentUserId, onUpdate, onDelete))}
			{hasMore ? (
				<div className="pt-1">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-full rounded-full"
						onClick={onLoadMore}
						disabled={loading}
					>
						{t('showMore')}
					</Button>
				</div>
			) : null}
		</div>
	)
}

export { CommentList }
