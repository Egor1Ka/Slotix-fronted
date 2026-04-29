'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Field, FieldError } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { commentApi, setServerErrors } from '@/services'
import type { ReviewComment, RatingTargetType } from '@/services'

interface CommentFormProps {
	targetType: RatingTargetType
	targetId: string
	initialBody?: string
	commentId?: string
	onDone: (comment: ReviewComment | null) => void
	onCancel?: () => void
}

const buildSchema = () =>
	z.object({
		body: z.string().trim().min(1, 'Required').max(1000, 'Max 1000 chars'),
	})

type FormData = z.infer<ReturnType<typeof buildSchema>>

function CommentForm({
	targetType,
	targetId,
	initialBody = '',
	commentId,
	onDone,
	onCancel,
}: CommentFormProps) {
	const t = useTranslations('reviews')
	const isEdit = !!commentId

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors, isSubmitting },
		reset,
		setError,
	} = useForm<FormData>({
		resolver: zodResolver(buildSchema()),
		defaultValues: { body: initialBody },
	})

	const currentLength = watch('body')?.length ?? 0

	const onSubmit = async (data: FormData) => {
		try {
			const response = isEdit
				? await commentApi.update({
						pathParams: { id: commentId },
						body: { body: data.body },
					})
				: await commentApi.create({
						pathParams: { targetType, targetId },
						body: { body: data.body },
					})
			reset({ body: '' })
			onDone(response.data)
		} catch (err) {
			setServerErrors(err, setError)
		}
	}

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="flex flex-col gap-2.5"
		>
			<Field data-invalid={!!errors.body || undefined}>
				<Textarea
					{...register('body')}
					placeholder={t('commentPlaceholder')}
					rows={3}
					maxLength={1000}
					className="bg-background/50 focus-visible:ring-primary/40 resize-none rounded-xl text-sm leading-relaxed shadow-sm transition-all focus-visible:ring-2"
				/>
				<FieldError errors={[errors.body]} />
			</Field>
			<div className="flex items-center justify-between gap-2">
				<span
					className={`text-[11px] tabular-nums ${
						currentLength > 900
							? 'text-destructive'
							: 'text-muted-foreground/60'
					}`}
				>
					{currentLength}/1000
				</span>
				<div className="flex items-center gap-2">
					{onCancel ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onCancel}
						>
							{t('cancel')}
						</Button>
					) : null}
					<Button
						type="submit"
						size="sm"
						disabled={isSubmitting || currentLength === 0}
						className="rounded-full px-4"
					>
						{isEdit ? t('update') : t('submit')}
					</Button>
				</div>
			</div>
		</form>
	)
}

export { CommentForm }
