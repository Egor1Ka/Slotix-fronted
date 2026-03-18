// TODO: Replace with real auth check (e.g., getSession() from your auth provider)
// const session = await getSession()
// if (!session) redirect('/login')

export default function AppLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<div className="flex min-h-svh">
			{/* TODO: Add sidebar navigation here */}
			<main className="flex-1">{children}</main>
		</div>
	)
}
