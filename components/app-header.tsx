'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Pencil, CreditCard } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { EditProfileDialog } from '@/components/edit-profile-dialog'
import { userApi, authApi, ApiError } from '@/services'
import type { User } from '@/services'

export function AppHeader() {
	const router = useRouter()
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)
	const [editOpen, setEditOpen] = useState(false)

	useEffect(() => {
		let cancelled = false

		userApi
			.me()
			.then((res) => {
				if (!cancelled) setUser(res.data)
			})
			.catch((err) => {
				if (cancelled) return
				if (err instanceof ApiError && err.status === 401) {
					router.push('/login')
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [router])

	const handleLogout = async () => {
		await authApi.logout({ silent: true })
		router.push('/login')
	}

	const handleNameUpdated = (updatedUser: User) => {
		setUser(updatedUser)
		setEditOpen(false)
	}

	return (
		<header className="border-border flex h-14 items-center justify-end border-b px-4">
			{loading ? (
				<div className="flex items-center gap-2">
					<Skeleton className="h-8 w-24" />
					<Skeleton className="h-8 w-8 rounded-full" />
				</div>
			) : user ? (
				<DropdownMenu>
					<DropdownMenuTrigger className="flex cursor-pointer items-center gap-2 outline-none">
						<span className="text-sm font-medium">{user.name}</span>
						<Avatar size="sm">
							<AvatarImage
								src={user.avatar}
								alt={user.name}
								referrerPolicy="no-referrer"
							/>
							<AvatarFallback>
								{user.name?.charAt(0)?.toUpperCase() ?? '?'}
							</AvatarFallback>
						</Avatar>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						<DropdownMenuGroup>
							<DropdownMenuLabel>
								<div className="flex flex-col gap-1">
									<span className="text-sm font-medium">{user.name}</span>
									<span className="text-muted-foreground text-xs">
										{user.email}
									</span>
								</div>
							</DropdownMenuLabel>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem onClick={() => setEditOpen(true)}>
								<Pencil />
								Edit name
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => router.push('/billing')}>
								<CreditCard />
								Billing
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem onClick={handleLogout}>
								<LogOut />
								Logout
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			) : null}

			{user && (
				<EditProfileDialog
					user={user}
					open={editOpen}
					onOpenChange={setEditOpen}
					onSuccess={handleNameUpdated}
				/>
			)}
		</header>
	)
}
