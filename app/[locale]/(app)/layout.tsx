import { AppHeader } from '@/components/app-header'

export default function AppLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<div className="flex min-h-svh flex-col">
			<AppHeader />
			<main className="flex-1">{children}</main>
		</div>
	)
}
