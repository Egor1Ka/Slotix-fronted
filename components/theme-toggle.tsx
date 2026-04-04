'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ThemeToggle() {
	const { theme, setTheme } = useTheme()

	const handleToggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

	return (
		<Button
			variant="ghost"
			size="icon-sm"
			onClick={handleToggle}
			aria-label="Toggle theme"
		>
			<Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
			<Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
		</Button>
	)
}

export { ThemeToggle }
