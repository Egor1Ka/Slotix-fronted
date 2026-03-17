import Link from 'next/link'

const routes = [
	{
		href: '/demo',
		label: 'Demo',
		description: 'Style overview with interactive components',
	},
	{
		href: '/login',
		label: 'Login',
		description: 'Login page with form and image',
	},
	{
		href: '/signup',
		label: 'Sign Up',
		description: 'Signup page with form and image',
	},
	{
		href: '/shadcndemo',
		label: 'shadcn/ui Demo',
		description: 'All shadcn/ui components showcase',
	},
]

export default function Home() {
	return (
		<div className="bg-background flex min-h-screen items-center justify-center">
			<main className="flex w-full max-w-lg flex-col gap-8 px-6 py-16">
				<div className="flex flex-col gap-2">
					<h1 className="text-3xl font-bold tracking-tight">
						Frontend Template
					</h1>
					<p className="text-muted-foreground">Select a page to navigate to.</p>
				</div>
				<nav className="flex flex-col gap-3">
					{routes.map((route) => (
						<Link
							key={route.href}
							href={route.href}
							className="group border-border hover:bg-muted flex flex-col gap-1 rounded-lg border p-4 transition-colors"
						>
							<span className="font-medium group-hover:underline">
								{route.label}
							</span>
							<span className="text-muted-foreground text-sm">
								{route.description}
							</span>
						</Link>
					))}
				</nav>
			</main>
		</div>
	)
}
