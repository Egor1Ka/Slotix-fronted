'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
	CalendarIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from 'lucide-react'
import type { Locale } from 'date-fns'

import { Calendar } from '@/components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateStripProps {
	selectedDate: string
	onDateChange: (date: string) => void
	daysAhead?: number
	disabledDays?: number[]
	locale?: string
	dateFnsLocale?: Locale
	className?: string
}

const startOfToday = (): Date => {
	const d = new Date()
	d.setHours(0, 0, 0, 0)
	return d
}

const addDays = (d: Date, days: number): Date => {
	const next = new Date(d)
	next.setDate(next.getDate() + days)
	return next
}

const formatYMD = (d: Date): string =>
	new Intl.DateTimeFormat('en-CA').format(d)

const parseYMD = (s: string): Date => {
	const d = new Date(s + 'T00:00:00')
	d.setHours(0, 0, 0, 0)
	return d
}

const isSameDay = (a: Date, b: Date): boolean =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate()

const isBefore = (a: Date, b: Date): boolean => a.getTime() < b.getTime()

const formatWeekdayShort =
	(locale: string) =>
	(d: Date): string =>
		d.toLocaleDateString(locale, { weekday: 'short' })

const formatDayNumber = (d: Date): string => String(d.getDate())

const buildDayList = (start: Date, count: number): Date[] => {
	const indices = Array.from({ length: count }, (_, i) => i)
	const indexToDate = (i: number) => addDays(start, i)
	return indices.map(indexToDate)
}

function DateStrip({
	selectedDate,
	onDateChange,
	daysAhead = 14,
	disabledDays = [],
	locale = 'en',
	dateFnsLocale,
	className,
}: DateStripProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const today = startOfToday()
	const [windowStart, setWindowStart] = useState<Date>(today)
	const [pickerOpen, setPickerOpen] = useState(false)

	const days = useMemo(
		() => buildDayList(windowStart, daysAhead),
		[windowStart, daysAhead],
	)
	const todayStr = formatYMD(today)
	const weekday = formatWeekdayShort(locale)

	useEffect(() => {
		if (!selectedDate) return
		const selected = parseYMD(selectedDate)
		const lastVisible = addDays(windowStart, daysAhead - 1)
		const outsideWindow =
			isBefore(selected, windowStart) || isBefore(lastVisible, selected)
		if (outsideWindow) setWindowStart(selected)
	}, [selectedDate, daysAhead]) // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		const node = containerRef.current
		if (!node) return
		const selected = node.querySelector<HTMLElement>('[data-selected="true"]')
		if (!selected) return
		selected.scrollIntoView({
			block: 'nearest',
			inline: 'center',
			behavior: 'smooth',
		})
	}, [selectedDate, windowStart])

	const canGoBack = !isSameDay(windowStart, today)

	const handlePrev = () => {
		const next = addDays(windowStart, -daysAhead)
		setWindowStart(isBefore(next, today) ? today : next)
	}

	const handleNext = () => {
		setWindowStart(addDays(windowStart, daysAhead))
	}

	const handlePickDate = (date: Date | undefined) => {
		if (!date) return
		setWindowStart(date)
		onDateChange(formatYMD(date))
		setPickerOpen(false)
	}

	const renderDay = (date: Date) => {
		const dateStr = formatYMD(date)
		const isSelected = dateStr === selectedDate
		const isToday = dateStr === todayStr
		const isDisabled = disabledDays.includes(date.getDay())
		const handleClick = () => {
			if (isDisabled) return
			onDateChange(dateStr)
		}

		return (
			<button
				key={dateStr}
				type="button"
				data-selected={isSelected || undefined}
				onClick={handleClick}
				disabled={isDisabled}
				className={cn(
					'relative flex min-w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border px-3 py-2 transition-all',
					isSelected
						? 'border-primary bg-primary text-primary-foreground shadow-md'
						: 'border-border bg-card hover:bg-muted',
					isDisabled && 'cursor-not-allowed opacity-40',
				)}
			>
				<span
					className={cn(
						'text-[10px] tracking-wide uppercase',
						!isSelected && 'text-muted-foreground',
					)}
				>
					{weekday(date)}
				</span>
				<span className="text-lg leading-none font-semibold">
					{formatDayNumber(date)}
				</span>
				{isToday && !isSelected && (
					<span className="bg-primary mt-0.5 size-1 rounded-full" />
				)}
			</button>
		)
	}

	const calendarSelected = useMemo(
		() => parseYMD(selectedDate),
		[selectedDate],
	)

	const navButtonClass =
		'bg-card hover:bg-muted border-border flex size-11 shrink-0 items-center justify-center rounded-2xl border transition-all disabled:cursor-not-allowed disabled:opacity-40'

	return (
		<div className={cn('flex items-stretch gap-2', className)}>
			<button
				type="button"
				onClick={handlePrev}
				disabled={!canGoBack}
				aria-label="Previous"
				className={navButtonClass}
			>
				<ChevronLeftIcon className="size-4" />
			</button>

			<div
				ref={containerRef}
				className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			>
				{days.map(renderDay)}
			</div>

			<button
				type="button"
				onClick={handleNext}
				aria-label="Next"
				className={navButtonClass}
			>
				<ChevronRightIcon className="size-4" />
			</button>

			<Popover open={pickerOpen} onOpenChange={setPickerOpen}>
				<PopoverTrigger
					render={
						<button
							type="button"
							aria-label="Pick date"
							className={navButtonClass}
						>
							<CalendarIcon className="size-4" />
						</button>
					}
				/>
				<PopoverContent className="w-auto p-0" align="end">
					<Calendar
						mode="single"
						selected={calendarSelected}
						onSelect={handlePickDate}
						disabled={{ before: today }}
						locale={dateFnsLocale}
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}

export { DateStrip }
