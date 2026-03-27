'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LogOut } from 'lucide-react'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { authApi } from '@/services'

function LogoutButton() {
	const router = useRouter()
	const t = useTranslations('sidebar')

	const handleLogout = async () => {
		try {
			await authApi.logout()
		} catch {
			// перенаправляем даже если API вызов не удался
		}
		router.push('/login')
	}

	return (
		<SidebarMenuButton onClick={handleLogout}>
			<LogOut className="size-4" />
			<span>{t('logout')}</span>
		</SidebarMenuButton>
	)
}

export { LogoutButton }
