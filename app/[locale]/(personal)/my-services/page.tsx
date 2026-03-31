'use client'

import { ServicesList } from '@/components/services/ServicesList'
import { useUser } from '@/lib/auth/user-provider'

export default function MyServicesPage() {
	const user = useUser()

	return (
		<div className="container max-w-3xl py-6">
			<ServicesList ownerId={user.id} ownerType="user" currency="UAH" />
		</div>
	)
}
