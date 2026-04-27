# Backend: лого организации и фото услуг через Cloudinary

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Расширить существующий media-модуль двумя новыми типами ассетов (`org-logo`, `service-photo`) и добавить 4 эндпоинта (POST/DELETE для лого + POST/DELETE для фото услуги).

**Architecture:** Реиспользуем `mediaServices.uploadAvatar/deleteAvatar` + Cloudinary провайдер. Новые `ASSET_TYPES` добавляются в реестр; `buildPublicId` и трансформации расширяются в провайдере; роуты вешаются в существующие `orgRoutes` / `eventTypeRoutes` (новых файлов модуля не создаём — следуем тому же паттерну, как реализован `staff-avatar`).

**Tech Stack:** Express 5, Mongoose 8, Cloudinary SDK, multer, node:test (built-in test runner).

**Spec:** [`docs/superpowers/specs/2026-04-27-cloudinary-org-service-photos-design.md`](../specs/2026-04-27-cloudinary-org-service-photos-design.md)

**Working directory:** `/Users/egorzozula/Desktop/BackendTemplate`

---

## File Structure

| Файл | Что делаем | Ответственность |
| --- | --- | --- |
| `src/modules/media/constants/media.js` | Modify | Зарегистрировать `ORG_LOGO`, `SERVICE_PHOTO` в `ASSET_TYPES` и `ASSET_LIMITS` |
| `src/modules/media/providers/cloudinary.js` | Modify | Расширить `buildPublicId` (две новые ветки) + заменить хардкод `AVATAR_TRANSFORMATION` на таблицу `TRANSFORMATIONS[assetType]` |
| `src/models/EventType.js` | Modify | Добавить поле `image: { type: String, default: '' }` |
| `src/dto/eventTypeDto.js` | Modify | Включить `image` в DTO-выход |
| `src/services/orgServices.js` | Modify | Добавить `updateOrgLogo(orgId, url)`; убрать `logoUrl` из обновляемых полей в `updateOrg` |
| `src/controllers/orgController.js` | Modify | Добавить `handleUploadOrgLogo`, `handleDeleteOrgLogo`; убрать `logoUrl` из схемы валидации update |
| `src/routes/subroutes/orgRoutes.js` | Modify | Зарегистрировать `POST/DELETE /:id/logo` |
| `src/services/eventTypeService.js` | Modify | Добавить `updateEventTypeImage(id, url)` |
| `src/controllers/eventTypeController.js` | Modify | Добавить `handleUploadServicePhoto`, `handleDeleteServicePhoto` + helper `canEditServicePhoto` |
| `src/routes/subroutes/eventTypeRoutes.js` | Modify | Зарегистрировать `POST/DELETE /:id/photo` |
| `src/modules/media/__tests__/mediaServices.test.js` | Modify | Тест-кейсы на новые `assetType`-ключи (просто проверяем, что lookup лимитов работает) |
| `src/modules/media/__tests__/cloudinaryProvider.test.js` | Create | Юнит-тесты `buildPublicId` для всех 4 assetType + проверка трансформаций |

---

## Pre-flight

Перед началом убедись что ветка чистая и тесты зелёные:

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git status
npm test
```

---

## Task 1: Зарегистрировать новые `ASSET_TYPES` и лимиты

**Files:**
- Modify: `src/modules/media/constants/media.js`
- Test: `src/modules/media/__tests__/mediaServices.test.js`

- [ ] **Step 1: Добавить failing-тест на новые assetType-ключи**

В конец `src/modules/media/__tests__/mediaServices.test.js` добавить:

```js
test("uploadAvatar валидирует лимиты для org-logo", async () => {
  const file = {
    buffer: Buffer.from("fake"),
    mimetype: "image/jpeg",
    size: 100,
    originalname: "x.jpg",
  };
  const result = await uploadAvatar({
    assetType: "org-logo",
    ownerId: "orgABC",
    file,
  });
  assert.strictEqual(result.url, "https://mock.test/org-logo/orgABC");
});

test("uploadAvatar валидирует лимиты для service-photo", async () => {
  const file = {
    buffer: Buffer.from("fake"),
    mimetype: "image/png",
    size: 100,
    originalname: "x.png",
  };
  const result = await uploadAvatar({
    assetType: "service-photo",
    ownerId: "evt1",
    file,
  });
  assert.strictEqual(result.url, "https://mock.test/service-photo/evt1");
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
node --test src/modules/media/__tests__/mediaServices.test.js
```

Ожидаем: FAIL — `Unknown assetType: org-logo` / `service-photo`.

- [ ] **Step 3: Расширить реестр**

Заменить содержимое `src/modules/media/constants/media.js` на:

```js
// src/modules/media/constants/media.js

/**
 * Типы ассетов, которые мы умеем загружать.
 * Используется для выбора папки в провайдере и резолва лимитов.
 */
export const ASSET_TYPES = Object.freeze({
  USER_AVATAR: "user-avatar",
  STAFF_AVATAR: "staff-avatar",
  ORG_LOGO: "org-logo",
  SERVICE_PHOTO: "service-photo",
});

const COMMON_IMAGE_LIMITS = Object.freeze({
  maxBytes: 2 * 1024 * 1024,
  mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
});

/**
 * Лимиты по типу ассета — централизованно, чтобы для разных сущностей
 * (аватарки / лого орг / фото услуг) ставить разные ограничения.
 */
export const ASSET_LIMITS = Object.freeze({
  [ASSET_TYPES.USER_AVATAR]: COMMON_IMAGE_LIMITS,
  [ASSET_TYPES.STAFF_AVATAR]: COMMON_IMAGE_LIMITS,
  [ASSET_TYPES.ORG_LOGO]: COMMON_IMAGE_LIMITS,
  [ASSET_TYPES.SERVICE_PHOTO]: COMMON_IMAGE_LIMITS,
});

/**
 * Резолвит лимиты по assetType. Бросает если тип неизвестен —
 * лучше упасть громко, чем тихо принять что-то странное.
 */
export const getAssetLimits = (assetType) => {
  const limits = ASSET_LIMITS[assetType];
  if (!limits) {
    throw new Error(`Unknown assetType: ${assetType}`);
  }
  return limits;
};
```

- [ ] **Step 4: Запустить тест — должен пройти**

```bash
node --test src/modules/media/__tests__/mediaServices.test.js
```

Ожидаем: PASS — все тесты зелёные.

- [ ] **Step 5: Commit**

```bash
git add src/modules/media/constants/media.js src/modules/media/__tests__/mediaServices.test.js
git commit -m "feat(media): зарегистрировать assetType org-logo и service-photo"
```

---

## Task 2: Расширить Cloudinary провайдер (buildPublicId + TRANSFORMATIONS)

**Files:**
- Modify: `src/modules/media/providers/cloudinary.js`
- Create: `src/modules/media/__tests__/cloudinaryProvider.test.js`

- [ ] **Step 1: Создать failing-тест на `buildPublicId`**

Создать `src/modules/media/__tests__/cloudinaryProvider.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert";
import { mock } from "node:test";

// Cloudinary SDK не должен реально стучать в облако в тестах.
mock.module("cloudinary", {
  namedExports: {
    v2: {
      config: () => {},
      uploader: { upload_stream: () => {}, destroy: async () => {} },
      url: (publicId) => `https://test/${publicId}`,
    },
  },
});

const provider = (await import("../providers/cloudinary.js")).default;

test("buildProviderId для user-avatar", () => {
  assert.strictEqual(
    provider.buildProviderId("user-avatar", "u1"),
    "slotix/avatars/users/u1",
  );
});

test("buildProviderId для staff-avatar", () => {
  assert.strictEqual(
    provider.buildProviderId("staff-avatar", "org1/u2"),
    "slotix/avatars/staff/org1/u2",
  );
});

test("buildProviderId для org-logo", () => {
  assert.strictEqual(
    provider.buildProviderId("org-logo", "org1"),
    "slotix/orgs/org1/logo",
  );
});

test("buildProviderId для service-photo", () => {
  assert.strictEqual(
    provider.buildProviderId("service-photo", "evt1"),
    "slotix/services/evt1",
  );
});

test("buildProviderId бросает на неизвестный assetType", () => {
  assert.throws(() => provider.buildProviderId("foo", "x"));
});
```

- [ ] **Step 2: Запустить тест — должен упасть на `org-logo` и `service-photo`**

```bash
node --test src/modules/media/__tests__/cloudinaryProvider.test.js
```

Ожидаем: первые два теста PASS, третий и четвёртый FAIL с `Unknown assetType for publicId`.

- [ ] **Step 3: Расширить провайдер**

Заменить содержимое `src/modules/media/providers/cloudinary.js` на:

```js
// src/modules/media/providers/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import { ASSET_TYPES } from "../constants/media.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Папки в Cloudinary детерминистичны от ownerId, чтобы повторный аплоад
 * перезаписывал старый файл (overwrite: true) и нам не нужно было хранить
 * provider_id в БД.
 */
const buildPublicId = (assetType, ownerId) => {
  if (assetType === ASSET_TYPES.USER_AVATAR) {
    return `slotix/avatars/users/${ownerId}`;
  }
  if (assetType === ASSET_TYPES.STAFF_AVATAR) {
    return `slotix/avatars/staff/${ownerId}`;
  }
  if (assetType === ASSET_TYPES.ORG_LOGO) {
    return `slotix/orgs/${ownerId}/logo`;
  }
  if (assetType === ASSET_TYPES.SERVICE_PHOTO) {
    return `slotix/services/${ownerId}`;
  }
  throw new Error(`Unknown assetType for publicId: ${assetType}`);
};

/**
 * Трансформации по типу ассета. Аватарки кропятся по лицу (g_face),
 * лого и фото услуг — по умному контент-aware кропу (g_auto).
 */
const TRANSFORMATIONS = Object.freeze({
  [ASSET_TYPES.USER_AVATAR]: [
    { width: 400, height: 400, crop: "fill", gravity: "face" },
    { quality: "auto", fetch_format: "auto" },
  ],
  [ASSET_TYPES.STAFF_AVATAR]: [
    { width: 400, height: 400, crop: "fill", gravity: "face" },
    { quality: "auto", fetch_format: "auto" },
  ],
  [ASSET_TYPES.ORG_LOGO]: [
    { width: 400, height: 400, crop: "fill", gravity: "auto" },
    { quality: "auto", fetch_format: "auto" },
  ],
  [ASSET_TYPES.SERVICE_PHOTO]: [
    { width: 400, height: 400, crop: "fill", gravity: "auto" },
    { quality: "auto", fetch_format: "auto" },
  ],
});

const uploadStream = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    stream.end(buffer);
  });

/**
 * Залить файл в Cloudinary. Возвращает URL уже с трансформациями.
 */
const upload = async (file, { assetType, ownerId }) => {
  const publicId = buildPublicId(assetType, ownerId);
  const result = await uploadStream(file.buffer, {
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
    invalidate: true,
  });

  const url = cloudinary.url(result.public_id, {
    secure: true,
    version: result.version,
    transformation: TRANSFORMATIONS[assetType],
  });

  return { url, providerId: result.public_id };
};

const remove = async (providerId) => {
  await cloudinary.uploader.destroy(providerId, { invalidate: true });
};

const buildProviderId = (assetType, ownerId) => buildPublicId(assetType, ownerId);

export default { upload, delete: remove, buildProviderId };
```

- [ ] **Step 4: Запустить все media-тесты — должны пройти**

```bash
node --test src/modules/media/__tests__/
```

Ожидаем: PASS все.

- [ ] **Step 5: Commit**

```bash
git add src/modules/media/providers/cloudinary.js src/modules/media/__tests__/cloudinaryProvider.test.js
git commit -m "feat(media): добавить org-logo и service-photo в Cloudinary провайдер"
```

---

## Task 3: Поле `image` на модели `EventType`

**Files:**
- Modify: `src/models/EventType.js`

- [ ] **Step 1: Добавить поле в схему**

Открыть `src/models/EventType.js`, найти существующее поле (например, `color: { type: String }`, строка ~134) и добавить рядом блок:

```js
    /**
     * URL фото услуги. Заполняется через POST /api/event-types/:id/photo.
     * Пустая строка = нет фото, фронт показывает fallback-букву.
     */
    image: { type: String, default: "" },
```

- [ ] **Step 2: Никаких новых тестов на схему — Mongoose дефолт уже покрыт другими механизмами**

Поле добавляется без миграции — у существующих документов оно будет undefined в БД, но Mongoose-DTO всё равно будет отдавать `''` благодаря default. Это поведение проверяется на уровне DTO в Task 4.

- [ ] **Step 3: Запустить полный тест-сьют**

```bash
npm test
```

Ожидаем: PASS все.

- [ ] **Step 4: Commit**

```bash
git add src/models/EventType.js
git commit -m "feat(event-type): добавить поле image для фото услуги"
```

---

## Task 4: Расширить `eventTypeDto`

**Files:**
- Modify: `src/dto/eventTypeDto.js`

- [ ] **Step 1: Добавить `image` в DTO**

Открыть `src/dto/eventTypeDto.js` и добавить строку в объект:

```js
const toEventTypeDto = (doc) => ({
  id: doc._id.toString(),
  userId: doc.userId ? doc.userId.toString() : null,
  orgId: doc.orgId ? doc.orgId.toString() : null,
  slug: doc.slug,
  name: doc.name,
  image: doc.image || "",   // ← добавить
  durationMin: doc.durationMin,
  type: doc.type,
  color: doc.color,
  description: doc.description || null,
  // ...остальное без изменений
});
```

- [ ] **Step 2: Запустить полный тест-сьют — должен пройти**

```bash
npm test
```

Ожидаем: PASS — никакие тесты не падают (поле новое и опциональное).

- [ ] **Step 3: Commit**

```bash
git add src/dto/eventTypeDto.js
git commit -m "feat(event-type): включить image в DTO"
```

---

## Task 5: Обновить `orgServices` — отдельная функция для лого и удаление logoUrl из общего update

**Files:**
- Modify: `src/services/orgServices.js`

- [ ] **Step 1: Добавить функцию `updateOrgLogo`**

Открыть `src/services/orgServices.js`. Найти место рядом с `updateOrg` и добавить:

```js
/**
 * Обновить URL лого организации. Используется upload-/delete-эндпоинтами.
 * Возвращает обновлённый orgDto.
 */
const updateOrgLogo = async (orgId, url) => {
  const updated = await Organization.findByIdAndUpdate(
    orgId,
    { $set: { "settings.logoUrl": url } },
    { new: true },
  );
  if (!updated) return null;
  return toOrgDto(updated);
};
```

(Импортов `Organization` и `toOrgDto` в файле уже должно хватать — если нет, скопируй с `updateOrg`.)

- [ ] **Step 2: Убрать `logoUrl` из принимаемых полей `updateOrg`**

В функции `updateOrg` (примерно строка 130 по поиску) удалить блок:

```js
if (data.logoUrl !== undefined) update["settings.logoUrl"] = data.logoUrl;
```

Также в функции `createOrg` (примерно строка 99) удалить:

```js
logoUrl: data.logoUrl || undefined,
```

(Поле в settings остаётся в схеме, просто его нельзя задать через create/update — теперь только через upload-эндпоинт.)

- [ ] **Step 3: Экспортировать `updateOrgLogo`**

В конце файла добавить в `export {...}` блок имя `updateOrgLogo`.

- [ ] **Step 4: Запустить тесты**

```bash
npm test
```

Ожидаем: PASS — никаких регрессий.

- [ ] **Step 5: Commit**

```bash
git add src/services/orgServices.js
git commit -m "feat(org): добавить updateOrgLogo, убрать logoUrl из общего update"
```

---

## Task 6: Контроллеры лого организации

**Files:**
- Modify: `src/controllers/orgController.js`

- [ ] **Step 1: Добавить хендлеры**

Открыть `src/controllers/orgController.js`. В блоке импортов убедиться, что есть:

```js
import { uploadAvatar, deleteAvatar, ASSET_TYPES } from "../modules/media/index.js";
import { updateOrgLogo } from "../services/orgServices.js";
```

(Если `uploadAvatar`/`deleteAvatar` уже импортированы для аватарок — не дублируй; добавь только `updateOrgLogo`.)

В конец файла, ПЕРЕД `export {...}`, добавить:

```js
const handleUploadOrgLogo = async (req, res) => {
  try {
    const { id: orgId } = req.params;
    if (!isValidObjectId(orgId)) {
      return httpResponse(res, generalStatus.BAD_REQUEST);
    }
    if (!req.file) {
      return httpResponseError(res, {
        ...userStatus.VALIDATION_ERROR,
        data: { file: { error: "File is required" } },
      });
    }

    const { url } = await uploadAvatar({
      assetType: ASSET_TYPES.ORG_LOGO,
      ownerId: orgId,
      file: req.file,
    });

    const result = await updateOrgLogo(orgId, url);
    if (!result) return httpResponse(res, generalStatus.NOT_FOUND);
    return httpResponse(res, generalStatus.SUCCESS, result);
  } catch (error) {
    return httpResponseError(res, error);
  }
};

const handleDeleteOrgLogo = async (req, res) => {
  try {
    const { id: orgId } = req.params;
    if (!isValidObjectId(orgId)) {
      return httpResponse(res, generalStatus.BAD_REQUEST);
    }

    const current = await Organization.findById(orgId);
    if (!current) return httpResponse(res, generalStatus.NOT_FOUND);

    if (current.settings && current.settings.logoUrl) {
      await deleteAvatar({
        assetType: ASSET_TYPES.ORG_LOGO,
        ownerId: orgId,
      });
    }

    const result = await updateOrgLogo(orgId, "");
    return httpResponse(res, generalStatus.SUCCESS, result);
  } catch (error) {
    return httpResponseError(res, error);
  }
};
```

- [ ] **Step 2: Подключить `Organization` если ещё не импортирован**

Проверь наверху файла. Если `Organization` нет — добавить:

```js
import Organization from "../models/Organization.js";
```

- [ ] **Step 3: Дописать в `export {...}` имена `handleUploadOrgLogo`, `handleDeleteOrgLogo`**

В строке 306 (конец файла) расширить:

```js
export {
  handleGetOrg,
  handleGetOrgStaff,
  handleCreateOrg,
  handleUpdateOrg,
  handleUpdateStaffMember,
  handleUpdateStaffPosition,
  handleGetUserOrgs,
  handleAddStaff,
  handleAcceptInvitation,
  handleDeclineInvitation,
  handleGetMyMembership,
  handleUploadStaffAvatar,
  handleDeleteStaffAvatar,
  handleUploadOrgLogo,    // ← новое
  handleDeleteOrgLogo,    // ← новое
};
```

- [ ] **Step 4: Убрать `logoUrl` из схемы валидации update (строки 14, 25 в orgController)**

Найти `updateOrgSchema` (примерно строка 22) и удалить из него строку `logoUrl: { type: "string", required: false }`. Аналогично в `createOrgSchema` (строка 14), если она там есть.

- [ ] **Step 5: Запустить тесты**

```bash
npm test
```

Ожидаем: PASS. Если упало — почини (вероятно, тесты на createOrg/updateOrg слали `logoUrl` — обнови их).

- [ ] **Step 6: Commit**

```bash
git add src/controllers/orgController.js
git commit -m "feat(org): добавить контроллеры handleUploadOrgLogo / handleDeleteOrgLogo"
```

---

## Task 7: Роуты лого организации

**Files:**
- Modify: `src/routes/subroutes/orgRoutes.js`

- [ ] **Step 1: Импортировать новые хендлеры**

Открыть `src/routes/subroutes/orgRoutes.js`. В блоке импортов из `orgController.js` добавить:

```js
import {
  // ...existing,
  handleUploadOrgLogo,
  handleDeleteOrgLogo,
} from "../../controllers/orgController.js";
```

`uploadFor`, `handleUploadError`, `ASSET_TYPES` уже импортированы (строка 6).

- [ ] **Step 2: Добавить роуты**

После существующих staff-avatar роутов (строки 22-29) добавить:

```js
router.post(
  "/:id/logo",
  authMiddleware,
  requireOrgAdmin((req) => req.params.id),
  uploadFor(ASSET_TYPES.ORG_LOGO).single("file"),
  handleUploadError,
  handleUploadOrgLogo,
);

router.delete(
  "/:id/logo",
  authMiddleware,
  requireOrgAdmin((req) => req.params.id),
  handleDeleteOrgLogo,
);
```

- [ ] **Step 3: Поднять сервер и проверить эндпоинт curl-ом**

```bash
npm run dev &
SERVER_PID=$!
sleep 3
# подмени токен и orgId на реальные
curl -X POST -H "Authorization: Bearer <TOKEN>" -F "file=@./test-image.jpg" http://localhost:3000/api/org/<ORG_ID>/logo
kill $SERVER_PID
```

Ожидаем: 200 c JSON, в `data.logo` — `https://res.cloudinary.com/...`. Без файла — 400.

(Замечание исполнителю: если нет тестовой картинки, скачай `curl https://picsum.photos/400 -o test-image.jpg` или скопируй любую с диска.)

- [ ] **Step 4: Commit**

```bash
git add src/routes/subroutes/orgRoutes.js
git commit -m "feat(org): эндпоинты POST/DELETE /:id/logo"
```

---

## Task 8: Сервис обновления `EventType.image`

**Files:**
- Modify: `src/services/eventTypeService.js`

- [ ] **Step 1: Добавить функцию `updateEventTypeImage`**

Открыть `src/services/eventTypeService.js`. Рядом с существующей `updateEventType` добавить:

```js
/**
 * Обновить URL фото услуги. Используется upload/delete photo эндпоинтами.
 * Возвращает обновлённый eventTypeDto.
 */
const updateEventTypeImage = async (id, url) => {
  const updated = await EventType.findByIdAndUpdate(
    id,
    { $set: { image: url } },
    { new: true },
  );
  if (!updated) return null;
  return toEventTypeDto(updated);
};

export { updateEventTypeImage };
```

(Если в файле отдельный `export {...}` блок в конце — добавь имя туда. Если каждая функция экспортируется отдельным `export` — следуй существующему паттерну.)

- [ ] **Step 2: Запустить тесты**

```bash
npm test
```

Ожидаем: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/services/eventTypeService.js
git commit -m "feat(event-type): добавить updateEventTypeImage"
```

---

## Task 9: Контроллеры фото услуги

**Files:**
- Modify: `src/controllers/eventTypeController.js`

- [ ] **Step 1: Добавить импорты**

В верх файла:

```js
import { uploadAvatar, deleteAvatar, ASSET_TYPES } from "../modules/media/index.js";
import { updateEventTypeImage } from "../services/eventTypeService.js";
import { getEventTypeById } from "../repository/eventTypeRepository.js";
import Membership from "../models/Membership.js";
import { userStatus } from "../shared/utils/http/httpStatus.js";
```

(Не дублируй те, которые уже там — посмотри текущий блок импортов.)

- [ ] **Step 2: Добавить helper `canEditServicePhoto` и хендлеры**

В конец файла, ПЕРЕД `export {...}`:

```js
const ADMIN_ROLES = ["owner", "admin"];

/**
 * Авторизация загрузки/удаления фото услуги.
 * - Org-услуга (`type === 'org'`): caller — owner/admin орг с eventType.orgId.
 * - Solo-услуга (`type === 'solo'`): caller — сам владелец (`userId === req.user.id`).
 */
const canEditServicePhoto = async (currentUserId, eventType) => {
  if (eventType.type === "solo") {
    return String(eventType.userId) === String(currentUserId);
  }
  if (eventType.type === "org") {
    if (!eventType.orgId) return false;
    const membership = await Membership.findOne({
      userId: currentUserId,
      orgId: eventType.orgId,
      status: "active",
    });
    return Boolean(membership && ADMIN_ROLES.includes(membership.role));
  }
  return false;
};

const handleUploadServicePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return httpResponse(res, generalStatus.BAD_REQUEST);
    }

    const eventType = await getEventTypeById(id);
    if (!eventType) {
      return httpResponse(res, generalStatus.NOT_FOUND);
    }

    const allowed = await canEditServicePhoto(req.user.id, eventType);
    if (!allowed) {
      return httpResponse(res, generalStatus.UNAUTHORIZED);
    }

    if (!req.file) {
      return httpResponseError(res, {
        ...userStatus.VALIDATION_ERROR,
        data: { file: { error: "File is required" } },
      });
    }

    const { url } = await uploadAvatar({
      assetType: ASSET_TYPES.SERVICE_PHOTO,
      ownerId: id,
      file: req.file,
    });

    const result = await updateEventTypeImage(id, url);
    if (!result) return httpResponse(res, generalStatus.NOT_FOUND);
    return httpResponse(res, generalStatus.SUCCESS, result);
  } catch (error) {
    return httpResponseError(res, error);
  }
};

const handleDeleteServicePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return httpResponse(res, generalStatus.BAD_REQUEST);
    }

    const eventType = await getEventTypeById(id);
    if (!eventType) {
      return httpResponse(res, generalStatus.NOT_FOUND);
    }

    const allowed = await canEditServicePhoto(req.user.id, eventType);
    if (!allowed) {
      return httpResponse(res, generalStatus.UNAUTHORIZED);
    }

    if (eventType.image) {
      await deleteAvatar({
        assetType: ASSET_TYPES.SERVICE_PHOTO,
        ownerId: id,
      });
    }

    const result = await updateEventTypeImage(id, "");
    return httpResponse(res, generalStatus.SUCCESS, result);
  } catch (error) {
    return httpResponseError(res, error);
  }
};
```

- [ ] **Step 3: Расширить `export {...}`**

```js
export {
  handleGetEventTypes,
  handleGetStaffForEventType,
  handleCreateEventType,
  handleUpdateEventType,
  handleDeleteEventType,
  handleUploadServicePhoto,    // ← новое
  handleDeleteServicePhoto,    // ← новое
};
```

- [ ] **Step 4: Запустить тесты**

```bash
npm test
```

Ожидаем: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/controllers/eventTypeController.js
git commit -m "feat(event-type): добавить контроллеры handleUploadServicePhoto / handleDeleteServicePhoto"
```

---

## Task 10: Роуты фото услуги

**Files:**
- Modify: `src/routes/subroutes/eventTypeRoutes.js`

- [ ] **Step 1: Импортировать новые хендлеры и media-утилиты**

В верх файла:

```js
import {
  handleGetEventTypes,
  handleGetStaffForEventType,
  handleCreateEventType,
  handleUpdateEventType,
  handleDeleteEventType,
  handleUploadServicePhoto,
  handleDeleteServicePhoto,
} from "../../controllers/eventTypeController.js";
import {
  uploadFor,
  handleUploadError,
  ASSET_TYPES,
} from "../../modules/media/index.js";
```

- [ ] **Step 2: Добавить роуты**

После существующего DELETE-роута (`router.delete("/:id", ...)`, строка 50) добавить:

```js
router.post(
  "/:id/photo",
  authMiddleware,
  uploadFor(ASSET_TYPES.SERVICE_PHOTO).single("file"),
  handleUploadError,
  handleUploadServicePhoto,
);

router.delete(
  "/:id/photo",
  authMiddleware,
  handleDeleteServicePhoto,
);
```

(Авторизацию делает контроллер, потому что нужна логика org-vs-solo, недоступная middleware-фабрике.)

- [ ] **Step 3: Поднять сервер и проверить curl-ом**

```bash
npm run dev &
SERVER_PID=$!
sleep 3
curl -X POST -H "Authorization: Bearer <TOKEN>" -F "file=@./test-image.jpg" http://localhost:3000/api/event-types/<EVT_ID>/photo
kill $SERVER_PID
```

Ожидаем: 200, `data.image` — Cloudinary URL. Чужой `EVT_ID` (без прав) → 401.

- [ ] **Step 4: Commit**

```bash
git add src/routes/subroutes/eventTypeRoutes.js
git commit -m "feat(event-type): эндпоинты POST/DELETE /:id/photo"
```

---

## Task 11: Финальная проверка acceptance-criteria

- [ ] **Step 1: Полный прогон тестов**

```bash
npm test
```

Ожидаем: все тесты PASS.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Ожидаем: clean.

- [ ] **Step 3: Чек-лист (в самом плане выше — спек §6 backend)**

Прогнать вручную через curl/Postman:

- POST `/api/org/:orgId/logo` — owner/admin → 200, не-член → 401
- DELETE `/api/org/:orgId/logo` — обнуление + deleteAvatar
- Повторный POST → перезапись (проверить по полю `version` в URL Cloudinary, public_id тот же)
- POST `/api/event-types/:id/photo` (org) — admin → 200, member → 401
- POST `/api/event-types/:id/photo` (solo) — owner → 200, чужой → 401
- DELETE для обоих — обнуление поля + delete в Cloudinary
- 400 на mime != image/jpeg/png/webp/gif
- 400 на size > 2 MB
- 401 без токена
- `PATCH /api/org/:orgId` с `{ logoUrl: 'x' }` — поле игнорируется
- `GET /api/event-types?orgId=...` возвращает массив с `image: ''` или `image: 'https://...'`

- [ ] **Step 4: Готовность к фронту**

Если всё зелёное — backend готов. Передавай на frontend-план: `2026-04-27-cloudinary-org-service-photos-frontend-plan.md`.
