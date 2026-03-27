'use client'

import { usePathname, useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Calendar, ArrowLeft, Users } from 'lucide-react'
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
import type { OrgByIdResponse, OrgStaffMember } from '@/services'

function OrgSidebar() {
	const pathname = usePathname()
	const locale = useLocale()
	const params = useParams<{ orgId: string }>()
	const t = useTranslations('sidebar')
	const [org, setOrg] = useState<OrgByIdResponse | null>(null)
	const [staffList, setStaffList] = useState<OrgStaffMember[]>([])

	const orgId = params.orgId

	useEffect(() => {
		if (!orgId) return

		// Загрузка данных организации
		const fetchOrgData = async () => {
			try {
				const orgResponse = await orgApi.getById({
					pathParams: { id: orgId },
				})
				setOrg(orgResponse.data)
			} catch {
				// обрабатывается интерцептором toast
			}
		}

		// Загрузка списка персонала
		const fetchStaffData = async () => {
			try {
				const staffResponse = await orgApi.getStaff({
					pathParams: { id: orgId },
				})
				setStaffList(staffResponse.data)
			} catch {
				// обрабатывается интерцептором toast
			}
		}

		fetchOrgData()
		fetchStaffData()
	}, [orgId])

	const isActive = (href: string): boolean => pathname === href

	const buildHref = (path: string): string => `/${locale}${path}`

	// Используем /manage/ для админских маршрутов орги (отличается от /org/ для публичных)
	const orgScheduleHref = buildHref(`/manage/${orgId}`)
	const orgsHref = buildHref('/organizations')

	const getInitial = (name: string): string => name.charAt(0).toUpperCase()

	const renderStaffItem = (staff: OrgStaffMember) => {
		const href = buildHref(`/manage/${orgId}/${staff.id}`)
		return (
			<SidebarMenuItem key={staff.id}>
				<SidebarMenuButton
					render={<Link href={href} />}
					isActive={isActive(href)}
				>
					<Avatar className="size-5">
						<AvatarImage src={staff.avatar} />
						<AvatarFallback className="text-xs">
							{getInitial(staff.name)}
						</AvatarFallback>
					</Avatar>
					<span>{staff.name}</span>
				</SidebarMenuButton>
			</SidebarMenuItem>
		)
	}

	return (
		<Sidebar>
			<SidebarHeader className="border-b p-4">
				<div className="flex items-center gap-2">
					{org ? (
						<>
							{org.logo ? (
								<img
									src={org.logo}
									alt={org.name}
									className="size-6 rounded"
								/>
							) : (
								<div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded text-xs font-bold">
									{getInitial(org.name)}
								</div>
							)}
							<span className="font-semibold">{org.name}</span>
						</>
					) : (
						<span className="text-muted-foreground text-sm">Loading...</span>
					)}
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
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
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{staffList.length > 0 && (
					<SidebarGroup>
						<SidebarGroupLabel>
							<Users className="mr-1 inline size-3" />
							{t('staff')}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>{staffList.map(renderStaffItem)}</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				)}
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
