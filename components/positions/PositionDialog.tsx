'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
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
import { ColorPicker, DEFAULT_COLOR_PALETTE } from '@/components/ui/color-picker'
import { positionApi, setServerErrors } from '@/services'
import type { Position } from '@/services'

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
		control,
	} = useForm<PositionFormData>({
		resolver: zodResolver(positionSchema),
		defaultValues: {
			name: '',
			level: 0,
			color: DEFAULT_COLOR_PALETTE[0],
		},
	})

	useEffect(() => {
		if (open) {
			reset({
				name: position?.name ?? '',
				level: position?.level ?? 0,
				color: position?.color ?? DEFAULT_COLOR_PALETTE[0],
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
						<Controller
							control={control}
							name="color"
							render={({ field }) => (
								<ColorPicker value={field.value} onChange={field.onChange} />
							)}
						/>
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
