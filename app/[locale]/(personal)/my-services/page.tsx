'use client'

import { useEffect, useState } from 'react'
import { ServicesList } from '@/components/services/ServicesList'
import { useUser } from '@/lib/auth/user-provider'
import { scheduleApi } from '@/lib/booking-api-client'

export default function MyServicesPage() {
	const user = useUser()
	const [currency, setCurrency] = useState<'UAH' | 'USD'>('UAH')

	useEffect(() => {
		const loadCurrency = async () => {
			try {
				const template = await scheduleApi.getTemplate(user.id, undefined)
				setCurrency(template.currency)
			} catch {
				// toast interceptor handles errors
			}
		}
		loadCurrency()
	}, [user.id])

	return (
		<div className="container max-w-3xl py-6">
			<ServicesList ownerId={user.id} ownerType="user" currency={currency} />
		</div>
	)
}
