import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

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
		<html className={cn('font-sans', inter.variable)} suppressHydrationWarning>
			<body className="antialiased">{children}</body>
		</html>
	)
}
