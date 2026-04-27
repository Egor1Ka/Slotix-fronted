// hooks/use-file-validation.ts
import type { UploadConfig } from '@/services/configs/media.types'

interface ValidationError {
	key: string
	params?: Record<string, string | number>
}

const formatBytes = (bytes: number): string => {
	const mb = bytes / (1024 * 1024)
	return `${mb} MB`
}

const readImageDimensions = (
	file: File,
): Promise<{ width: number; height: number }> =>
	new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file)
		const img = new Image()
		img.onload = () => {
			URL.revokeObjectURL(url)
			resolve({ width: img.naturalWidth, height: img.naturalHeight })
		}
		img.onerror = () => {
			URL.revokeObjectURL(url)
			reject(new Error('Failed to read image dimensions'))
		}
		img.src = url
	})

export const validateFile = async (
	file: File,
	config: UploadConfig,
): Promise<ValidationError | null> => {
	if (!config.accept.includes(file.type)) {
		return { key: 'errors.upload.invalidFormat' }
	}
	if (file.size > config.maxSizeBytes) {
		return {
			key: 'errors.upload.tooLarge',
			params: { max: formatBytes(config.maxSizeBytes) },
		}
	}
	if (config.minDimensions) {
		try {
			const dims = await readImageDimensions(file)
			if (
				dims.width < config.minDimensions.width ||
				dims.height < config.minDimensions.height
			) {
				return {
					key: 'errors.upload.tooSmall',
					params: {
						min: `${config.minDimensions.width}×${config.minDimensions.height}`,
					},
				}
			}
		} catch {
			return { key: 'errors.upload.invalidFormat' }
		}
	}
	return null
}

export type { ValidationError }
