'use client'

import { usePathname, useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
	Calendar,
	ArrowLeft,
	Briefcase,
	Settings2,
	ClipboardList,
	CalendarDays,
	UserCircle,
	CircleDot,
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
import { orgApi } from '@/services'
import type { OrgByIdResponse } from '@/services'

function OrgSidebar() {
	const pathname = usePathname()
	const locale = useLocale()
	const params = useParams<{ orgId: string }>()
	const t = useTranslations('sidebar')
	const [org, setOrg] = useState<OrgByIdResponse | null>(null)
	const [role, setRole] = useState<string | null>(null)

	const orgId = params.orgId

	useEffect(() => {
		if (!orgId) return

		const fetchOrgData = async () => {
			try {
				const [orgResponse, membershipResponse] = await Promise.all([
					orgApi.getById({ pathParams: { id: orgId } }),
					orgApi.getMyMembership({ pathParams: { id: orgId } }),
				])
				setOrg(orgResponse.data)
				setRole(membershipResponse.data.role)
			} catch {
				// обрабатывается интерцептором toast
			}
		}

		fetchOrgData()
	}, [orgId])

	const ADMIN_ROLES = ['owner', 'admin']
	const isAdmin = role !== null && ADMIN_ROLES.includes(role)

	const isActive = (href: string): boolean => pathname === href

	const buildHref = (path: string): string => `/${locale}${path}`

	// Используем /manage/ для админских маршрутов орги (отличается от /org/ для публичных)
	const profileHref = buildHref(`/manage/${orgId}/profile`)
	const orgScheduleHref = buildHref(`/manage/${orgId}`)
	const positionsHref = buildHref(`/manage/${orgId}/positions`)
	const servicesHref = buildHref(`/manage/${orgId}/services`)
	const staffScheduleHref = buildHref(`/manage/${orgId}/staff-schedule`)
	const bookingStatusesHref = buildHref(`/manage/${orgId}/booking-statuses`)
	const myScheduleHref = buildHref(`/org/${orgId}/my-schedule`)
	const myProfileHref = buildHref(`/org/${orgId}/my-profile`)
	const orgsHref = buildHref('/organizations')

	const getInitial = (name: string): string => name.charAt(0).toUpperCase()

	return (
		<Sidebar>
			<SidebarHeader className="border-b p-4">
				{org ? (
					<div className="flex items-center gap-3">
						<Avatar className="ring-border size-10 ring-2">
							<AvatarImage src={org.logo ?? undefined} alt={org.name} />
							<AvatarFallback className="text-sm font-bold">
								{getInitial(org.name)}
							</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="truncate text-sm font-semibold">{org.name}</span>
							{role && (
								<span className="text-muted-foreground truncate text-xs capitalize">
									{role}
								</span>
							)}
						</div>
					</div>
				) : (
					<span className="text-muted-foreground text-sm">Loading...</span>
				)}
			</SidebarHeader>
			<SidebarContent>
				{isAdmin && (
					<>
						<SidebarGroup>
							<SidebarGroupLabel>{t('groupOrgProfile')}</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={<Link href={profileHref} />}
											isActive={isActive(profileHref)}
										>
											<UserCircle className="size-4" />
											<span>{t('orgProfile')}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
						<SidebarGroup>
							<SidebarGroupLabel>{t('groupSchedule')}</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={<Link href={orgScheduleHref} />}
											isActive={isActive(orgScheduleHref)}
										>
											<Calendar className="size-4" />
											<span>{t('generalSchedule')}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={<Link href={staffScheduleHref} />}
											isActive={isActive(staffScheduleHref)}
										>
											<ClipboardList className="size-4" />
											<span>{t('staffSchedule')}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
						<SidebarGroup>
							<SidebarGroupLabel>{t('groupStructure')}</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={<Link href={positionsHref} />}
											isActive={isActive(positionsHref)}
										>
											<Briefcase className="size-4" />
											<span>{t('positions')}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={<Link href={servicesHref} />}
											isActive={isActive(servicesHref)}
										>
											<Settings2 className="size-4" />
											<span>{t('services')}</span>
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
					</>
				)}
				<SidebarGroup>
					<SidebarGroupLabel>{t('groupPersonal')}</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									render={<Link href={myScheduleHref} />}
									isActive={isActive(myScheduleHref)}
								>
									<CalendarDays className="size-4" />
									<span>{t('mySchedule')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									render={<Link href={myProfileHref} />}
									isActive={isActive(myProfileHref)}
								>
									<UserCircle className="size-4" />
									<span>{t('myProfile')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="border-t p-2">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton render={<Link href={orgsHref} />}>
							<ArrowLeft className="size-4" />
							<span>{t('backToOrgs')}</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<LogoutButton />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	)
}

export { OrgSidebar }
