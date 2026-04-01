'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Trash2, Pencil, Plus } from 'lucide-react'
import { BookingFieldEditor } from './BookingFieldEditor'
import {
	bookingFieldApi,
	bookingFormConfigApi,
} from '@/lib/mock-api'
import type {
	BookingField,
	BookingFormConfig,
	BookingFieldType,
} from '@/services/configs/booking-field.types'

interface BookingFormSettingsProps {
	ownerId: string
	ownerType: 'org' | 'user'
}

function BookingFormSettings({ ownerId, ownerType }: BookingFormSettingsProps) {
	const t = useTranslations('booking')

	const [config, setConfig] = useState<BookingFormConfig | null>(null)
	const [fields, setFields] = useState<BookingField[]>([])
	const [editingField, setEditingField] = useState<BookingField | null>(null)
	const [isAdding, setIsAdding] = useState(false)
	const [isSaving, setIsSaving] = useState(false)

	const TYPE_LABELS: Record<BookingFieldType, string> = {
		text: t('bookingForm.typeText'),
		textarea: t('bookingForm.typeTextarea'),
		email: t('bookingForm.typeEmail'),
		phone: t('bookingForm.typePhone'),
	}

	// ── Загрузка данных ──

	const loadData = useCallback(async () => {
		const [formConfig, bookingFields] = await Promise.all([
			bookingFormConfigApi.get(),
			bookingFieldApi.getFields(ownerId, ownerType, null),
		])
		setConfig(formConfig)
		setFields(bookingFields)
	}, [ownerId, ownerType])

	useEffect(() => {
		loadData()
	}, [loadData])

	// ── Переключатели базовых полей ──

	const handlePhoneToggle = useCallback(
		async (checked: boolean) => {
			const updated = await bookingFormConfigApi.update({
				ownerId,
				ownerType,
				phoneRequired: checked,
			})
			setConfig(updated)
			toast.success(t('bookingForm.configUpdated'))
		},
		[ownerId, ownerType, t],
	)

	const handleEmailToggle = useCallback(
		async (checked: boolean) => {
			const updated = await bookingFormConfigApi.update({
				ownerId,
				ownerType,
				emailRequired: checked,
			})
			setConfig(updated)
			toast.success(t('bookingForm.configUpdated'))
		},
		[ownerId, ownerType, t],
	)

	// ── Добавление / редактирование ──

	const handleStartAdd = useCallback(() => {
		setEditingField(null)
		setIsAdding(true)
	}, [])

	const handleStartEdit = useCallback((field: BookingField) => {
		setEditingField(field)
		setIsAdding(true)
	}, [])

	const handleCancel = useCallback(() => {
		setEditingField(null)
		setIsAdding(false)
	}, [])

	const handleSave = useCallback(
		async (data: { label: string; type: BookingFieldType; required: boolean }) => {
			setIsSaving(true)
			try {
				if (editingField) {
					await bookingFieldApi.update(editingField.id, {
						label: data.label,
						type: data.type,
						required: data.required,
					})
					toast.success(t('bookingForm.fieldUpdated'))
				} else {
					await bookingFieldApi.create({
						ownerId,
						ownerType,
						eventTypeId: null,
						type: data.type,
						label: data.label,
						required: data.required,
					})
					toast.success(t('bookingForm.fieldCreated'))
				}
				setEditingField(null)
				setIsAdding(false)
				await loadData()
			} finally {
				setIsSaving(false)
			}
		},
		[editingField, ownerId, ownerType, t, loadData],
	)

	// ── Удаление ──

	const handleDelete = useCallback(
		async (fieldId: string) => {
			await bookingFieldApi.remove(fieldId)
			toast.success(t('bookingForm.fieldDeleted'))
			await loadData()
		},
		[t, loadData],
	)

	// ── Рендер элемента списка ──

	const createEditHandler = (field: BookingField) => () => {
		handleStartEdit(field)
	}

	const createDeleteHandler = (fieldId: string) => () => {
		handleDelete(fieldId)
	}

	const renderFieldItem = (field: BookingField) => (
		<div
			key={field.id}
			className="flex items-center justify-between rounded-lg border p-3"
		>
			<div className="flex items-center gap-2">
				<span className="font-medium">{field.label}</span>
				<Badge variant="secondary">{TYPE_LABELS[field.type]}</Badge>
				{field.required && (
					<Badge variant="outline">{t('bookingForm.required')}</Badge>
				)}
			</div>
			<div className="flex gap-1">
				<Button
					variant="ghost"
					size="icon"
					onClick={createEditHandler(field)}
				>
					<Pencil className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onClick={createDeleteHandler(field.id)}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)

	if (!config) return null

	return (
		<div className="space-y-6">
			{/* Базовые поля */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">
					{t('bookingForm.baseFields')}
				</h3>

				<Field orientation="horizontal">
					<FieldLabel>{t('bookingForm.phoneRequired')}</FieldLabel>
					<Switch
						checked={config.phoneRequired}
						onCheckedChange={handlePhoneToggle}
					/>
				</Field>

				<Field orientation="horizontal">
					<FieldLabel>{t('bookingForm.emailRequired')}</FieldLabel>
					<Switch
						checked={config.emailRequired}
						onCheckedChange={handleEmailToggle}
					/>
				</Field>
			</div>

			<Separator />

			{/* Кастомные поля */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold">
						{t('bookingForm.customFields')}
					</h3>
					{!isAdding && (
						<Button variant="outline" size="sm" onClick={handleStartAdd}>
							<Plus className="mr-1 h-4 w-4" />
							{t('bookingForm.addField')}
						</Button>
					)}
				</div>

				{isAdding && (
					<BookingFieldEditor
						field={editingField}
						onSave={handleSave}
						onCancel={handleCancel}
						isSaving={isSaving}
					/>
				)}

				{fields.length === 0 && !isAdding && (
					<p className="text-muted-foreground text-sm">
						{t('bookingForm.noCustomFields')}
					</p>
				)}

				<div className="space-y-2">{fields.map(renderFieldItem)}</div>
			</div>
		</div>
	)
}

export { BookingFormSettings }
