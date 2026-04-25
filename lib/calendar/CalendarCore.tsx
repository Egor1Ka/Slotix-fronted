'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { timeToMin } from '@/lib/slot-engine'
import { Button } from '@/components/ui/button'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	MenuIcon,
	LinkIcon,
	CheckIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { useCalendarStrategy } from './CalendarContext'
import {
	ProfileInfoBlock,
	type ProfileInfoBlockProps,
} from '@/components/booking/ProfileInfoBlock'
import { useViewConfig } from './CalendarViewConfigContext'
import { GreyBlock } from '@/components/booking/GreyBlock'
import type { ViewMode, CalendarBlock } from './types'
import type { CalendarViewConfig } from './view-config'
import {
	PX_PER_HOUR,
	createGridConfig,
	getCalendarLocale,
	minutesToPx,
	durationToPx,
	formatHour,
	getTodayStrInTz,
	getWeekDates,
	getMonthGrid,
	addDays,
	addMonths,
	resolveOverlaps,
} from './utils'
import { getDayOfWeekInTz, wallClockInTz } from './tz'

const DEFAULT_VIEW_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'full',
	columnHeader: 'date',
	showStaffTabs: false,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'none',
	canBookForClient: false,
	isPublicBookingPage: false,
	filterByStaffCapability: false,
	showScheduleEditor: false,
	allowListView: false,
	defaultView: 'day',
}

type ViewOption = { value: ViewMode; labelKey: string }

const VIEW_OPTIONS: ViewOption[] = [
	{ value: 'day', labelKey: 'day' },
	{ value: 'week', labelKey: 'week' },
	{ value: 'month', labelKey: 'month' },
]

interface CalendarCoreProps {
	date: string
	view: ViewMode
	onViewChange: (view: ViewMode) => void
	onDateChange: (date: string) => void
	onDayClick?: (date: string) => void
	workStart: string
	workEnd: string
	disabledDays?: number[]
	isDayOff?: boolean
	staffTabsSlot?: React.ReactNode
	columnHeaderSlot?: (dayDate: string, index: number) => React.ReactNode
	publicUrl?: string
	staffAvatarUrl?: string
	hideSidebar?: boolean
	profileInfo?: ProfileInfoBlockProps
	listViewSlot?: React.ReactNode
	scheduleTimezone: string
}

const navigate = (view: ViewMode, date: string, direction: number): string => {
	if (view === 'list') return addDays(date, direction)
	if (view === 'month') return addMonths(date, direction)
	if (view === 'week') return addDays(date, direction * 7)
	return addDays(date, direction)
}

const useSafeViewConfig = (): CalendarViewConfig => {
	try {
		return useViewConfig()
	} catch {
		return DEFAULT_VIEW_CONFIG
	}
}

const getCurrentMinuteOfDay = (timezone: string): number => {
	const wc = wallClockInTz(new Date().toISOString(), timezone)
	return wc.hour * 60 + wc.minute
}

// Обрезает рабочий интервал: если сейчас уже внутри рабочего дня,
// сдвигает «начало рабочей зоны» к текущей минуте, чтобы прошедшее время
// визуально слилось с нерабочим временем (bg-muted).
const getEffectiveWorkStartMin = (
	workStartMin: number,
	workEndMin: number,
	isToday: boolean,
	timezone: string,
): number => {
	if (!isToday) return workStartMin
	const nowMin = getCurrentMinuteOfDay(timezone)
	if (nowMin <= workStartMin) return workStartMin
	return Math.min(nowMin, workEndMin)
}

const OVERLAP_GAP_PX = 2
const DAY_HOUR_LABEL_WIDTH_PX = 48
const WEEK_BLOCK_INSET_PX = 2
const SHORT_EVENT_THRESHOLD_MIN = 30

interface OverlapStyle {
	width: string
	left: string
}

const getOverlapStyle = (
	block: CalendarBlock,
	baseLeftPx: number,
	baseRightPx: number,
): OverlapStyle | null => {
	if (!block.totalColumns || block.totalColumns <= 1) return null
	const col = block.column ?? 0
	const total = block.totalColumns
	const availableWidth = `100% - ${baseLeftPx + baseRightPx}px`
	const colWidth = `(${availableWidth}) / ${total}`
	const gapOffset = `${OVERLAP_GAP_PX / 2}px`
	return {
		width: `calc(${colWidth} - ${OVERLAP_GAP_PX}px)`,
		left: `calc(${baseLeftPx}px + ${col} * (${colWidth}) + ${gapOffset})`,
	}
}

function CalendarCore({
	date,
	view,
	onViewChange,
	onDateChange,
	onDayClick,
	workStart,
	workEnd,
	disabledDays = [],
	isDayOff = false,
	staffTabsSlot,
	columnHeaderSlot,
	publicUrl,
	staffAvatarUrl,
	hideSidebar = false,
	profileInfo,
	listViewSlot,
	scheduleTimezone,
}: CalendarCoreProps) {
	const strategy = useCalendarStrategy()
	const viewConfig = useSafeViewConfig()
	const lastCalendarViewRef = useRef<ViewMode>(view === 'list' ? 'day' : view)
	useEffect(() => {
		if (view !== 'list') lastCalendarViewRef.current = view
	}, [view])
	const lastCalendarView = lastCalendarViewRef.current
	const [sheetOpen, setSheetOpen] = useState(false)
	const t = useTranslations('calendar')
	const locale = useLocale()
	const calendarLocale = getCalendarLocale(locale)

	const grid = createGridConfig(workStart, workEnd)
	const title = strategy.getTitle(date, view)

	const [linkCopied, setLinkCopied] = useState(false)

	const handlePrev = () => onDateChange(navigate(view, date, -1))
	const handleNext = () => onDateChange(navigate(view, date, 1))

	const handleCopyPublicLink = () => {
		if (!publicUrl) return
		const fullUrl = `${window.location.origin}${publicUrl}`
		navigator.clipboard.writeText(fullUrl)
		setLinkCopied(true)
		toast.success(t('linkCopied'))
		setTimeout(() => setLinkCopied(false), 2000)
	}
	const handleOpenSheet = () => setSheetOpen(true)
	const handleSheetChange = (open: boolean) => setSheetOpen(open)

	const renderViewOption = (option: ViewOption) => {
		const isActive = view === option.value
		const handleClick = () => onViewChange(option.value)
		return (
			<Button
				key={option.value}
				variant={isActive ? 'default' : 'ghost'}
				size="xs"
				onClick={handleClick}
			>
				{t(option.labelKey)}
			</Button>
		)
	}

	const renderBookingBlock = (block: CalendarBlock) => {
		const handleBlockClick = (e: React.MouseEvent) => {
			if (viewConfig.onBlockClick === 'none') {
				e.stopPropagation()
				return
			}
			block.onClick?.()
		}

		const overlap = getOverlapStyle(block, DAY_HOUR_LABEL_WIDTH_PX, 0)
		const isShort = block.duration <= SHORT_EVENT_THRESHOLD_MIN

		return (
			<div
				key={block.id}
				className={cn(
					'absolute overflow-hidden rounded-md px-2 py-1 text-xs text-white',
					!overlap && 'right-0 left-12',
					viewConfig.onBlockClick === 'open-booking-details' &&
						'cursor-pointer',
				)}
				style={{
					top: minutesToPx(block.startMin, grid.displayStart),
					height: durationToPx(block.duration),
					backgroundColor: block.color,
					opacity: block.opacity ?? 1,
					...(overlap && { width: overlap.width, left: overlap.left }),
				}}
				onClick={handleBlockClick}
			>
				<div
					className={cn(
						'flex items-center gap-1.5',
						isShort ? 'flex-row' : 'flex-col items-start',
					)}
				>
					<div className="flex min-w-0 items-center gap-1.5">
						{block.avatarUrl && (
							<img
								src={block.avatarUrl}
								alt=""
								className="size-4 shrink-0 rounded-full object-cover"
							/>
						)}
						{block.label && (
							<span className="truncate font-medium">{block.label}</span>
						)}
					</div>
					{block.sublabel && (
						<span
							className={cn(
								'shrink-0 opacity-80',
								isShort && 'before:content-[\"\\B7_\"]',
							)}
						>
							{block.sublabel}
						</span>
					)}
				</div>
			</div>
		)
	}

	const renderBlock = (block: CalendarBlock) => {
		const isDashed = block.borderStyle === 'dashed'

		if (isDashed) {
			return (
				<button
					key={block.id}
					type="button"
					onClick={block.onClick}
					className={cn(
						'absolute right-0 left-12 cursor-pointer rounded-md border-2 border-dashed transition-colors',
						'hover:bg-accent/20',
					)}
					style={{
						top: minutesToPx(block.startMin, grid.displayStart),
						height: durationToPx(block.duration),
						borderColor: block.color,
					}}
				>
					<span className="text-muted-foreground px-2 text-xs">
						{block.label}
					</span>
				</button>
			)
		}

		if (block.blockType === 'locked') {
			return (
				<div
					key={block.id}
					className="bg-muted/40 absolute right-0 left-12 rounded-md"
					style={{
						top: minutesToPx(block.startMin, grid.displayStart),
						height: durationToPx(block.duration),
					}}
				/>
			)
		}

		if (block.blockType === 'booking') {
			if (viewConfig.blockedTimeVisibility === 'hidden') return null
			if (viewConfig.blockedTimeVisibility === 'grey')
				return (
					<GreyBlock
						key={block.id}
						block={block}
						displayStart={grid.displayStart}
					/>
				)
			return renderBookingBlock(block)
		}

		return renderBookingBlock(block)
	}

	const renderHourLine = (hour: number) => (
		<div
			key={hour}
			className="absolute right-0 left-0 flex items-start"
			style={{ top: minutesToPx(hour * 60, grid.displayStart) }}
		>
			<span className="text-muted-foreground w-12 -translate-y-1/2 pr-2 text-right text-xs">
				{formatHour(hour)}
			</span>
			<div className="border-border/50 flex-1 border-t" />
		</div>
	)

	const renderDayView = () => {
		const workStartMin = timeToMin(workStart)
		const workEndMin = timeToMin(workEnd)
		const isTodayDate = date === getTodayStrInTz(scheduleTimezone)
		const effectiveWorkStartMin = getEffectiveWorkStartMin(
			workStartMin,
			workEndMin,
			isTodayDate,
			scheduleTimezone,
		)
		const workTopPx = minutesToPx(effectiveWorkStartMin, grid.displayStart)
		const workHeightPx = durationToPx(workEndMin - effectiveWorkStartMin)
		const hasWorkArea = workHeightPx > 0
		const isInGridRange = (block: CalendarBlock): boolean =>
			block.startMin + block.duration > grid.displayStart
		const blocks = resolveOverlaps(strategy.getBlocks(date)).filter(
			isInGridRange,
		)

		const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
			if (viewConfig.onEmptyCellClick === 'none') return
			const target = e.target as HTMLElement
			if (target !== e.currentTarget) return
			const rect = e.currentTarget.getBoundingClientRect()
			const y = e.clientY - rect.top
			const minutes = Math.floor((y / PX_PER_HOUR) * 60) + grid.displayStart
			strategy.onCellClick(date, minutes)
		}

		return (
			<div
				className="relative"
				style={{ height: grid.totalHours * PX_PER_HOUR }}
				onClick={handleGridClick}
			>
				<div className="bg-muted/30 absolute inset-0 left-12 rounded-md" />
				{!isDayOff && hasWorkArea && (
					<div
						className="bg-card absolute right-0 left-12 rounded-md"
						style={{ top: workTopPx, height: workHeightPx }}
					/>
				)}
				{grid.hourLabels.map(renderHourLine)}
				{!isDayOff && blocks.map(renderBlock)}
			</div>
		)
	}

	const renderWeekView = () => {
		const weekDates = getWeekDates(date, scheduleTimezone)
		const today = getTodayStrInTz(scheduleTimezone)
		const workStartMin = timeToMin(workStart)
		const workEndMin = timeToMin(workEnd)
		const gridHeight = grid.totalHours * PX_PER_HOUR

		const renderHourLabel = (hour: number) => (
			<div
				key={hour}
				className="text-muted-foreground absolute right-0 -translate-y-1/2 pr-2 text-right text-xs"
				style={{ top: minutesToPx(hour * 60, grid.displayStart) }}
			>
				{formatHour(hour)}
			</div>
		)

		const renderWeekHourLine = (hour: number) => (
			<div
				key={`line-${hour}`}
				className="border-border/30 absolute right-0 left-0 border-t"
				style={{ top: minutesToPx(hour * 60, grid.displayStart) }}
			/>
		)

		const renderWeekBlock = (block: CalendarBlock) => {
			const isDashed = block.borderStyle === 'dashed'

			if (isDashed) {
				return (
					<button
						key={block.id}
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							block.onClick?.()
						}}
						className="hover:bg-accent/20 absolute inset-x-0.5 cursor-pointer rounded-sm border border-dashed transition-colors"
						style={{
							top: minutesToPx(block.startMin, grid.displayStart),
							height: durationToPx(block.duration),
							borderColor: block.color,
						}}
					>
						<span className="text-muted-foreground px-0.5 text-[10px]">
							{block.label}
						</span>
					</button>
				)
			}

			if (block.blockType === 'locked') {
				return (
					<div
						key={block.id}
						className="bg-muted/40 pointer-events-none absolute inset-x-0.5 rounded-sm"
						style={{
							top: minutesToPx(block.startMin, grid.displayStart),
							height: durationToPx(block.duration),
						}}
					/>
				)
			}

			if (block.blockType === 'booking') {
				if (viewConfig.blockedTimeVisibility === 'hidden') return null
				if (viewConfig.blockedTimeVisibility === 'grey') {
					return (
						<div
							key={block.id}
							className="bg-muted pointer-events-none absolute inset-x-0.5 cursor-default rounded-sm"
							style={{
								top: minutesToPx(block.startMin, grid.displayStart),
								height: durationToPx(block.duration),
								opacity: 0.6,
							}}
						/>
					)
				}
			}

			const handleWeekBlockClick = (e: React.MouseEvent) => {
				e.stopPropagation()
				if (block.blockType === 'booking' && viewConfig.onBlockClick === 'none')
					return
				block.onClick?.()
			}

			const overlap = getOverlapStyle(
				block,
				WEEK_BLOCK_INSET_PX,
				WEEK_BLOCK_INSET_PX,
			)

			return (
				<div
					key={block.id}
					className={cn(
						'absolute overflow-hidden rounded-sm px-0.5 text-[10px] leading-tight text-white',
						!overlap && 'inset-x-0.5',
					)}
					style={{
						top: minutesToPx(block.startMin, grid.displayStart),
						height: durationToPx(block.duration),
						backgroundColor: block.color,
						opacity: block.opacity ?? 1,
						...(overlap && { width: overlap.width, left: overlap.left }),
					}}
					onClick={handleWeekBlockClick}
				>
					{block.label && (
						<div className="truncate font-medium">{block.label}</div>
					)}
				</div>
			)
		}

		const isDayDisabled = (dayDate: string): boolean => {
			const dayOfWeek = getDayOfWeekInTz(dayDate, scheduleTimezone)
			return disabledDays.includes(dayOfWeek)
		}

		const renderDefaultDayHeader = (dayDate: string, index: number) => {
			const isToday = dayDate === today
			const isSelected = dayDate === date
			const isDisabled = isDayDisabled(dayDate)
			const dayNum = parseInt(dayDate.split('-')[2], 10)

			return (
				<div
					key={`h-${dayDate}`}
					className={cn(
						'flex-1 py-1 text-center text-xs',
						isDisabled && 'opacity-40',
					)}
				>
					<div className="text-muted-foreground">
						{calendarLocale.daysShort[index]}
					</div>
					<div
						className={cn(
							'mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full',
							isToday &&
								!isDisabled &&
								'bg-primary text-primary-foreground font-medium',
							!isToday && isSelected && !isDisabled && 'bg-accent font-medium',
						)}
					>
						{dayNum}
					</div>
				</div>
			)
		}

		const renderDayHeader = columnHeaderSlot ?? renderDefaultDayHeader

		const renderDayColumn = (dayDate: string) => {
			const isDisabled = isDayDisabled(dayDate)
			const blocks = isDisabled
				? []
				: resolveOverlaps(strategy.getBlocks(dayDate))
			const isToday = dayDate === today
			const columnEffectiveStartMin = getEffectiveWorkStartMin(
				workStartMin,
				workEndMin,
				isToday,
				scheduleTimezone,
			)
			const columnWorkTopPx = minutesToPx(
				columnEffectiveStartMin,
				grid.displayStart,
			)
			const columnWorkHeightPx = durationToPx(
				workEndMin - columnEffectiveStartMin,
			)
			const columnHasWorkArea = columnWorkHeightPx > 0
			const handleClick = () => {
				if (isDisabled) return
				if (onDayClick) {
					onDayClick(dayDate)
					return
				}
				onDateChange(dayDate)
				onViewChange('day')
			}

			return (
				<button
					key={dayDate}
					type="button"
					onClick={handleClick}
					disabled={isDisabled}
					className={cn(
						'border-border/30 relative flex-1 border-l transition-colors',
						isDisabled
							? 'bg-muted/50 cursor-default'
							: 'hover:bg-accent/20 cursor-pointer',
						isToday && !isDisabled && 'bg-primary/5',
					)}
					style={{ height: gridHeight }}
				>
					{!isDisabled && (
						<>
							<div className="bg-muted/30 absolute inset-0" />
							{columnHasWorkArea && (
								<div
									className="bg-card absolute inset-x-0"
									style={{
										top: columnWorkTopPx,
										height: columnWorkHeightPx,
									}}
								/>
							)}
						</>
					)}
					{blocks.map(renderWeekBlock)}
				</button>
			)
		}

		return (
			<div className="flex flex-col">
				<div className="flex">
					<div className="w-12 shrink-0" />
					{weekDates.map(renderDayHeader)}
				</div>
				<div className="flex">
					<div
						className="relative w-12 shrink-0"
						style={{ height: gridHeight }}
					>
						{grid.hourLabels.map(renderHourLabel)}
					</div>
					<div className="relative flex flex-1" style={{ height: gridHeight }}>
						{grid.hourLabels.map(renderWeekHourLine)}
						{weekDates.map(renderDayColumn)}
					</div>
				</div>
			</div>
		)
	}

	const renderMonthView = () => {
		const grid = getMonthGrid(date, scheduleTimezone)
		const today = getTodayStrInTz(scheduleTimezone)

		const renderWeekdayHeader = (day: string) => (
			<div
				key={day}
				className="text-muted-foreground p-2 text-center text-xs font-medium"
			>
				{day}
			</div>
		)

		const renderCell = (cellDate: string | null, colIdx: number) => {
			if (!cellDate) {
				return <div key={`empty-${colIdx}`} className="p-2" />
			}

			const blocks = strategy.getBlocks(cellDate)
			const bookingBlocks = blocks.filter((b) => b.blockType === 'booking')
			const isToday = cellDate === today
			const dayNum = parseInt(cellDate.split('-')[2], 10)
			const handleClick = () => {
				if (onDayClick) {
					onDayClick(cellDate)
					return
				}
				onDateChange(cellDate)
				onViewChange('day')
			}

			const renderDot = (block: CalendarBlock) => (
				<div
					key={block.id}
					className="size-1.5 rounded-full"
					style={{
						backgroundColor:
							viewConfig.blockedTimeVisibility === 'grey'
								? 'var(--muted-foreground)'
								: block.color,
					}}
				/>
			)

			return (
				<button
					key={cellDate}
					type="button"
					onClick={handleClick}
					className={cn(
						'hover:bg-muted flex flex-col items-center rounded-md p-2 text-sm transition-colors',
						isToday && 'bg-primary/10 font-bold',
					)}
				>
					<span
						className={cn(
							isToday &&
								'bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full',
						)}
					>
						{dayNum}
					</span>
					{bookingBlocks.length > 0 &&
						viewConfig.blockedTimeVisibility !== 'hidden' && (
							<div className="mt-1 flex gap-0.5">
								{bookingBlocks.map(renderDot)}
							</div>
						)}
				</button>
			)
		}

		const renderRow = (row: (string | null)[], rowIdx: number) => (
			<div key={rowIdx} className="grid grid-cols-7">
				{row.map(renderCell)}
			</div>
		)

		return (
			<div className="flex flex-col gap-1">
				<div className="grid grid-cols-7">
					{calendarLocale.daysShort.map(renderWeekdayHeader)}
				</div>
				{grid.map(renderRow)}
			</div>
		)
	}

	const sidebarWithSheetClose = (
		<div onClick={() => setSheetOpen(false)}>{strategy.renderSidebar()}</div>
	)

	return (
		<div className="flex flex-col">
			{profileInfo && <ProfileInfoBlock {...profileInfo} />}
			<div className="flex flex-1 flex-col lg:flex-row">
				{!hideSidebar && view !== 'list' && (
					<aside className="hidden w-[220px] shrink-0 flex-col border-r p-4 lg:flex">
						{strategy.renderSidebar()}
					</aside>
				)}

				<main className="min-w-0 flex-1 p-4">
					<div className="flex flex-col gap-4">
						<div className="flex flex-wrap items-center justify-between gap-2">
							{view !== 'list' && (
								<div className="flex items-center gap-1">
									{staffAvatarUrl && (
										<img
											src={staffAvatarUrl}
											alt=""
											className="size-8 rounded-full object-cover"
										/>
									)}
									<Button variant="ghost" size="icon-sm" onClick={handlePrev}>
										<ChevronLeftIcon />
									</Button>
									<h2 className="min-w-0 text-center text-sm font-semibold md:min-w-[140px] md:text-lg">
										{title}
									</h2>
									<Button variant="ghost" size="icon-sm" onClick={handleNext}>
										<ChevronRightIcon />
									</Button>
								</div>
							)}
							<div className="flex items-center gap-2">
								{publicUrl && (
									<Button
										variant="outline"
										size="sm"
										onClick={handleCopyPublicLink}
										className="hidden gap-1.5 md:flex"
									>
										{linkCopied ? (
											<CheckIcon className="size-4" />
										) : (
											<LinkIcon className="size-4" />
										)}
										{t('copyPublicLink')}
									</Button>
								)}
								{viewConfig.allowListView && (
									<div className="flex gap-1 rounded-md border p-0.5">
										<Button
											variant={view !== 'list' ? 'default' : 'ghost'}
											size="xs"
											onClick={() => onViewChange(lastCalendarView)}
										>
											{t('calendarView')}
										</Button>
										<Button
											variant={view === 'list' ? 'default' : 'ghost'}
											size="xs"
											onClick={() => onViewChange('list')}
										>
											{t('listView')}
										</Button>
									</div>
								)}
								{view !== 'list' && (
									<div className="flex gap-1">
										{VIEW_OPTIONS.map(renderViewOption)}
									</div>
								)}
							</div>
						</div>

						{!hideSidebar && view !== 'list' && (
							<div className="lg:hidden">
								{strategy.renderMobileSidebar?.() ?? strategy.renderSidebar()}
							</div>
						)}

						{staffTabsSlot}

						{view === 'list' && listViewSlot}
						{view === 'day' && renderDayView()}
						{view === 'week' && renderWeekView()}
						{view === 'month' && renderMonthView()}
					</div>
				</main>

				<aside className="w-full min-w-0 shrink-0 border-t p-4 lg:w-[280px] lg:border-t-0 lg:border-l">
					{strategy.renderPanel()}
				</aside>

				{!hideSidebar && (
					<>
						<Button
							variant="outline"
							size="icon"
							className="fixed bottom-4 left-4 z-50 shadow-lg lg:hidden"
							onClick={handleOpenSheet}
						>
							<MenuIcon />
						</Button>

						<Sheet open={sheetOpen} onOpenChange={handleSheetChange}>
							<SheetContent side="bottom">
								<SheetHeader>
									<SheetTitle>{t('servicesAndMode')}</SheetTitle>
								</SheetHeader>
								<div className="p-4">{sidebarWithSheetClose}</div>
							</SheetContent>
						</Sheet>
					</>
				)}
			</div>
		</div>
	)
}

export { CalendarCore }
