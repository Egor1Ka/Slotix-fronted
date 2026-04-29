import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'
import { getUser } from '@/lib/auth/get-user'
import { UserProvider } from '@/lib/auth/user-provider'

export default async function PublicLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await getUser()

	return (
		<UserProvider user={user}>
			<div className="flex min-h-svh flex-col">
				<AppHeader />
				<main className="flex-1">{children}</main>
				<AppFooter />
			</div>
		</UserProvider>
	)
}
