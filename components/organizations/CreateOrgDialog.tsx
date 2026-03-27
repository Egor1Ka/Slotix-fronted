'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { orgApi, setServerErrors } from '@/services'

// Предустановленные цвета бренда
const PRESET_COLORS = [
	'#1a1a2e',
	'#16213e',
	'#0f3460',
	'#533483',
	'#e94560',
	'#ff6b6b',
	'#feca57',
	'#48dbfb',
	'#0abde3',
	'#10ac84',
	'#01a3a4',
	'#2d3436',
]

const createOrgSchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.min(2, 'Name must be at least 2 characters'),
	currency: z.enum(['UAH', 'USD']),
	brandColor: z.string().optional(),
	logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
	defaultTimezone: z.string().optional(),
	defaultCountry: z.string().optional(),
})

type CreateOrgFormData = z.infer<typeof createOrgSchema>

interface CreateOrgDialogProps {
	onCreated: () => void
}

function CreateOrgDialog({ onCreated }: CreateOrgDialogProps) {
	const t = useTranslations('organizations')
	const [open, setOpen] = useState(false)

	const {
		register,
		handleSubmit,
		control,
		formState: { errors, isSubmitting },
		reset,
		setError,
		setValue,
	} = useForm<CreateOrgFormData>({
		resolver: zodResolver(createOrgSchema),
		defaultValues: {
			currency: 'UAH',
			defaultTimezone: 'Europe/Kyiv',
			defaultCountry: 'UA',
		},
	})

	const onSubmit = async (data: CreateOrgFormData) => {
		try {
			const body = {
				name: data.name,
				currency: data.currency,
				brandColor: data.brandColor || undefined,
				logoUrl: data.logoUrl || undefined,
				defaultTimezone: data.defaultTimezone || undefined,
				defaultCountry: data.defaultCountry || undefined,
			}
			await orgApi.create({ body })
			toast.success(t('created'))
			reset()
			setOpen(false)
			onCreated()
		} catch (err) {
			if (!setServerErrors(err, setError)) {
				// Не validation ошибка — toast уже показан интерцептором
			}
		}
	}

	const selectPresetColor = (color: string) => () => {
		setValue('brandColor', color)
	}

	const renderColorOption = (color: string) => (
		<button
			key={color}
			type="button"
			className="size-6 rounded-full border-2 border-transparent hover:border-gray-400"
			style={{ backgroundColor: color }}
			onClick={selectPresetColor(color)}
		/>
	)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button>
						<Plus className="mr-2 size-4" />
						{t('create')}
					</Button>
				}
			/>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('create')}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<Field data-invalid={!!errors.name || undefined}>
						<FieldLabel htmlFor="name">{t('form.name')}</FieldLabel>
						<Input
							id="name"
							placeholder={t('form.namePlaceholder')}
							{...register('name')}
						/>
						<FieldError errors={[errors.name]} />
					</Field>

					<Field data-invalid={!!errors.currency || undefined}>
						<FieldLabel>{t('form.currency')}</FieldLabel>
						<Controller
							control={control}
							name="currency"
							render={({ field }) => (
								<Select
									value={field.value}
									onValueChange={field.onChange}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="UAH">
											UAH (&#8372;)
										</SelectItem>
										<SelectItem value="USD">
											USD ($)
										</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>
						<FieldError errors={[errors.currency]} />
					</Field>

					<Field data-invalid={!!errors.brandColor || undefined}>
						<FieldLabel htmlFor="brandColor">
							{t('form.brandColor')}
						</FieldLabel>
						<div className="mb-2 flex flex-wrap gap-2">
							{PRESET_COLORS.map(renderColorOption)}
						</div>
						<Input
							id="brandColor"
							placeholder="#1a1a2e"
							{...register('brandColor')}
						/>
						<FieldError errors={[errors.brandColor]} />
					</Field>

					<Field data-invalid={!!errors.logoUrl || undefined}>
						<FieldLabel htmlFor="logoUrl">
							{t('form.logo')}
						</FieldLabel>
						<Input
							id="logoUrl"
							placeholder={t('form.logoPlaceholder')}
							{...register('logoUrl')}
						/>
						<FieldError errors={[errors.logoUrl]} />
					</Field>

					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							{t('form.cancel')}
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{t('form.submit')}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}

export { CreateOrgDialog }
