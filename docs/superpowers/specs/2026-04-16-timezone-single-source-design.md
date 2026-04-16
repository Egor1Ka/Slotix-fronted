# Timezone Single Source of Truth — Design Spec

## Goal

Eliminate timezone duplication: org schedules use `Organization.timezone` as the single source of truth. `ScheduleTemplate.timezone` exists only for personal schedules (`orgId === null`).

## Current State

- `ScheduleTemplate.timezone` — required field on every template (org and personal)
- `Organization.timezone` — required field on org
- For org schedules, timezone is duplicated: stored on both org and template
- Changing org timezone does not update staff schedule timezones — silent inconsistency

## Target State

- `ScheduleTemplate.timezone` — exists only on personal templates (`orgId === null`)
- `Organization.timezone` — single source for all org schedules
- New backend resolver function determines timezone based on context
- Frontend reads `schedule.timezone` from API response as before — backend resolves it

## Architecture

### Backend Resolver

One function `resolveScheduleTimezone(template, orgId)`:
- If `orgId` → fetch `Organization.timezone`
- If no `orgId` → use `template.timezone`
- Fallback → `"UTC"`

All services call this resolver instead of reading `template.timezone` directly.

### Schema Changes

`ScheduleTemplate.timezone`:
- Change from `required: true` to `required: false`
- Validation in service layer: personal schedules must have timezone, org schedules must not

### API Changes

**Schedule DTO** (`scheduleDto.js`):
- Always return `timezone` field in response
- For org templates: resolve from `Organization.timezone`
- For personal templates: use `template.timezone`

**PUT /schedule/template**:
- When `orgId` present: ignore `timezone` param, don't write to template
- When no `orgId`: `timezone` is required, write to template as before

### Frontend Changes

**ScheduleViewTab**:
- When `orgId` is set: hide TimezoneSelector, show info text "Timezone определяется организацией"
- When no `orgId` (personal): show TimezoneSelector as before

**No changes needed in:**
- Calendar strategies (read `schedule.timezone` from API)
- Booking actions (read `schedule.timezone` from API)
- BookingsTab, OverridesTab (read timezone from API)
- All other consumers — backend resolves timezone transparently

### Migration

```js
db.scheduletemplates.updateMany(
  { orgId: { $ne: null } },
  { $unset: { timezone: "" } }
)
```

### Affected Backend Files

| File | Change |
|------|--------|
| `src/shared/utils/timezone.js` | Add `resolveScheduleTimezone()` |
| `src/models/ScheduleTemplate.js` | `timezone: required: false` |
| `src/dto/scheduleDto.js` | Resolve timezone from org or template |
| `src/services/scheduleServices.js` | Use resolver in create/rotate |
| `src/services/slotServices.js` | Use resolver instead of `template.timezone` |
| `src/services/bookingServices.js` | Use resolver for `gridTimezone` |
| `src/services/notificationServices.js` | Use resolver for Telegram tz |
| `src/controllers/scheduleController.js` | Conditional timezone validation |
| `src/controllers/bookingController.js` | Use resolver for date range parsing |
| `src/services/telegramMessageFormatter.js` | Remove hardcoded `"Europe/Kyiv"` fallback |
| `src/scripts/seed.js` | Remove timezone from org template seeds |

### Affected Frontend Files

| File | Change |
|------|--------|
| `components/staff-schedule/ScheduleViewTab.tsx` | Hide TimezoneSelector for org schedules |

### CLAUDE.md Updates

Both repos: update Timezone Contract to reflect new priority:
```
1. Org schedule → Organization.timezone (single source)
2. Personal schedule → ScheduleTemplate.timezone
3. Fallback → "UTC"

ScheduleTemplate.timezone exists ONLY for personal schedules (orgId === null).
```
