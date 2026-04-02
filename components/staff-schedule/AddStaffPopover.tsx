'use client'

import { useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { userSearchApi, orgApi } from '@/services'
import type { UserSearchResult } from '@/services'

interface AddStaffPopoverProps {
	orgId: string
	onStaffAdded: () => void
}

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300

function AddStaffPopover({ orgId, onStaffAdded }: AddStaffPopoverProps) {
	const t = useTranslations('staffSchedule')

	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<UserSearchResult[]>([])
	const [loading, setLoading] = useState(false)
	const [adding, setAdding] = useState(false)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const searchUsers = useCallback(
		async (searchQuery: string) => {
			if (searchQuery.length < MIN_QUERY_LENGTH) {
				setResults([])
				return
			}

			setLoading(true)
			try {
				const response = await userSearchApi.searchByEmail({
					queryParams: { email: searchQuery, orgId },
				})
				setResults(response.data)
			} catch {
				// обрабатывается интерцептором toast
			} finally {
				setLoading(false)
			}
		},
		[orgId],
	)

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value
		setQuery(value)

		if (timerRef.current) clearTimeout(timerRef.current)

		if (value.length < MIN_QUERY_LENGTH) {
			setResults([])
			return
		}

		timerRef.current = setTimeout(() => {
			searchUsers(value)
		}, DEBOUNCE_MS)
	}

	const handleSelectUser = async (userId: string) => {
		setAdding(true)
		try {
			await orgApi.addStaff({
				pathParams: { id: orgId },
				body: { userId },
			})
			toast.success(t('staffInvited'))
			setOpen(false)
			setQuery('')
			setResults([])
			onStaffAdded()
		} catch {
			// обрабатывается интерцептором toast
		} finally {
			setAdding(false)
		}
	}

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen)
		if (!nextOpen) {
			setQuery('')
			setResults([])
		}
	}

	const createUserClickHandler = (userId: string) => () =>
		handleSelectUser(userId)

	const renderUserOption = (user: UserSearchResult) => (
		<button
			key={user.id}
			type="button"
			onClick={createUserClickHandler(user.id)}
			disabled={adding}
			className="hover:bg-accent hover:text-accent-foreground w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm outline-hidden select-none disabled:pointer-events-none disabled:opacity-50"
		>
			{user.email}
		</button>
	)

	const showHint = query.length > 0 && query.length < MIN_QUERY_LENGTH
	const showEmpty =
		!loading && query.length >= MIN_QUERY_LENGTH && results.length === 0

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger
				render={
					<Button variant="outline" size="icon" aria-label={t('addStaff')} />
				}
			>
				<Plus className="size-4" />
			</PopoverTrigger>

			<PopoverContent align="end" className="w-80 p-0">
				<div className="p-2">
					<Input
						placeholder={t('searchByEmail')}
						value={query}
						onChange={handleInputChange}
						autoFocus
						disabled={adding}
					/>
				</div>

				<div className="max-h-48 overflow-y-auto p-1">
					{loading && (
						<div className="flex justify-center py-3">
							<Spinner className="size-4" />
						</div>
					)}

					{showHint && (
						<p className="text-muted-foreground py-2 text-center text-sm">
							{t('minCharsHint')}
						</p>
					)}

					{showEmpty && (
						<p className="text-muted-foreground py-2 text-center text-sm">
							{t('userNotFound')}
						</p>
					)}

					{!loading && results.map(renderUserOption)}
				</div>
			</PopoverContent>
		</Popover>
	)
}

export { AddStaffPopover }
