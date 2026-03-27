'use client'

import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import {
	Calendar,
	Users,
	Building2,
	User,
	ChevronDown,
	Scissors,
	Dumbbell,
} from 'lucide-react'
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ── Seed data IDs (will match seed script output) ──
// These are hardcoded to match the seeded database.
// In production, these would come from an API call.

interface StaffLink {
	name: string
	id: string
	position: string
}

const ORG_ID = '69c5364f7a84add67bb68cfa'

const BARBERS: StaffLink[] = [
	{ name: 'Іван Петров', id: '69c5364f7a84add67bb68d0f', position: 'Senior Barber' },
	{ name: 'Олексій Коваленко', id: '69c5364f7a84add67bb68d10', position: 'Barber' },
	{ name: 'Дмитро Шевченко', id: '69c5364f7a84add67bb68d11', position: 'Junior Barber' },
]

const TRAINER: StaffLink = {
	name: 'Анна Тренер',
	id: '69c5364f7a84add67bb68d12',
	position: 'Тренер',
}

function BookingSidebar() {
	const pathname = usePathname()
	const locale = useLocale()

	const isActive = (href: string): boolean => pathname === href

	const buildHref = (path: string): string => `/${locale}${path}`

	const orgPublicHref = buildHref(`/org/${ORG_ID}`)
	const orgAdminHref = buildHref(`/staff/org/${ORG_ID}`)
	const scheduleHref = buildHref('/staff/schedule')

	const renderBarberLink = (barber: StaffLink) => {
		const href = barber.id ? buildHref(`/book/${barber.id}`) : '#'

		return (
			<SidebarMenuSubItem key={barber.name}>
				<SidebarMenuSubButton
					render={<Link href={href} />}
					isActive={isActive(href)}
				>
					<span>{barber.name}</span>
					<span className="text-muted-foreground ml-auto text-xs">
						{barber.position}
					</span>
				</SidebarMenuSubButton>
			</SidebarMenuSubItem>
		)
	}

	const trainerHref = TRAINER.id ? buildHref(`/book/${TRAINER.id}`) : '#'

	return (
		<Sidebar>
			<SidebarHeader className="border-b p-4">
				<div className="flex items-center gap-2">
					<Calendar className="size-5" />
					<span className="font-semibold">Booking Demo</span>
				</div>
			</SidebarHeader>
			<SidebarContent>
				{/* Navigation section */}
				<SidebarGroup>
					<SidebarGroupLabel>Навігація</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{/* Organization */}
							<Collapsible defaultOpen className="group/collapsible">
								<SidebarMenuItem>
									<CollapsibleTrigger render={<SidebarMenuButton />}>
										<Building2 className="size-4" />
										<span>Організація</span>
										<ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub>
											<SidebarMenuSubItem>
												<SidebarMenuSubButton
													render={<Link href={orgPublicHref} />}
													isActive={isActive(orgPublicHref)}
												>
													<span>Публічна сторінка</span>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
											<SidebarMenuSubItem>
												<SidebarMenuSubButton
													render={<Link href={orgAdminHref} />}
													isActive={isActive(orgAdminHref)}
												>
													<span>Адмін розклад</span>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
										</SidebarMenuSub>
									</CollapsibleContent>
								</SidebarMenuItem>
							</Collapsible>

							{/* Personal */}
							<Collapsible defaultOpen className="group/collapsible">
								<SidebarMenuItem>
									<CollapsibleTrigger render={<SidebarMenuButton />}>
										<User className="size-4" />
										<span>Особистий кабінет</span>
										<ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub>
											<SidebarMenuSubItem>
												<SidebarMenuSubButton
													render={<Link href={scheduleHref} />}
													isActive={isActive(scheduleHref)}
												>
													<span>Мій розклад</span>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
										</SidebarMenuSub>
									</CollapsibleContent>
								</SidebarMenuItem>
							</Collapsible>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{/* Barbershop staff links */}
				<SidebarGroup>
					<SidebarGroupLabel>
						<Scissors className="mr-1 inline size-3" />
						Барбершоп — публічне бронювання
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<Collapsible defaultOpen className="group/collapsible">
								<SidebarMenuItem>
									<CollapsibleTrigger render={<SidebarMenuButton />}>
										<Users className="size-4" />
										<span>Майстри</span>
										<ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub>
											{BARBERS.map(renderBarberLink)}
										</SidebarMenuSub>
									</CollapsibleContent>
								</SidebarMenuItem>
							</Collapsible>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{/* Solo trainer link */}
				<SidebarGroup>
					<SidebarGroupLabel>
						<Dumbbell className="mr-1 inline size-3" />
						Тренер — публічне бронювання
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuSubButton
									render={<Link href={trainerHref} />}
									isActive={isActive(trainerHref)}
								>
									<span>{TRAINER.name}</span>
								</SidebarMenuSubButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	)
}

export { BookingSidebar }
