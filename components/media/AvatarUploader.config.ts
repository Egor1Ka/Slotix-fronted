// components/media/AvatarUploader.config.ts
import type { UploadConfig } from '@/services/configs/media.types'

const ACCEPTED_IMAGE_MIMES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
]

export const AVATAR_UPLOAD_CONFIG: UploadConfig = {
	accept: ACCEPTED_IMAGE_MIMES,
	maxSizeBytes: 2 * 1024 * 1024,
	minDimensions: { width: 200, height: 200 },
}

export const ORG_LOGO_UPLOAD_CONFIG: UploadConfig = {
	accept: ACCEPTED_IMAGE_MIMES,
	maxSizeBytes: 5 * 1024 * 1024,
	minDimensions: { width: 200, height: 200 },
}

export const SERVICE_PHOTO_UPLOAD_CONFIG: UploadConfig = {
	accept: ACCEPTED_IMAGE_MIMES,
	maxSizeBytes: 5 * 1024 * 1024,
	minDimensions: { width: 200, height: 200 },
}
