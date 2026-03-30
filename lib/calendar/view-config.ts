interface CalendarViewConfig {
	blockedTimeVisibility: 'hidden' | 'grey' | 'full'
	columnHeader: 'date' | 'staff'
	showStaffTabs: boolean
	staffTabBehavior: 'select-one' | 'show-all'
	onEmptyCellClick: 'open-booking-flow' | 'none'
	onBlockClick: 'open-booking-details' | 'none'
	canBookForClient: boolean
	filterByStaffCapability: boolean
	showScheduleEditor: boolean
}

const ORG_PUBLIC_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'grey',
	columnHeader: 'staff',
	showStaffTabs: true,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'none',
	canBookForClient: true,
	filterByStaffCapability: true,
	showScheduleEditor: false,
}

const ORG_ADMIN_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'full',
	columnHeader: 'staff',
	showStaffTabs: true,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'open-booking-details',
	canBookForClient: true,
	filterByStaffCapability: true,
	showScheduleEditor: true,
}

const STAFF_PUBLIC_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'grey',
	columnHeader: 'date',
	showStaffTabs: false,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'none',
	canBookForClient: true,
	filterByStaffCapability: false,
	showScheduleEditor: false,
}

const STAFF_SELF_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'full',
	columnHeader: 'date',
	showStaffTabs: false,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'open-booking-details',
	canBookForClient: true,
	filterByStaffCapability: false,
	showScheduleEditor: false,
}

export {
	ORG_PUBLIC_CONFIG,
	ORG_ADMIN_CONFIG,
	STAFF_PUBLIC_CONFIG,
	STAFF_SELF_CONFIG,
}
export type { CalendarViewConfig }
