'use client'

import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import {
	Building2,
	Calendar,
	CalendarCog,
	Settings2,
	UserCircle,
} from 'lucide-react'
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

function PersonalSidebar() {
	const pathname = usePathname()
	const locale = useLocale()
	const t = useTranslations('sidebar')
	const user = useUser()

	const isActive = (href: string): boolean => pathname === href

	const buildHref = (path: string): string => `/${locale}${path}`

	const scheduleHref = buildHref('/schedule')
	const myScheduleHref = buildHref('/my-schedule')
	const myServicesHref = buildHref('/my-services')
	const profileHref = buildHref('/profile')
	const orgsHref = buildHref('/organizations')

	return (
		<Sidebar>
			<SidebarHeader className="border-b p-4">
				<div className="flex items-center gap-2">
					<span className="text-lg font-semibold">{user.name}</span>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									render={<Link href={profileHref} />}
									isActive={isActive(profileHref)}
								>
									<UserCircle className="size-4" />
									<span>{t('myProfile')}</span>
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
							<SidebarMenuItem>
								<SidebarMenuButton
									render={<Link href={myScheduleHref} />}
									isActive={isActive(myScheduleHref)}
								>
									<CalendarCog className="size-4" />
									<span>{t('myScheduleSettings')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									render={<Link href={myServicesHref} />}
									isActive={isActive(myServicesHref)}
								>
									<Settings2 className="size-4" />
									<span>{t('myServices')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									render={<Link href={orgsHref} />}
									isActive={isActive(orgsHref)}
								>
									<Building2 className="size-4" />
									<span>{t('myOrganizations')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="border-t p-2">
				<SidebarMenu>
					<SidebarMenuItem>
						<LogoutButton />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	)
}

export { PersonalSidebar }
