'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LogIn } from 'lucide-react'
import { ratingApi, commentApi } from '@/services'
import type {
	RatingSummary,
	RatingTargetType,
	ReviewComment,
} from '@/services'
import { Spinner } from '@/components/ui/spinner'
import { buildLoginHref } from '@/lib/auth/build-login-href'
import { MyRatingControl } from './MyRatingControl'
import { CommentForm } from './CommentForm'
import { CommentList } from './CommentList'

interface ReviewSectionProps {
	targetType: RatingTargetType
	targetId: string
	currentUserId: string | null
	onSummaryChange?: (summary: RatingSummary) => void
}

const PAGE_LIMIT = 5

function ReviewSection({
	targetType,
	targetId,
	currentUserId,
	onSummaryChange,
}: ReviewSectionProps) {
	const t = useTranslations('reviews')
	const pathname = usePathname()
	const loginHref = buildLoginHref(pathname)
	const [summary, setSummary] = useState<RatingSummary | null>(null)
	const [comments, setComments] = useState<ReviewComment[]>([])
	const [total, setTotal] = useState(0)
	const [offset, setOffset] = useState(0)
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)

	const loadSummary = useCallback(async () => {
		const response = await ratingApi.get({
			pathParams: { targetType, targetId },
		})
		setSummary(response.data)
		if (onSummaryChange) onSummaryChange(response.data)
	}, [targetType, targetId, onSummaryChange])

	const loadComments = useCallback(
		async (nextOffset: number, append: boolean) => {
			if (append) setLoadingMore(true)
			const response = await commentApi.list({
				pathParams: { targetType, targetId },
				queryParams: { limit: PAGE_LIMIT, offset: nextOffset },
			})
			const list = response.data
			setTotal(list.total)
			setComments((prev) => (append ? [...prev, ...list.items] : list.items))
			setOffset(nextOffset + list.items.length)
			if (append) setLoadingMore(false)
		},
		[targetType, targetId],
	)

	useEffect(() => {
		const init = async () => {
			setLoading(true)
			try {
				await Promise.all([loadSummary(), loadComments(0, false)])
			} finally {
				setLoading(false)
			}
		}
		init()
	}, [loadSummary, loadComments])

	const handleSummaryChange = (next: RatingSummary) => {
		setSummary(next)
		if (onSummaryChange) onSummaryChange(next)
	}

	const handleCommentCreated = (created: ReviewComment | null) => {
		if (!created) return
		setComments((prev) => [created, ...prev])
		setTotal((prev) => prev + 1)
		setOffset((prev) => prev + 1)
	}

	const handleCommentUpdate = (next: ReviewComment) => {
		setComments((prev) => prev.map((c) => (c.id === next.id ? next : c)))
	}

	const handleCommentDelete = (id: string) => {
		setComments((prev) => prev.filter((c) => c.id !== id))
		setTotal((prev) => Math.max(0, prev - 1))
		setOffset((prev) => Math.max(0, prev - 1))
	}

	const handleLoadMore = () => loadComments(offset, true)

	if (loading || !summary) {
		return (
			<section className="flex items-center justify-center px-6 py-8">
				<Spinner className="size-5" />
			</section>
		)
	}

	const isLogged = currentUserId !== null

	return (
		<section className="flex flex-col gap-4 border-t px-6 py-5">
			<header className="flex items-center justify-between">
				<h4 className="text-foreground text-sm font-semibold">{t('title')}</h4>
			</header>

			{!isLogged ? (
				<Link
					href={loginHref}
					className="border-border/60 hover:border-primary/50 hover:bg-primary/5 group flex items-center justify-between gap-3 rounded-2xl border border-dashed px-4 py-3 transition-colors"
				>
					<span className="text-foreground/90 text-xs leading-relaxed">
						{t('loginCta')}
					</span>
					<span className="text-primary group-hover:text-primary inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
						{t('loginAction')}
						<LogIn className="size-3.5" />
					</span>
				</Link>
			) : null}

			<CommentList
				items={comments}
				total={total}
				currentUserId={currentUserId}
				loading={loadingMore}
				onLoadMore={handleLoadMore}
				onUpdate={handleCommentUpdate}
				onDelete={handleCommentDelete}
			/>

			{isLogged ? (
				<>
					<MyRatingControl
						targetType={targetType}
						targetId={targetId}
						value={summary.myRating}
						onChange={handleSummaryChange}
					/>
					<CommentForm
						targetType={targetType}
						targetId={targetId}
						onDone={handleCommentCreated}
					/>
				</>
			) : null}
		</section>
	)
}

export { ReviewSection }
