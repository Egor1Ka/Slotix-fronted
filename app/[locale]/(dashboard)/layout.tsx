import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/get-user'
import { UserProvider } from '@/lib/auth/user-provider'
import {
	SidebarProvider,
	SidebarInset,
	SidebarTrigger,
} from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/sidebar/DashboardSidebar'

export default async function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await getUser()
	if (!user) redirect('/login')

	return (
		<UserProvider user={user}>
			<SidebarProvider>
				<DashboardSidebar />
				<SidebarInset>
					<header className="bg-background sticky top-0 z-10 flex h-12 items-center gap-2 border-b px-4">
						<SidebarTrigger className="-ml-1" />
					</header>
					<main className="flex-1">{children}</main>
				</SidebarInset>
			</SidebarProvider>
		</UserProvider>
	)
}
