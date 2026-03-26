interface CalendarViewConfig {
	blockedTimeVisibility: 'hidden' | 'grey' | 'full'
	columnHeader: 'date' | 'staff'
	showStaffTabs: boolean
	staffTabBehavior: 'select-one' | 'show-all'
	onEmptyCellClick: 'open-booking-flow' | 'none'
	onBlockClick: 'open-booking-details' | 'none'
	canBookForClient: boolean
}

const ORG_PUBLIC_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'grey',
	columnHeader: 'staff',
	showStaffTabs: true,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'none',
	canBookForClient: false,
}

const ORG_ADMIN_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'full',
	columnHeader: 'staff',
	showStaffTabs: true,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'open-booking-details',
	canBookForClient: true,
}

const STAFF_PUBLIC_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'grey',
	columnHeader: 'date',
	showStaffTabs: false,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'none',
	canBookForClient: false,
}

const STAFF_SELF_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'full',
	columnHeader: 'date',
	showStaffTabs: false,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'open-booking-details',
	canBookForClient: true,
}

export {
	ORG_PUBLIC_CONFIG,
	ORG_ADMIN_CONFIG,
	STAFF_PUBLIC_CONFIG,
	STAFF_SELF_CONFIG,
}
export type { CalendarViewConfig }
