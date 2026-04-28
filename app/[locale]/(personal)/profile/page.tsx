'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { userApi } from '@/services'
import type { User } from '@/services'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileForm } from '@/components/profile/ProfileForm'
import type { ProfileFormData } from '@/components/profile/ProfileForm'
import { TelegramConnect } from '@/components/profile/TelegramConnect'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { AvatarUploader } from '@/components/media/AvatarUploader'
import { AVATAR_UPLOAD_CONFIG } from '@/components/media/AvatarUploader.config'
import { mediaApi } from '@/services'

function PersonalProfilePage() {
	const t = useTranslations('profile')
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)

	const fetchUser = useCallback(async () => {
		try {
			const response = await userApi.me()
			setUser(response.data)
		} catch {
			// toast interceptor handles errors
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchUser()
	}, [fetchUser])

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Spinner />
			</div>
		)
	}

	if (!user) return null

	const defaultValues: ProfileFormData = {
		name: user.name,
		description: user.description ?? '',
		address: user.address ?? '',
		phone: user.phone ?? '',
		website: user.website ?? '',
	}

	const handleTelegramStatusChange = (connected: boolean) => {
		setUser((prev) => (prev ? { ...prev, telegramConnected: connected } : prev))
	}

	const handleSubmit = async (data: ProfileFormData) => {
		await userApi.update({
			pathParams: { id: user.id },
			body: {
				name: data.name,
				description: data.description || null,
				address: data.address || null,
				phone: data.phone || null,
				website: data.website || null,
			},
		})
		setUser((prev) =>
			prev
				? {
						...prev,
						name: data.name,
						description: data.description ?? null,
						address: data.address ?? null,
						phone: data.phone ?? null,
						website: data.website ?? null,
					}
				: prev,
		)
	}

	const handleAvatarUpload = async (file: File) => {
		const formData = new FormData()
		formData.append('file', file)
		const response = await mediaApi.uploadUserAvatar({ body: formData })
		return { avatar: response.data.avatar }
	}

	const handleAvatarDelete = async () => {
		const response = await mediaApi.deleteUserAvatar()
		return { avatar: response.data.avatar }
	}

	const handleAvatarSuccess = (avatarUrl: string) => {
		setUser((prev) => (prev ? { ...prev, avatar: avatarUrl } : prev))
	}

	return (
		<div className="mx-auto max-w-2xl space-y-6 p-6">
			<h1 className="text-2xl font-bold">{t('myTitle')}</h1>
			<ProfileHeader
				avatar={user.avatar}
				name={user.name}
				subtitle={user.email}
			/>
			<AvatarUploader
				currentAvatar={user.avatar}
				fallbackText={user.name}
				config={AVATAR_UPLOAD_CONFIG}
				onUpload={handleAvatarUpload}
				onDelete={handleAvatarDelete}
				onSuccess={handleAvatarSuccess}
			/>
			<ProfileForm defaultValues={defaultValues} onSubmit={handleSubmit} />
			<Separator />
			<TelegramConnect
				connected={user.telegramConnected}
				onStatusChange={handleTelegramStatusChange}
			/>
		</div>
	)
}

export default PersonalProfilePage
