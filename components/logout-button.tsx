'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { authApi } from '@/services'

export function LogoutButton({
	children,
	...props
}: React.ComponentProps<typeof Button>) {
	const router = useRouter()

	const handleLogout = async () => {
		await authApi.logout({ silent: true })
		router.push('/login')
	}

	return (
		<Button onClick={handleLogout} {...props}>
			{children ?? 'Logout'}
		</Button>
	)
}
