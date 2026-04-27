'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Camera, Trash2, Upload } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { validateFile } from '@/hooks/use-file-validation'
import type { UploadConfig } from '@/services/configs/media.types'

interface AvatarUploaderLabels {
	triggerButton?: string
	dialogTitle?: string
	removeButton?: string
	confirmRemove?: string
	dropZone?: string
	successToast?: string
}

interface AvatarUploaderProps {
	currentAvatar: string
	fallbackText: string
	config: UploadConfig
	onUpload: (file: File) => Promise<{ avatar: string }>
	onDelete: () => Promise<{ avatar: string }>
	onSuccess: (avatarUrl: string) => void
	labels?: AvatarUploaderLabels
}

const getInitial = (text: string): string => {
	const trimmed = text.trim()
	return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

function AvatarUploader({
	currentAvatar,
	fallbackText,
	config,
	onUpload,
	onDelete,
	onSuccess,
	labels,
}: AvatarUploaderProps) {
	const t = useTranslations()
	const [open, setOpen] = React.useState(false)
	const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
	const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
	const [uploading, setUploading] = React.useState(false)
	const [confirmingDelete, setConfirmingDelete] = React.useState(false)

	const cleanupPreview = React.useCallback(() => {
		if (previewUrl) URL.revokeObjectURL(previewUrl)
		setPreviewUrl(null)
		setSelectedFile(null)
	}, [previewUrl])

	const closeDialog = () => {
		cleanupPreview()
		setConfirmingDelete(false)
		setOpen(false)
	}

	const handleSelectFile = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0]
		if (!file) return
		const error = await validateFile(file, config)
		if (error) {
			toast.error(t(error.key, error.params || {}))
			event.target.value = ''
			return
		}
		cleanupPreview()
		setSelectedFile(file)
		setPreviewUrl(URL.createObjectURL(file))
		event.target.value = ''
	}

	const handleSave = async () => {
		if (!selectedFile) return
		setUploading(true)
		try {
			const { avatar } = await onUpload(selectedFile)
			onSuccess(avatar)
			toast.success(resolvedLabels.successToast)
			closeDialog()
		} catch {
			// toast-interceptor уже показал ошибку
		} finally {
			setUploading(false)
		}
	}

	const handleDeleteClick = async () => {
		if (!confirmingDelete) {
			setConfirmingDelete(true)
			return
		}
		setUploading(true)
		try {
			const { avatar } = await onDelete()
			onSuccess(avatar)
			toast.success(resolvedLabels.successToast)
			closeDialog()
		} catch {
			// toast-interceptor
		} finally {
			setUploading(false)
		}
	}

	const previewSrc = previewUrl ?? currentAvatar
	const allowDelete = currentAvatar !== '' && !selectedFile

	const resolvedLabels = {
		triggerButton: labels?.triggerButton ?? t('profile.changePhoto'),
		dialogTitle: labels?.dialogTitle ?? t('profile.changePhoto'),
		removeButton: labels?.removeButton ?? t('profile.removePhoto'),
		confirmRemove: labels?.confirmRemove ?? t('profile.confirmRemove'),
		dropZone: labels?.dropZone ?? t('profile.dropOrClick'),
		successToast: labels?.successToast ?? t('profile.photoUpdated'),
	}

	return (
		<div className="flex items-center gap-3">
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
				type="button"
			>
				<Camera className="size-4" />
				{resolvedLabels.triggerButton}
			</Button>
			<Dialog
				open={open}
				onOpenChange={(value) => {
					if (uploading) return
					if (value) setOpen(true)
					else closeDialog()
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{resolvedLabels.dialogTitle}</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col items-center gap-4 py-2">
						<Avatar className="size-32">
							{previewSrc ? <AvatarImage src={previewSrc} alt="" /> : null}
							<AvatarFallback className="text-3xl">
								{getInitial(fallbackText)}
							</AvatarFallback>
						</Avatar>
						{uploading ? (
							<div className="flex items-center gap-2 text-sm">
								<Spinner /> {t('profile.uploadingPhoto')}
							</div>
						) : (
							<label className="border-input bg-background hover:bg-accent flex w-full cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-6 text-sm">
								<Upload className="text-muted-foreground size-5" />
								<span>{resolvedLabels.dropZone}</span>
								<span className="text-muted-foreground text-xs">
									{t('profile.acceptedFormats')}
								</span>
								<input
									type="file"
									accept={config.accept.join(',')}
									onChange={handleSelectFile}
									className="hidden"
									disabled={uploading}
								/>
							</label>
						)}
					</div>
					<DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
						{allowDelete ? (
							<Button
								type="button"
								variant={confirmingDelete ? 'destructive' : 'outline'}
								size="sm"
								onClick={handleDeleteClick}
								disabled={uploading}
							>
								<Trash2 className="size-4" />
								{confirmingDelete
									? resolvedLabels.confirmRemove
									: resolvedLabels.removeButton}
							</Button>
						) : (
							<span />
						)}
						<div className="flex gap-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={closeDialog}
								disabled={uploading}
							>
								{t('common.cancel')}
							</Button>
							<Button
								type="button"
								size="sm"
								onClick={handleSave}
								disabled={uploading || !selectedFile}
							>
								{t('common.save')}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

export { AvatarUploader }
export type { AvatarUploaderProps, AvatarUploaderLabels }
