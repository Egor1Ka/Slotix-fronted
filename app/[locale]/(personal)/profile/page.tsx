'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { userApi } from '@/services'
import type { User } from '@/services'
import { ProfileForm } from '@/components/profile/ProfileForm'
import type { ProfileFormData } from '@/components/profile/ProfileForm'

function PersonalProfilePage() {
	const t = useTranslations('profile')
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const response = await userApi.me()
				setUser(response.data)
			} catch {
				// toast interceptor handles errors
			} finally {
				setLoading(false)
			}
		}

		fetchUser()
	}, [])

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">Loading...</p>
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

	return (
		<div className="mx-auto max-w-2xl p-6">
			<h1 className="mb-6 text-2xl font-bold">{t('myTitle')}</h1>
			<ProfileForm defaultValues={defaultValues} onSubmit={handleSubmit} />
		</div>
	)
}

export default PersonalProfilePage
