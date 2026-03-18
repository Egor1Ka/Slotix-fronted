import { NewRelicBrowserScript } from '@/lib/monitoring/new-relic-browser-script'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import { Inter, Cormorant } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' })
const cormorant = Cormorant({
	subsets: ['latin', 'cyrillic'],
	variable: '--font-display',
})

export const metadata: Metadata = {
	title: 'Frontend Template',
	description: 'Next.js frontend template',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html
			className={cn('font-sans', inter.variable, cormorant.variable)}
			suppressHydrationWarning
		>
			<body className="antialiased">
				{children}
				<NewRelicBrowserScript />
			</body>
		</html>
	)
}
