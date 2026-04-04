'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { positionApi, setServerErrors } from '@/services'
import type { Position } from '@/services'

const PALETTE = [
	'#8B5CF6',
	'#06B6D4',
	'#F59E0B',
	'#EF4444',
	'#10B981',
	'#3B82F6',
	'#EC4899',
	'#F97316',
]

const positionSchema = z.object({
	name: z.string().min(2),
	level: z.number().min(0),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

type PositionFormData = z.infer<typeof positionSchema>

interface PositionDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	orgId: string
	position?: Position
	onSuccess: () => void
}

function PositionDialog({
	open,
	onOpenChange,
	orgId,
	position,
	onSuccess,
}: PositionDialogProps) {
	const t = useTranslations('positions')
	const isEdit = !!position

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		reset,
		setError,
		setValue,
		watch,
	} = useForm<PositionFormData>({
		resolver: zodResolver(positionSchema),
		defaultValues: {
			name: '',
			level: 0,
			color: PALETTE[0],
		},
	})

	const selectedColor = watch('color')

	useEffect(() => {
		if (open) {
			reset({
				name: position?.name ?? '',
				level: position?.level ?? 0,
				color: position?.color ?? PALETTE[0],
			})
		}
	}, [open, position, reset])

	const onSubmit = async (data: PositionFormData) => {
		try {
			if (isEdit) {
				await positionApi.update({
					pathParams: { id: position.id },
					body: data,
				})
				toast.success(t('updated'))
			} else {
				await positionApi.create({
					body: { ...data, orgId },
				})
				toast.success(t('created'))
			}
			reset()
			onOpenChange(false)
			onSuccess()
		} catch (err) {
			if (!setServerErrors(err, setError)) {
				// Не validation помилка -- toast вже показано інтерцептором
			}
		}
	}

	const selectColor = (color: string) => () => {
		setValue('color', color, { shouldValidate: true })
	}

	const isSelected = (color: string) => color === selectedColor

	const renderColorOption = (color: string) => (
		<button
			key={color}
			type="button"
			className={`size-7 rounded-full border-2 transition-transform ${
				isSelected(color)
					? 'border-foreground scale-110'
					: 'border-transparent hover:border-gray-400'
			}`}
			style={{ backgroundColor: color }}
			onClick={selectColor(color)}
		/>
	)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? t('edit') : t('add')}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<Field data-invalid={!!errors.name || undefined}>
						<FieldLabel htmlFor="position-name">{t('name')}</FieldLabel>
						<Input
							id="position-name"
							placeholder={t('namePlaceholder')}
							{...register('name')}
						/>
						<FieldError errors={[errors.name]} />
					</Field>

					<Field data-invalid={!!errors.level || undefined}>
						<FieldLabel htmlFor="position-level">{t('level')}</FieldLabel>
						<Input
							id="position-level"
							type="number"
							min={0}
							{...register('level', { valueAsNumber: true })}
						/>
						<FieldError errors={[errors.level]} />
					</Field>

					<Field data-invalid={!!errors.color || undefined}>
						<FieldLabel>{t('color')}</FieldLabel>
						<div className="flex flex-wrap gap-2">
							{PALETTE.map(renderColorOption)}
						</div>
						<FieldError errors={[errors.color]} />
					</Field>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							{t('cancel')}
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isEdit ? t('edit') : t('add')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

export { PositionDialog }
