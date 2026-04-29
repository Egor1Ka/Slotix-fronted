'use client'

import { useState } from 'react'
import { useTranslations, useFormatter } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { commentApi } from '@/services'
import type { ReviewComment } from '@/services'
import { CommentForm } from './CommentForm'

interface CommentItemProps {
	comment: ReviewComment
	currentUserId: string | null
	onUpdate: (next: ReviewComment) => void
	onDelete: (id: string) => void
}

const getInitial = (name: string | null) =>
	name && name.trim() ? name.trim().charAt(0).toUpperCase() : '?'

function CommentItem({
	comment,
	currentUserId,
	onUpdate,
	onDelete,
}: CommentItemProps) {
	const t = useTranslations('reviews')
	const format = useFormatter()
	const [editing, setEditing] = useState(false)

	const isOwn = currentUserId !== null && comment.author.id === currentUserId

	const handleDelete = async () => {
		if (!window.confirm(t('confirmDelete'))) return
		await commentApi.remove({ pathParams: { id: comment.id } })
		onDelete(comment.id)
	}

	const handleEditDone = (next: ReviewComment | null) => {
		if (next) onUpdate(next)
		setEditing(false)
	}

	return (
		<article className="group bg-muted/20 ring-border/50 hover:bg-muted/40 hover:ring-border flex gap-3 rounded-2xl p-3.5 ring-1 transition-colors">
			<Avatar className="ring-background size-10 shrink-0 ring-2">
				{comment.author.avatar ? (
					<AvatarImage
						src={comment.author.avatar}
						alt={comment.author.name ?? ''}
					/>
				) : null}
				<AvatarFallback className="text-xs font-semibold">
					{getInitial(comment.author.name)}
				</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="flex items-start justify-between gap-2">
					<div className="flex flex-col">
						<span className="text-foreground truncate text-sm leading-tight font-semibold">
							{comment.author.name ?? '—'}
						</span>
						<span className="text-muted-foreground/80 text-[11px] tabular-nums">
							{format.dateTime(new Date(comment.createdAt), {
								year: 'numeric',
								month: 'short',
								day: 'numeric',
							})}
						</span>
					</div>
					{isOwn && !editing ? (
						<div className="-mr-1 flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => setEditing(true)}
								aria-label={t('edit')}
								className="size-7"
							>
								<Pencil className="size-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={handleDelete}
								aria-label={t('delete')}
								className="hover:text-destructive size-7"
							>
								<Trash2 className="size-3.5" />
							</Button>
						</div>
					) : null}
				</div>
				{editing ? (
					<div className="mt-2">
						<CommentForm
							targetType={comment.targetType}
							targetId={comment.targetId}
							initialBody={comment.body}
							commentId={comment.id}
							onDone={handleEditDone}
							onCancel={() => setEditing(false)}
						/>
					</div>
				) : (
					<p className="text-foreground/90 mt-1.5 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
						{comment.body}
					</p>
				)}
			</div>
		</article>
	)
}

export { CommentItem }
