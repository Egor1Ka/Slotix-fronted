import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'

export default function PublicLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<div className="flex min-h-svh flex-col">
			<AppHeader />
			<main className="flex-1">{children}</main>
			<AppFooter />
		</div>
	)
}
