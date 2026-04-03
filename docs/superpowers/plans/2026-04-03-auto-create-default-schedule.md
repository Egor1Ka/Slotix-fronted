# Автосоздание дефолтного расписания — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Автоматически создавать дефолтное расписание (пн-пт 09-18, сб 10-15) при регистрации юзера и при принятии приглашения / создании организации.

**Architecture:** Новая функция `createDefaultSchedule(staffId, orgId)` в `scheduleServices.js` + константа дефолта в `constants/schedule.js`. Вызывается из трёх точек: `findOrCreateUser`, `createOrganization`, `acceptInvitation`. Идемпотентна — проверяет существование перед созданием. Ошибки логируются, но не ломают основной флоу.

**Tech Stack:** Node.js, Mongoose, Express

**Codebase:** `/Users/egorzozula/Desktop/BackendTemplate`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/constants/schedule.js` | Константа дефолтного расписания |
| Modify | `src/services/scheduleServices.js:1-66` | Новая функция `createDefaultSchedule` |
| Modify | `src/modules/auth/services/authServices.js:43-56` | Вызов при регистрации |
| Modify | `src/services/orgServices.js:56-79` | Вызов при создании организации |
| Modify | `src/services/orgServices.js:113-117` | Вызов при принятии приглашения |

---

### Task 1: Константа дефолтного расписания

**Files:**
- Create: `src/constants/schedule.js`

- [ ] **Step 1: Создать файл константы**

```js
// src/constants/schedule.js

const DEFAULT_WEEKLY_HOURS = [
  { day: "mon", enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
  { day: "tue", enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
  { day: "wed", enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
  { day: "thu", enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
  { day: "fri", enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
  { day: "sat", enabled: true, slots: [{ start: "10:00", end: "15:00" }] },
  { day: "sun", enabled: false, slots: [] },
];

const DEFAULT_TIMEZONE = "Europe/Kyiv";
const DEFAULT_SLOT_MODE = "fixed";
const DEFAULT_SLOT_STEP_MIN = 30;

export {
  DEFAULT_WEEKLY_HOURS,
  DEFAULT_TIMEZONE,
  DEFAULT_SLOT_MODE,
  DEFAULT_SLOT_STEP_MIN,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/constants/schedule.js
git commit -m "feat: константа дефолтного расписания"
```

---

### Task 2: Функция `createDefaultSchedule` в scheduleServices

**Files:**
- Modify: `src/services/scheduleServices.js:1-66`

- [ ] **Step 1: Добавить импорты констант**

В начало файла `src/services/scheduleServices.js`, после существующих импортов (строка 2), добавить:

```js
import {
  DEFAULT_WEEKLY_HOURS,
  DEFAULT_TIMEZONE,
  DEFAULT_SLOT_MODE,
  DEFAULT_SLOT_STEP_MIN,
} from "../constants/schedule.js";
```

- [ ] **Step 2: Добавить функцию `createDefaultSchedule`**

Добавить после функции `getActiveTemplate` (после строки 12):

```js
const createDefaultSchedule = async (staffId, orgId = null) => {
  const existing = await findCurrentTemplate(staffId, orgId, null);
  if (existing) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const template = await createTemplate({
    staffId,
    orgId,
    locationId: null,
    validFrom: today,
    validTo: null,
    timezone: DEFAULT_TIMEZONE,
    slotMode: DEFAULT_SLOT_MODE,
    slotStepMin: DEFAULT_SLOT_STEP_MIN,
    weeklyHours: DEFAULT_WEEKLY_HOURS,
  });

  return template;
};
```

- [ ] **Step 3: Добавить в экспорт**

В строке экспорта (строка 66) добавить `createDefaultSchedule`:

```js
export {
  getActiveTemplate,
  createDefaultSchedule,
  rotateTemplate,
  upsertScheduleOverride,
  getOverridesByStaff,
  deleteOverride,
  getOverridesByOrg,
  getActiveTemplatesByOrg,
};
```

- [ ] **Step 4: Commit**

```bash
git add src/services/scheduleServices.js
git commit -m "feat: функция createDefaultSchedule в scheduleServices"
```

---

### Task 3: Вызов при регистрации (findOrCreateUser)

**Files:**
- Modify: `src/modules/auth/services/authServices.js:43-56`

- [ ] **Step 1: Добавить импорт**

В начало файла `src/modules/auth/services/authServices.js`, после существующих импортов (после строки 9), добавить:

```js
import { createDefaultSchedule } from "../../../services/scheduleServices.js";
```

- [ ] **Step 2: Вызвать createDefaultSchedule при создании нового юзера**

Заменить строку 55:

```js
  return createUserRecord(buildNormalizedUser(profile));
```

На:

```js
  const newUser = await createUserRecord(buildNormalizedUser(profile));

  await createDefaultSchedule(newUser.id).catch((err) =>
    console.error("[createDefaultSchedule] registration failed:", err.message),
  );

  return newUser;
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/auth/services/authServices.js
git commit -m "feat: автосоздание персонального расписания при регистрации"
```

---

### Task 4: Вызов при создании организации (owner)

**Files:**
- Modify: `src/services/orgServices.js:56-79`

- [ ] **Step 1: Добавить импорт**

В начало файла `src/services/orgServices.js`, после существующих импортов (после строки 9), добавить:

```js
import { createDefaultSchedule } from "./scheduleServices.js";
```

- [ ] **Step 2: Вызвать createDefaultSchedule после создания owner membership**

Заменить строки 69-78 в функции `createOrganization`:

```js
  const org = await createOrg(orgData);

  await createMembership({
    userId,
    orgId: org.id,
    role: "owner",
    status: MEMBERSHIP_STATUS.ACTIVE,
  });

  return org;
```

На:

```js
  const org = await createOrg(orgData);

  await createMembership({
    userId,
    orgId: org.id,
    role: "owner",
    status: MEMBERSHIP_STATUS.ACTIVE,
  });

  await createDefaultSchedule(userId, org.id).catch((err) =>
    console.error("[createDefaultSchedule] org creation failed:", err.message),
  );

  return org;
```

- [ ] **Step 3: Commit**

```bash
git add src/services/orgServices.js
git commit -m "feat: автосоздание org-расписания для owner при создании организации"
```

---

### Task 5: Вызов при принятии приглашения

**Files:**
- Modify: `src/services/orgServices.js:113-117`

- [ ] **Step 1: Вызвать createDefaultSchedule после принятия приглашения**

Импорт уже добавлен в Task 4. Заменить функцию `acceptInvitation` (строки 113-117):

```js
const acceptInvitation = async (orgId, userId) => {
  const result = await acceptInvitationRepo(userId, orgId);
  if (!result) return { error: "invitation_not_found" };
  return { success: true };
};
```

На:

```js
const acceptInvitation = async (orgId, userId) => {
  const result = await acceptInvitationRepo(userId, orgId);
  if (!result) return { error: "invitation_not_found" };

  await createDefaultSchedule(userId, orgId).catch((err) =>
    console.error("[createDefaultSchedule] accept invitation failed:", err.message),
  );

  return { success: true };
};
```

- [ ] **Step 2: Commit**

```bash
git add src/services/orgServices.js
git commit -m "feat: автосоздание org-расписания при принятии приглашения"
```

---

### Task 6: Ручное тестирование

- [ ] **Step 1: Запустить бэкенд**

```bash
npm run dev
```

- [ ] **Step 2: Проверить регистрацию**

Зарегистрировать нового пользователя через Google OAuth. Убедиться что:
- В коллекции `scheduletemplates` появился документ с `orgId: null` для нового юзера
- `weeklyHours` содержит пн-пт 09-18, сб 10-15, вс выходной

- [ ] **Step 3: Проверить создание организации**

Создать новую организацию. Убедиться что:
- В коллекции `scheduletemplates` появился документ с `orgId: <newOrgId>` для owner

- [ ] **Step 4: Проверить принятие приглашения**

Добавить другого юзера в организацию и принять приглашение. Убедиться что:
- В коллекции `scheduletemplates` появился документ с `orgId: <orgId>` для нового member

- [ ] **Step 5: Проверить идемпотентность**

Повторно вызвать `acceptInvitation` — убедиться что второй шаблон НЕ создаётся.

- [ ] **Step 6: Проверить фронтенд**

Открыть страницу "Мій розклад" — расписание должно отображаться вместо пустой страницы.
