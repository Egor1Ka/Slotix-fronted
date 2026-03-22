import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { getUser } from '@/lib/auth/get-user'
import { UserProvider } from '@/lib/auth/user-provider'

export default async function AppLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await getUser()

	if (!user) redirect('/login')

	return (
		<UserProvider user={user}>
			<div className="flex min-h-svh flex-col">
				<AppHeader />
				<main className="flex-1">{children}</main>
			</div>
		</UserProvider>
	)
}
