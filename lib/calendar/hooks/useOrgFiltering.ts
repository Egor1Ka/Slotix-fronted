'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { eventTypeApi } from '@/lib/booking-api-client'
import type {
	EventType,
	OrgStaffMember,
} from '@/services/configs/booking.types'

interface UseOrgFilteringProps {
	orgId: string
	allStaff: OrgStaffMember[]
	selectedStaffId: string | null
	selectedEventTypeId: string | null
	workingStaffIds: string[]
	onStaffAutoSelect: (staffId: string) => void
}

interface UseOrgFilteringResult {
	filteredStaff: OrgStaffMember[]
	filteredEventTypes: EventType[]
	staffEventTypes: EventType[]
	loading: boolean
}

// Проверяет, совпадает ли ID сотрудника с выбранным
const matchesStaffId =
	(selectedId: string) =>
	(staff: OrgStaffMember): boolean =>
		staff.id === selectedId

// Проверяет, есть ли сотрудник в списке допустимых для услуги
const isStaffAllowed =
	(allowedStaff: OrgStaffMember[]) =>
	(staff: OrgStaffMember): boolean =>
		allowedStaff.some(matchesStaffId(staff.id))

// Проверяет, есть ли услуга в наборе допустимых ID (пересечение с org-услугами)
const isInOrgSet =
	(orgIds: Set<string>) =>
	(eventType: EventType): boolean =>
		orgIds.has(eventType.id)

// Строит ключ из массива ID для сравнения (отсортированный)
const buildStaffKey = (ids: string[]): string => [...ids].sort().join(',')

const useOrgFiltering = ({
	orgId,
	allStaff,
	selectedStaffId,
	selectedEventTypeId,
	workingStaffIds,
	onStaffAutoSelect,
}: UseOrgFilteringProps): UseOrgFilteringResult => {
	// Все услуги организации (загружаются один раз)
	const [allOrgEventTypes, setAllOrgEventTypes] = useState<EventType[]>([])
	// Услуги текущего выбранного сотрудника (уже отфильтрованные от solo)
	const [staffEventTypes, setStaffEventTypes] = useState<EventType[]>([])
	// Сотрудники для текущей выбранной услуги
	const [eventTypeStaff, setEventTypeStaff] = useState<OrgStaffMember[] | null>(
		null,
	)
	// ID услуг, доступных у работающих сегодня сотрудников
	const [workingStaffEventTypeIds, setWorkingStaffEventTypeIds] =
		useState<Set<string> | null>(null)
	const [loading, setLoading] = useState(false)
	const lastStaffIdRef = useRef<string | null>(null)
	const lastEventTypeIdRef = useRef<string | null>(null)
	const lastOrgIdRef = useRef<string | null>(null)
	const lastWorkingStaffKeyRef = useRef<string | null>(null)
	const onStaffAutoSelectRef = useRef(onStaffAutoSelect)
	onStaffAutoSelectRef.current = onStaffAutoSelect

	// Загружаем все услуги организации при монтировании / смене orgId
	useEffect(() => {
		if (!orgId) return
		if (lastOrgIdRef.current === orgId) return
		lastOrgIdRef.current = orgId

		const loadOrgEventTypes = async () => {
			try {
				const types = await eventTypeApi.getByOrg(orgId)
				setAllOrgEventTypes(types)
			} catch {
				setAllOrgEventTypes([])
			}
		}

		loadOrgEventTypes()
	}, [orgId])

	// Сбрасываем кеш staffId при загрузке org-услуг — чтобы пересечение пересчиталось
	useEffect(() => {
		if (allOrgEventTypes.length > 0) {
			lastStaffIdRef.current = null
		}
	}, [allOrgEventTypes])

	// Загружаем услуги при смене сотрудника, фильтруем solo-услуги
	useEffect(() => {
		if (!selectedStaffId || allOrgEventTypes.length === 0) {
			if (!selectedStaffId) setStaffEventTypes([])
			return
		}

		if (lastStaffIdRef.current === selectedStaffId) return
		lastStaffIdRef.current = selectedStaffId

		const loadEventTypes = async () => {
			try {
				const types = await eventTypeApi.getByStaff(selectedStaffId)
				// Пересечение с org-услугами — убираем solo-услуги сотрудника
				const orgIds = new Set(allOrgEventTypes.map((et) => et.id))
				const orgOnly = types.filter(isInOrgSet(orgIds))
				setStaffEventTypes(orgOnly)
			} catch {
				setStaffEventTypes([])
			}
		}

		loadEventTypes()
	}, [selectedStaffId, allOrgEventTypes])

	// Загружаем сотрудников при смене услуги
	useEffect(() => {
		if (!selectedEventTypeId) {
			setEventTypeStaff(null)
			lastEventTypeIdRef.current = null
			return
		}

		if (lastEventTypeIdRef.current === selectedEventTypeId) return
		lastEventTypeIdRef.current = selectedEventTypeId

		const loadStaff = async () => {
			setLoading(true)
			try {
				const staff =
					await eventTypeApi.getStaffForEventType(selectedEventTypeId)
				setEventTypeStaff(staff)

				// Если текущий сотрудник не может выполнять эту услугу — автовыбор первого
				// Если никто не выбран (null) — не форсируем выбор
				if (selectedStaffId) {
					const currentStaffCanPerform = staff.some(
						matchesStaffId(selectedStaffId),
					)
					if (!currentStaffCanPerform && staff.length > 0) {
						onStaffAutoSelectRef.current(staff[0].id)
					}
				}
			} catch {
				setEventTypeStaff(null)
			} finally {
				setLoading(false)
			}
		}

		loadStaff()
	}, [selectedEventTypeId, selectedStaffId])

	// Загружаем услуги всех работающих сегодня сотрудников (когда никто конкретный не выбран)
	useEffect(() => {
		if (allOrgEventTypes.length === 0 || workingStaffIds.length === 0) {
			setWorkingStaffEventTypeIds(null)
			lastWorkingStaffKeyRef.current = null
			return
		}

		const currentKey = buildStaffKey(workingStaffIds)
		if (lastWorkingStaffKeyRef.current === currentKey) return
		lastWorkingStaffKeyRef.current = currentKey

		const loadWorkingStaffEventTypes = async () => {
			try {
				const fetchStaffEventTypes = (staffId: string) =>
					eventTypeApi.getByStaff(staffId)

				const allTypesArrays = await Promise.all(
					workingStaffIds.map(fetchStaffEventTypes),
				)

				const orgIds = new Set(allOrgEventTypes.map((et) => et.id))
				const collectId = (
					acc: Set<string>,
					types: EventType[],
				): Set<string> => {
					const addOrgType = (et: EventType) => {
						if (orgIds.has(et.id)) acc.add(et.id)
					}
					types.forEach(addOrgType)
					return acc
				}

				const availableIds = allTypesArrays.reduce(collectId, new Set<string>())
				setWorkingStaffEventTypeIds(availableIds)
			} catch {
				setWorkingStaffEventTypeIds(null)
			}
		}

		loadWorkingStaffEventTypes()
	}, [workingStaffIds, allOrgEventTypes])

	// Фильтрация сотрудников: если выбрана услуга — только подходящие
	const filteredStaff = useMemo(
		() =>
			eventTypeStaff
				? allStaff.filter(isStaffAllowed(eventTypeStaff))
				: allStaff,
		[eventTypeStaff, allStaff],
	)

	// Фильтрация услуг: если выбран сотрудник — его org-услуги,
	// иначе — только те org-услуги, которые может выполнить хотя бы один работающий сотрудник
	// Услуги с staffPolicy === 'any' доступны всем сотрудникам — не фильтруем их
	const isAvailableToday = (et: EventType): boolean =>
		et.staffPolicy === 'any' ||
		!workingStaffEventTypeIds ||
		workingStaffEventTypeIds.has(et.id)

	const filteredEventTypes = useMemo(
		() =>
			selectedStaffId
				? staffEventTypes
				: allOrgEventTypes.filter(isAvailableToday),
		[
			selectedStaffId,
			staffEventTypes,
			allOrgEventTypes,
			workingStaffEventTypeIds,
		],
	)

	return {
		filteredStaff,
		filteredEventTypes,
		staffEventTypes,
		loading,
	}
}

export type { UseOrgFilteringResult }
export { useOrgFiltering }
