'use client'

import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Building2, Calendar } from 'lucide-react'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar'
import { LogoutButton } from './LogoutButton'
import { useUser } from '@/lib/auth/user-provider'

function DashboardSidebar() {
	const pathname = usePathname()
	const locale = useLocale()
	const t = useTranslations('sidebar')
	const user = useUser()

	const isActive = (href: string): boolean => pathname === href

	const buildHref = (path: string): string => `/${locale}${path}`

	const orgsHref = buildHref('/organizations')
	const scheduleHref = buildHref('/schedule')

	return (
		<Sidebar>
			<SidebarHeader className="border-b p-4">
				<div className="flex items-center gap-2">
					<span className="text-lg font-semibold">Slotix</span>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									render={<Link href={orgsHref} />}
									isActive={isActive(orgsHref)}
								>
									<Building2 className="size-4" />
									<span>{t('myOrganizations')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									render={<Link href={scheduleHref} />}
									isActive={isActive(scheduleHref)}
								>
									<Calendar className="size-4" />
									<span>{t('mySchedule')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="border-t p-2">
				<SidebarMenu>
					<SidebarMenuItem>
						<div className="text-muted-foreground px-2 py-1 text-sm">
							{user.name}
						</div>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<LogoutButton />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	)
}

export { DashboardSidebar }
