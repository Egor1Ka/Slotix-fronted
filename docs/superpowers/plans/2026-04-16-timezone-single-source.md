# Timezone Single Source of Truth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate timezone duplication — org schedules use `Organization.timezone`, personal schedules use `ScheduleTemplate.timezone`. One source of truth, no sync needed.

**Architecture:** New `resolveScheduleTimezone()` function on backend resolves timezone from org or template. DTO injects resolved timezone into API response. Frontend reads `schedule.timezone` as before — transparent change. Schema makes timezone optional. Migration removes timezone from existing org templates.

**Tech Stack:** Node.js, MongoDB/Mongoose, Next.js/React/TypeScript

---

### Task 1: Backend — `resolveScheduleTimezone` helper

**Files:**
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/shared/utils/timezone.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/__tests__/timezone.test.js`

- [ ] **Step 1: Write tests for resolveScheduleTimezone**

Add to `/Users/egorzozula/Desktop/BackendTemplate/src/__tests__/timezone.test.js`:

```js
test("resolveScheduleTimezone: org template uses org timezone", async () => {
  const template = { timezone: null, orgId: "org1" };
  const getOrgTz = async (orgId) => orgId === "org1" ? "Europe/Kyiv" : null;
  const result = await resolveScheduleTimezone(template, getOrgTz);
  assert.equal(result, "Europe/Kyiv");
});

test("resolveScheduleTimezone: personal template uses template timezone", async () => {
  const template = { timezone: "America/New_York", orgId: null };
  const getOrgTz = async () => null;
  const result = await resolveScheduleTimezone(template, getOrgTz);
  assert.equal(result, "America/New_York");
});

test("resolveScheduleTimezone: fallback to UTC when org has no timezone", async () => {
  const template = { timezone: null, orgId: "org1" };
  const getOrgTz = async () => null;
  const result = await resolveScheduleTimezone(template, getOrgTz);
  assert.equal(result, "UTC");
});

test("resolveScheduleTimezone: personal template without timezone falls back to UTC", async () => {
  const template = { timezone: null, orgId: null };
  const getOrgTz = async () => null;
  const result = await resolveScheduleTimezone(template, getOrgTz);
  assert.equal(result, "UTC");
});
```

Add `resolveScheduleTimezone` to import at top of test file.

- [ ] **Step 2: Run tests to see them fail**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate && node --test src/__tests__/timezone.test.js
```

- [ ] **Step 3: Implement resolveScheduleTimezone**

Add to `/Users/egorzozula/Desktop/BackendTemplate/src/shared/utils/timezone.js` before the `export` block:

```js
const resolveScheduleTimezone = async (template, getOrgTimezone) => {
  if (template.orgId) {
    const orgTz = await getOrgTimezone(template.orgId);
    return orgTz || "UTC";
  }
  return template.timezone || "UTC";
};
```

Add `resolveScheduleTimezone` to the export statement.

- [ ] **Step 4: Run tests to verify pass**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate && node --test src/__tests__/timezone.test.js
```

- [ ] **Step 5: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/shared/utils/timezone.js src/__tests__/timezone.test.js
git commit -m "feat(timezone): resolveScheduleTimezone — резолвер из org или template"
```

---

### Task 2: Backend — ScheduleTemplate schema: timezone optional

**Files:**
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/models/ScheduleTemplate.js:104`

- [ ] **Step 1: Change timezone from required to optional**

In `/Users/egorzozula/Desktop/BackendTemplate/src/models/ScheduleTemplate.js`, change line 104:

From:
```js
timezone: { type: String, required: true },
```

To:
```js
timezone: { type: String, required: false, default: null },
```

Update the JSDoc comment above (lines 98-103):

From:
```js
/**
 * IANA timezone специалиста для ЭТОЙ точки/орг.
 * Хранится здесь (не в users) — специалист может работать
 * в Киеве и Берлине с разными timezone.
 * Все HH:MM в weeklyHours интерпретируются в этой timezone.
 */
```

To:
```js
/**
 * IANA timezone для ЛИЧНОГО расписания (orgId === null).
 * Для орг-расписаний timezone берётся из Organization.timezone.
 * Все HH:MM в weeklyHours интерпретируются в resolved timezone.
 */
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/models/ScheduleTemplate.js
git commit -m "refactor(schema): ScheduleTemplate.timezone теперь optional"
```

---

### Task 3: Backend — Schedule DTO resolves timezone from org

**Files:**
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/dto/scheduleDto.js`

- [ ] **Step 1: Add org timezone resolution to DTO**

Replace the entire file `/Users/egorzozula/Desktop/BackendTemplate/src/dto/scheduleDto.js`:

```js
import { getRawOrgById } from "../repository/organizationRepository.js";

const toTimeSlotDto = (slot) => ({
  start: slot.start,
  end: slot.end,
});

const toWeeklyHoursDto = (entry) => ({
  day: entry.day,
  enabled: entry.enabled,
  slots: entry.slots.map(toTimeSlotDto),
});

const resolveTimezoneForDto = async (doc) => {
  if (doc.orgId) {
    const org = await getRawOrgById(doc.orgId);
    return org?.timezone ?? "UTC";
  }
  return doc.timezone ?? "UTC";
};

const toScheduleTemplateDto = async (doc) => ({
  id: doc._id.toString(),
  staffId: doc.staffId.toString(),
  orgId: doc.orgId ? doc.orgId.toString() : null,
  locationId: doc.locationId ? doc.locationId.toString() : null,
  validFrom: doc.validFrom,
  validTo: doc.validTo,
  timezone: await resolveTimezoneForDto(doc),
  slotMode: doc.slotMode,
  slotStepMin: doc.slotStepMin,
  weeklyHours: doc.weeklyHours.map(toWeeklyHoursDto),
});

const toScheduleOverrideDto = (doc) => ({
  id: doc._id.toString(),
  staffId: doc.staffId.toString(),
  orgId: doc.orgId ? doc.orgId.toString() : null,
  locationId: doc.locationId ? doc.locationId.toString() : null,
  date: doc.date,
  enabled: doc.enabled,
  slots: doc.slots.map(toTimeSlotDto),
  reason: doc.reason,
});

export { toScheduleTemplateDto, toScheduleOverrideDto };
```

**IMPORTANT:** `toScheduleTemplateDto` is now `async`. All callers must `await` it.

- [ ] **Step 2: Update callers in repository to await DTO**

In `/Users/egorzozula/Desktop/BackendTemplate/src/repository/scheduleTemplateRepository.js`, find all calls to `toScheduleTemplateDto` and add `await`. The key functions:

- `findActiveTemplateDto`: change `return toScheduleTemplateDto(doc)` → `return await toScheduleTemplateDto(doc)`
- `findActiveTemplatesByOrg`: change `return templates.map(toScheduleTemplateDto)` → `return Promise.all(templates.map(toScheduleTemplateDto))`
- Any other function that calls `toScheduleTemplateDto`

- [ ] **Step 3: Verify no runtime errors**

Start the backend server and hit `GET /schedule/template?staffId=...` to check response still includes `timezone`.

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/dto/scheduleDto.js src/repository/scheduleTemplateRepository.js
git commit -m "feat(dto): schedule DTO резолвит timezone из org для орг-расписаний"
```

---

### Task 4: Backend — Services use resolveScheduleTimezone

**Files:**
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/services/slotServices.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/services/bookingServices.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/services/scheduleServices.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/services/notificationServices.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/controllers/bookingController.js`

- [ ] **Step 1: Create a shared org timezone getter**

Add a helper in `/Users/egorzozula/Desktop/BackendTemplate/src/shared/utils/timezone.js`:

```js
import { getRawOrgById } from "../../repository/organizationRepository.js";

const getOrgTimezone = async (orgId) => {
  if (!orgId) return null;
  const org = await getRawOrgById(orgId);
  return org?.timezone ?? null;
};
```

Add `getOrgTimezone` to the export. This avoids each service importing org repository directly.

- [ ] **Step 2: Update slotServices.js**

In `/Users/egorzozula/Desktop/BackendTemplate/src/services/slotServices.js`, add import:
```js
import { resolveScheduleTimezone, getOrgTimezone } from "../shared/utils/timezone.js";
```

At the top of `getSlotsForDate` (around line 81), after `const template = await findActiveTemplate(...)`:
```js
const timezone = await resolveScheduleTimezone(template, getOrgTimezone);
```

Then replace ALL occurrences of `template.timezone` with `timezone` in this function:
- Line 17: `getTimezoneOffsetMin(effectiveStart, template.timezone)` → pass timezone as parameter to `toBookingSlot`
- Line 90: `getDayOfWeekInTz(date, template.timezone)` → `getDayOfWeekInTz(date, timezone)`
- Line 103: `getDateRange(date, template.timezone)` → `getDateRange(date, timezone)`
- Line 123: `getNowMin(date, template.timezone)` → `getNowMin(date, timezone)`

For `toBookingSlot`, add a `timezone` parameter instead of reading `template.timezone`:
```js
const toBookingSlot = (timezone, bufferAfter, booking, dateStart, dateEnd) => {
  const effectiveStart = booking.startAt < dateStart ? dateStart : booking.startAt;
  const effectiveEnd = booking.endAt > dateEnd ? dateEnd : booking.endAt;
  const tzOffset = getTimezoneOffsetMin(effectiveStart, timezone);
  const startMin =
    effectiveStart.getUTCHours() * 60 + effectiveStart.getUTCMinutes() + tzOffset;
  const durationMs = effectiveEnd.getTime() - effectiveStart.getTime();
  const duration = Math.round(durationMs / 60000) + bufferAfter;
  return { startMin, duration };
};
```

Update the call: `const toBooking = (b) => toBookingSlot(timezone, bufferAfter, b, dateStart, dateEnd);`

- [ ] **Step 3: Update bookingServices.js**

In `/Users/egorzozula/Desktop/BackendTemplate/src/services/bookingServices.js`, add import:
```js
import { resolveScheduleTimezone, getOrgTimezone } from "../shared/utils/timezone.js";
```

In `createBooking` (line 48), change:
```js
const gridTimezone = template.timezone;
```
To:
```js
const gridTimezone = await resolveScheduleTimezone(template, getOrgTimezone);
```

In `rescheduleBookingById` (line 178), do the same:
```js
const gridTimezone = await resolveScheduleTimezone(template, getOrgTimezone);
```

- [ ] **Step 4: Update scheduleServices.js**

In `/Users/egorzozula/Desktop/BackendTemplate/src/services/scheduleServices.js`:

**`resolveStaffTimezone`** (line 21-30) — simplify using the resolver:
```js
import { resolveScheduleTimezone, getOrgTimezone } from "../shared/utils/timezone.js";

const resolveStaffTimezone = async ({ staffId, orgId = null, locationId = null }) => {
  const now = new Date();
  const template = await findActiveTemplateDto(staffId, orgId, locationId, now);
  if (!template) {
    if (orgId) {
      const orgTz = await getOrgTimezone(orgId);
      return orgTz ?? null;
    }
    return null;
  }
  return await resolveScheduleTimezone(template, getOrgTimezone);
};
```

**`createDefaultSchedule`** (line 39-64) — for org schedules, don't write timezone:
```js
const createDefaultSchedule = async (staffId, orgId = null, timezone = null) => {
  const resolvedTz = orgId
    ? await getOrgTimezone(orgId)
    : timezone;
  if (!resolvedTz || !isValidTimezone(resolvedTz)) {
    throw new Error("timezone_required");
  }

  const existing = await findCurrentTemplate(staffId, orgId, null);
  if (existing) return null;

  const todayStr = todayInTz(resolvedTz);
  const todayUtc = parseWallClockToUtc(`${todayStr}T00:00:00`, resolvedTz);

  const template = await createTemplate({
    staffId,
    orgId,
    locationId: null,
    validFrom: todayUtc,
    validTo: null,
    timezone: orgId ? null : resolvedTz,
    slotMode: DEFAULT_SLOT_MODE,
    slotStepMin: DEFAULT_SLOT_STEP_MIN,
    weeklyHours: DEFAULT_WEEKLY_HOURS,
  });

  return template;
};
```

**`rotateTemplate`** (line 66-94) — for org schedules, resolve timezone from org, don't require it in params:
```js
const rotateTemplate = async ({ staffId, orgId, locationId, weeklyHours, slotMode, slotStepMin, timezone }) => {
  const resolvedTimezone = orgId
    ? await getOrgTimezone(orgId)
    : timezone;
  if (!resolvedTimezone || !isValidTimezone(resolvedTimezone)) {
    throw new Error("timezone_required");
  }
  const todayStr = todayInTz(resolvedTimezone);
  const todayUtc = parseWallClockToUtc(`${todayStr}T00:00:00`, resolvedTimezone);
  const yesterdayStr = addDaysToDateStr(todayStr, -1);
  const yesterdayUtc = parseWallClockToUtc(`${yesterdayStr}T00:00:00`, resolvedTimezone);

  const current = await findCurrentTemplate(staffId, orgId, locationId);
  if (current) {
    await updateTemplateValidTo(current._id, yesterdayUtc);
  }

  const newTemplate = await createTemplate({
    staffId,
    orgId: orgId || null,
    locationId: locationId || null,
    validFrom: todayUtc,
    validTo: null,
    timezone: orgId ? null : resolvedTimezone,
    slotMode: slotMode || "fixed",
    slotStepMin: slotStepMin ?? 30,
    weeklyHours,
  });

  return newTemplate;
};
```

- [ ] **Step 5: Update scheduleController.js**

In `/Users/egorzozula/Desktop/BackendTemplate/src/controllers/scheduleController.js`, make timezone conditionally required:

Change `putTemplateSchema` (line 37-43):
```js
const putTemplateSchema = {
  staffId: { type: "string", required: true },
  weeklyHours: { type: "array", required: true, items: { type: "object", properties: weeklyHourItemSchema } },
  slotMode: { type: "string", required: false },
  slotStepMin: { type: "number", required: false },
  timezone: { type: "string", required: false },
};
```

In `handlePutTemplate` (line 45+), change the timezone validation to only apply for personal schedules:
```js
const { staffId, orgId } = req.body;

// Timezone required only for personal schedules
if (!orgId && !req.body.timezone) {
  return httpResponse(res, generalStatus.BAD_REQUEST, { errors: { timezone: "required for personal schedules" } });
}
if (req.body.timezone && !isValidTimezone(req.body.timezone)) {
  return httpResponse(res, generalStatus.BAD_REQUEST, { errors: { timezone: "invalid IANA timezone" } });
}
```

- [ ] **Step 6: Update notificationServices.js — already done in previous commit**

The Telegram fallback already uses `leadTemplate?.timezone ?? orgTz ?? "UTC"`. But `leadTemplate.timezone` will now be null for org templates. The `orgTz` fallback catches this correctly. No changes needed.

- [ ] **Step 7: Fix telegramMessageFormatter.js fallback**

In `/Users/egorzozula/Desktop/BackendTemplate/src/services/telegramMessageFormatter.js` line 15:

Change:
```js
timeZone: timezone || "Europe/Kyiv",
```
To:
```js
timeZone: timezone || "UTC",
```

- [ ] **Step 8: Run all backend tests**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate && node --test src/__tests__/timezone.test.js
```

- [ ] **Step 9: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/services/slotServices.js src/services/bookingServices.js src/services/scheduleServices.js src/controllers/scheduleController.js src/services/telegramMessageFormatter.js src/shared/utils/timezone.js
git commit -m "refactor(timezone): все сервисы используют resolveScheduleTimezone"
```

---

### Task 5: Backend — Migration script

**Files:**
- Create: `/Users/egorzozula/Desktop/BackendTemplate/src/scripts/migrate-timezone-single-source.js`

- [ ] **Step 1: Create migration script**

```js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.DB_URL);
  console.log("Connected to MongoDB");

  const result = await mongoose.connection.db.collection("scheduletemplates").updateMany(
    { orgId: { $ne: null } },
    { $unset: { timezone: "" } }
  );

  console.log(`Updated ${result.modifiedCount} org schedule templates (removed timezone field)`);

  const remaining = await mongoose.connection.db.collection("scheduletemplates").countDocuments({
    orgId: { $ne: null },
    timezone: { $exists: true },
  });
  console.log(`Remaining org templates with timezone: ${remaining} (should be 0)`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate && node src/scripts/migrate-timezone-single-source.js
```

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/scripts/migrate-timezone-single-source.js
git commit -m "chore(migration): удалить timezone из орг-расписаний"
```

---

### Task 6: Frontend — Hide TimezoneSelector for org schedules

**Files:**
- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/components/staff-schedule/ScheduleViewTab.tsx`

- [ ] **Step 1: Conditionally render TimezoneSelector**

In `ScheduleViewTab.tsx`, replace the TimezoneSelector block (lines 240-246):

From:
```tsx
<div className={cn(savingMode && 'pointer-events-none opacity-50')}>
	<TimezoneSelector
		value={localTimezone}
		onChange={handleTimezoneChange}
		label={t('timezone')}
	/>
</div>
```

To:
```tsx
{orgId ? (
	<div className="text-muted-foreground text-sm">
		{t('timezoneFromOrg')}: <span className="font-medium">{localTimezone}</span>
	</div>
) : (
	<div className={cn(savingMode && 'pointer-events-none opacity-50')}>
		<TimezoneSelector
			value={localTimezone}
			onChange={handleTimezoneChange}
			label={t('timezone')}
		/>
	</div>
)}
```

- [ ] **Step 2: Add translation key**

Add `"timezoneFromOrg"` to the `staffSchedule` translations in both `i18n/messages/en.json` and `i18n/messages/uk.json`:

**en.json** (inside `staffSchedule` object):
```json
"timezoneFromOrg": "Timezone is set by the organization"
```

**uk.json** (inside `staffSchedule` object):
```json
"timezoneFromOrg": "Часовий пояс визначається організацією"
```

- [ ] **Step 3: Verify in browser**

Open org staff schedule page — should show text instead of selector.
Open personal schedule page — should still show selector.

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/staff-schedule/ScheduleViewTab.tsx i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat(schedule): скрыть TimezoneSelector для орг-расписаний"
```

---

### Task 7: Update Timezone Contract in both CLAUDE.md

**Files:**
- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/CLAUDE.md`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/CLAUDE.md`

- [ ] **Step 1: Update Slotix CLAUDE.md Timezone Contract**

Replace the `### Timezone Priority` section:

From:
```markdown
### Timezone Priority (highest → lowest)
1. **`ScheduleTemplate.timezone`** — single source of truth for slot grid, booking creation, display
2. **`Organization.timezone`** — default for new schedules; NOT used in runtime slot/booking logic
3. **`"UTC"`** — last-resort fallback; never hardcode a specific city (no `"Europe/Kyiv"`)
```

To:
```markdown
### Timezone Priority
1. **Org schedule** → `Organization.timezone` (single source, `ScheduleTemplate.timezone` is `null`)
2. **Personal schedule** → `ScheduleTemplate.timezone`
3. **Fallback** → `"UTC"` (never hardcode a specific city)

`ScheduleTemplate.timezone` exists ONLY for personal schedules (`orgId === null`).
For org schedules, the field is absent — timezone is resolved from `Organization`.
Backend `resolveScheduleTimezone()` handles this transparently.
```

- [ ] **Step 2: Update BackendTemplate CLAUDE.md Timezone Contract**

Replace the `### Timezone Priority` section with the same content as above, plus:

```markdown
### Resolver
All services use `resolveScheduleTimezone(template, getOrgTimezone)` from `src/shared/utils/timezone.js`.
Never read `template.timezone` directly — always go through the resolver.
```

- [ ] **Step 3: Commit both repos**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add CLAUDE.md
git commit -m "docs: обновить Timezone Contract — single source of truth"

cd /Users/egorzozula/Desktop/BackendTemplate
git add CLAUDE.md
git commit -m "docs: обновить Timezone Contract — single source of truth"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run backend tests**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate && node --test src/__tests__/timezone.test.js
```

Expected: all tests pass.

- [ ] **Step 2: Run frontend lint + TypeScript check**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted && npx tsc --noEmit 2>&1 | grep -E "(ScheduleViewTab|BookingsTab)" | head -5
```

Expected: no errors in our files.

- [ ] **Step 3: Manual smoke test**

1. Start backend + frontend
2. Open org staff schedule — verify TimezoneSelector is hidden, timezone text is shown
3. Change org timezone in org settings — verify staff schedule shows updated timezone
4. Open personal schedule — verify TimezoneSelector still works
5. Book a slot in org calendar — verify booking creates with correct timezone
6. Book a slot in personal calendar — verify booking creates with correct timezone
