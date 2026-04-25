import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/get-user'
import { UserProvider } from '@/lib/auth/user-provider'
import {
	SidebarProvider,
	SidebarInset,
	SidebarTrigger,
} from '@/components/ui/sidebar'
import { PersonalSidebar } from '@/components/sidebar/PersonalSidebar'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from '@/components/logo'
import { AppFooter } from '@/components/app-footer'

export default async function PersonalLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await getUser()
	if (!user) redirect('/login')

	return (
		<UserProvider user={user}>
			<SidebarProvider>
				<PersonalSidebar />
				<SidebarInset>
					<header className="bg-background sticky top-0 z-10 flex h-12 items-center justify-between border-b px-4">
						<div className="flex items-center gap-3">
							<SidebarTrigger className="-ml-1" />
							<Logo size="sm" />
						</div>
						<div className="flex items-center gap-2">
							<ThemeToggle />
							<LanguageSwitcher />
						</div>
					</header>
					<main className="flex-1">{children}</main>
					<AppFooter />
				</SidebarInset>
			</SidebarProvider>
		</UserProvider>
	)
}
