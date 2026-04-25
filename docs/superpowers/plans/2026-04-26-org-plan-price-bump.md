# Org Plan Price Bump ($2 → $4.99) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the `org_creator` subscription plan price from `$2/month` to `$4.99/month` everywhere it appears in code (backend catalog, frontend i18n, test fixtures), keeping all surfaces consistent.

**Architecture:** Two-repo, two-commit change. Backend constant in cents (`200 → 499`) is the source of truth for `/billing/catalog`. Frontend i18n carries marketing copy that mirrors that price. Test fixtures that simulate Creem webhook amounts also align so they reflect a realistic transaction. The Creem dashboard is updated by the user manually (option a — same product ID, new price).

**Tech Stack:** Node.js (BackendTemplate), Next.js + next-intl (Slotix-fronted), Mocha-style test runner.

**Spec:** [docs/superpowers/specs/2026-04-26-org-plan-price-bump-design.md](../specs/2026-04-26-org-plan-price-bump-design.md)

**Repos:**
- Backend: `/Users/egorzozula/Desktop/BackendTemplate`
- Frontend: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted`

---

### Task 1: Backend — bump catalog price and align test fixtures

**Files:**
- Modify: `BackendTemplate/src/modules/billing/constants/billing.js:46`
- Modify: `BackendTemplate/src/modules/billing/__tests__/helpers.js:41`
- Modify: `BackendTemplate/src/modules/billing/__tests__/helpers.js:67`
- Modify: `BackendTemplate/src/modules/billing/__tests__/billing.test.js:57`
- Modify: `BackendTemplate/src/modules/billing/__tests__/billing.test.js:133`

- [ ] **Step 1: Update PLAN_CATALOG price**

In `BackendTemplate/src/modules/billing/constants/billing.js`, change line 46:

```js
// before
  org_creator: {
    price: 200,
    currency: "USD",
    period: "month",
    productId: process.env.CREEM_PRODUCT_ORG_CREATOR,
  },

// after
  org_creator: {
    price: 499,
    currency: "USD",
    period: "month",
    productId: process.env.CREEM_PRODUCT_ORG_CREATOR,
  },
```

- [ ] **Step 2: Update test webhook fixtures**

In `BackendTemplate/src/modules/billing/__tests__/helpers.js`, change the two `amount: 200` fixture values to `amount: 499`. Line 41 is inside `buildCheckoutPayload` (Creem checkout `order.amount`); line 67 is inside `buildRenewalPayload` (Creem `subscription.paid` `last_transaction.amount`). Both represent what Creem would send in a real webhook for this plan, so they should match the new catalog price.

```js
// line 41 — checkout fixture
    order: { id: TEST_ORDER_ID, amount: 499, currency: "USD" },

// line 67 — renewal fixture
    amount: 499,
```

- [ ] **Step 3: Update test assertions**

In `BackendTemplate/src/modules/billing/__tests__/billing.test.js`, change the two `payment.amount` assertions to match the new fixture amounts (otherwise tests fail because the payload now carries 499). Line 57 is in test `1.2 creates payment record` (checkout payment); line 133 is in test `2.3 creates renewal payment record` (renewal payment).

```js
// line 57
      assert.equal(payment.amount, 499);

// line 133
      assert.equal(payment.amount, 499);
```

- [ ] **Step 4: Run backend billing tests**

Run from `BackendTemplate`:

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
npm test -- src/modules/billing/__tests__/billing.test.js
```

Expected: all tests pass. The 200→499 change in fixture+assertion keeps the equality intact; the catalog change is unrelated to these assertions but is exercised by `getCatalog`.

If a different test runner script is used in this repo, fall back to `npm test` and confirm the billing suite passes. If tests fail with `expected 200 but got 499` or vice versa, check that all four fixture/assertion lines were updated together (mismatched edits cause this).

- [ ] **Step 5: Commit backend change**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/modules/billing/constants/billing.js src/modules/billing/__tests__/helpers.js src/modules/billing/__tests__/billing.test.js
git commit -m "$(cat <<'EOF'
chore(billing): bump org_creator plan price $2 → $4.99

Updates PLAN_CATALOG.org_creator.price from 200 to 499 cents.
Aligns webhook test fixtures and matching assertions to the new amount
so simulated Creem payloads reflect the real transaction value.

Creem dashboard product price must be updated separately by an admin
(same product ID, change price to $4.99) — code does not own that.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Frontend — update i18n strings (en + uk)

**Files:**
- Modify: `Slotix-fronted/i18n/messages/en.json:91`
- Modify: `Slotix-fronted/i18n/messages/en.json:195`
- Modify: `Slotix-fronted/i18n/messages/en.json:197`
- Modify: `Slotix-fronted/i18n/messages/uk.json:91`
- Modify: `Slotix-fronted/i18n/messages/uk.json:195`
- Modify: `Slotix-fronted/i18n/messages/uk.json:197`

- [ ] **Step 1: Update en.json**

In `i18n/messages/en.json`, three replacements:

```json
// line 91 (inside pricing.org_creator)
				"price": "$4.99",

// line 195 (inside paywall.org_creator)
			"paywallPrice": "$4.99/month",

// line 197 (inside paywall.org_creator)
			"subscribe": "Subscribe — $4.99/mo"
```

- [ ] **Step 2: Update uk.json**

In `i18n/messages/uk.json`, three replacements (mirror of en):

```json
// line 91 (inside pricing.org_creator)
				"price": "$4.99",

// line 195 (inside paywall.org_creator)
			"paywallPrice": "$4.99/місяць",

// line 197 (inside paywall.org_creator)
			"subscribe": "Підписатися — $4.99/міс"
```

- [ ] **Step 3: Verify both JSON files still parse**

Run from `Slotix-fronted`:

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
node -e "JSON.parse(require('fs').readFileSync('i18n/messages/en.json','utf8')); console.log('en.json ok')"
node -e "JSON.parse(require('fs').readFileSync('i18n/messages/uk.json','utf8')); console.log('uk.json ok')"
```

Expected output:
```
en.json ok
uk.json ok
```

If either fails with `SyntaxError`, the edit broke JSON structure (stray comma, missing quote). Fix and re-run.

- [ ] **Step 4: Run frontend lint**

Run from `Slotix-fronted`:

```bash
npm run lint
```

Expected: zero errors. ESLint does not validate i18n content but catches unrelated regressions if the edit accidentally touched neighbouring files.

- [ ] **Step 5: Confirm no other `$2` literals remain**

Run from `Slotix-fronted`:

```bash
grep -rn '\$2"\|\$2/' i18n app components lib | grep -v node_modules
```

Expected: no output (empty result). If any line returns, it's a missed reference — open it and update to `$4.99` before committing.

- [ ] **Step 6: Commit frontend change**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "$(cat <<'EOF'
chore(i18n): bump org_creator plan price $2 → $4.99

Updates pricing card and paywall copy in both en and uk locales to
match the new backend PLAN_CATALOG.org_creator.price (499 cents).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Manual end-to-end verification

This task confirms the three sources of truth (Creem dashboard, backend catalog, frontend copy) agree once the user updates the Creem product price.

- [ ] **Step 1: Confirm user has updated Creem dashboard**

Ask the user: "Did you update the org_creator product price in Creem dashboard from $2 to $4.99?"

If the answer is no, stop here. The remaining checks compare against Creem and would fail. Wait until the dashboard update is done.

- [ ] **Step 2: Verify backend catalog endpoint**

Start the backend (or use a running instance) and hit `/billing/catalog`:

```bash
curl -s http://localhost:9000/api/billing/catalog | grep -o '"org_creator"[^}]*'
```

Expected: response contains `"price":499` (or equivalent JSON shape).

If price is still 200, the backend is running stale code — restart it.

- [ ] **Step 3: Verify frontend pricing page**

Start the frontend dev server and open the landing page in a browser:

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npm run dev
```

Navigate to `http://localhost:3000/en` and confirm the Business plan card shows `$4.99`. Switch locale to `/uk` and confirm `$4.99` (UAH-language UI but USD price as-is).

If still `$2`, hard-reload (Cmd+Shift+R) — next-intl caches messages.

- [ ] **Step 4: Verify paywall surface**

Navigate to a flow that triggers the paywall (e.g., create an organisation as a free user). Confirm the paywall shows `$4.99/month` (en) or `$4.99/місяць` (uk) and the subscribe button shows `Subscribe — $4.99/mo` / `Підписатися — $4.99/міс`.

- [ ] **Step 5: Verify Creem checkout amount**

Click the subscribe button to open Creem's hosted checkout. The amount on the Creem page should be `$4.99` (NOT `$2.00`).

If Creem shows `$2.00`, the dashboard product price was not actually updated. Stop and have the user re-check Creem.

- [ ] **Step 6: Document completion**

If all five verification steps pass, the bump is live and consistent end-to-end. No further action.

If any step failed, capture which one and what was observed, then return to the relevant Task and re-check the edits.

---

## Notes for the implementer

- **No new tests.** This change is a constant/string edit, not new behaviour. The existing billing test suite acts as the regression guard.
- **Two repos, two commits.** Don't try to combine into one commit — they're separate Git histories. Run Task 1 then Task 2 sequentially, each with its own commit in its own working directory.
- **Order matters.** Backend before frontend so if anyone pulls partial state mid-deploy, the frontend showing $4.99 is consistent with backend now charging $4.99 (after Creem dashboard change). Reverse order would flash a "frontend shows $2 but backend says $4.99" mismatch.
- **The Creem dashboard step is out of code.** The implementer cannot complete it. Task 3 step 1 is a gate — if the user hasn't done it, stop.
