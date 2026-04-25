'use client'

import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import {
	Building2,
	Calendar,
	CalendarCog,
	CircleDot,
	Settings2,
	UserCircle,
} from 'lucide-react'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogoutButton } from './LogoutButton'
import { useUser } from '@/lib/auth/user-provider'

const getInitial = (part: string): string => part[0] ?? ''

const getInitials = (name: string): string =>
	name.split(' ').map(getInitial).join('').toUpperCase().slice(0, 2)

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
	const bookingStatusesHref = buildHref('/booking-statuses')
	const orgsHref = buildHref('/organizations')

	return (
		<Sidebar>
			<SidebarHeader className="border-b p-4">
				<div className="flex items-center gap-3">
					<Avatar className="ring-border size-10 ring-2">
						<AvatarImage src={user.avatar} alt={user.name} />
						<AvatarFallback className="text-sm font-medium">
							{getInitials(user.name)}
						</AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-col gap-0.5">
						<span className="truncate text-sm font-semibold">{user.name}</span>
						{user.email && (
							<span className="text-muted-foreground truncate text-xs">
								{user.email}
							</span>
						)}
					</div>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>{t('groupCalendar')}</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
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
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupLabel>{t('groupManage')}</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
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
									render={<Link href={bookingStatusesHref} />}
									isActive={isActive(bookingStatusesHref)}
								>
									<CircleDot className="size-4" />
									<span>{t('bookingStatuses')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupLabel>{t('groupAccount')}</SidebarGroupLabel>
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
