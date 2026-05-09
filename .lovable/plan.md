## Goal

Add support for 10 product categories in the Creator Shop, each with its own form, delivery flow, storefront card, and analytics. This is a multi-week feature — proposing a phased approach so we ship value quickly and avoid a giant unreviewable PR.

## Phased rollout

### Phase 1 — Foundation (this round)
The minimum to make categories real end-to-end.

1. **Schema**: add `category`, `category_data jsonb`, `is_free boolean` to `mentor_products`. Default existing rows to `digital_download`. `category_data` holds category-specific fields (license type, duration, tier list, external URL, bundle items, etc.) so we don't need 10 new tables on day one.
2. **Category registry**: a single `src/lib/productCategories.ts` defining all 10 categories — id, label, icon, accent color, one-liner, default fields, badge style. Used by every surface (picker, badges, filters, storefront cards, analytics).
3. **Category picker modal**: shown when creator clicks "+ Add Product". 3-col grid of cards, ordered as specified, opens the existing form pre-set to that category.
4. **Shared product form (Phase 1 fields)**: extend `ProductForm` with the category field plus a small set of category-specific inputs that don't need new infra — License (Digital Download), Duration options (Coaching), Tier list (Membership), External URL + open-in-new-tab (External Link), Bundle product picker (Bundle), Date/time + platform (Webinar). Heavier fields (course module builder, drip schedule, certificate, intake forms, community auto-invite) are stubbed with placeholder UI marked "coming soon".
5. **Shop list polish**: category badge on each product card, filter chips with counts, sort dropdown (Recent / Best selling / Highest revenue / A→Z / price asc / price desc), search by title/description.
6. **Storefront card variants**: category badge + per-category CTA wording (Buy / Book / Subscribe / Reserve / Get it free / View). No new flows yet — all categories use the existing checkout in Phase 1; coaching/webinar booking flows arrive in Phase 3.
7. **Lead magnet free flow**: `is_free=true` skips Stripe and triggers an email with the file (uses existing Resend secret).

### Phase 2 — Course player + Membership tiers
- Module/lesson builder UI + dedicated `course_modules` / `course_lessons` / `course_progress` tables
- Course player route with progress tracking + resume
- Membership tier purchase via Stripe subscriptions (we already have `STRIPE_SECRET_KEY`); recurring access checks
- Drip schedule + completion certificate

### Phase 3 — Booking + Live events
- Coaching call: hook into existing Availability tab, generate Google Meet link (we have `GOOGLE_CLIENT_ID/SECRET`), pre-call questionnaire
- Webinar: dedicated event record, reminder cron, replay storage
- Buffer time + cancellation policies

### Phase 4 — Community + Custom service + Analytics
- Community auto-invite (Discord/Telegram via webhooks; in-app community membership table)
- Custom service intake forms + manual delivery via Messages
- Sales tab: revenue-by-category breakdown, AOV per category, lead-magnet → paid conversion
- AI Twin category-aware copy + pricing suggestions

## What I'll build now (Phase 1 deliverables)

**Migration**
- `mentor_products.category text not null default 'digital_download'`
- `mentor_products.category_data jsonb not null default '{}'`
- `mentor_products.is_free boolean not null default false`
- index on `(mentor_id, category)`

**New files**
- `src/lib/productCategories.ts` — registry (id, label, icon, accent token, description, badge classes, CTA label)
- `src/components/shop/CategoryPickerModal.tsx`
- `src/components/shop/CategoryBadge.tsx`
- `src/components/shop/ShopFilters.tsx` (filter chips + sort + search)
- `src/components/shop/category-fields/` — small per-category field groups (LicenseField, DurationField, TierListField, ExternalLinkField, BundlePickerField, WebinarScheduleField). Heavier categories render an inline "Coming soon — basic fields only" notice.

**Edits**
- `ProductForm.tsx` — accept `category` prop, render category-specific block, persist `category_data`
- `CreatorProductsTab.tsx` — open `CategoryPickerModal` first, then form; render `ShopFilters`; show category badge per card; client-side filter/sort/search
- `ProductsTab.tsx` (storefront) — show category badge, group toggle "Group products by category"
- Public shop card (`src/components/...` for storefront product card) — category badge + CTA wording from registry

## Category color tokens

I'll add semantic HSL tokens to `index.css`:
```text
--cat-download, --cat-course, --cat-coaching, --cat-membership,
--cat-community, --cat-webinar, --cat-leadmagnet, --cat-bundle,
--cat-external, --cat-service
```
and matching Tailwind classes so badges/cards stay theme-correct in light + dark.

## Out of scope for Phase 1 (explicitly deferred)

- Multi-file 5GB upload, course module/lesson builder, drip schedule, certificates
- Coaching calendar wiring, Zoom/Meet auto-generation, intake forms, buffer time
- Stripe subscription tiers + free trials, recurring access gating
- Community auto-invite (Discord/Telegram/Circle/Slack)
- Webinar reminder cron, replay storage
- Bulk actions (multi-select archive/visibility/bundle/export)
- Category-grouped sections on public storefront
- Sales tab category analytics
- AI Twin category-aware features

These all go in Phases 2–4.

## Confirm before I build

1. **OK to proceed with Phase 1 only as scoped above?** (Phases 2–4 follow in separate rounds.)
2. **Storing category-specific fields in a single `category_data jsonb` for now** — fine, or do you want separate tables per category from day one? (jsonb is faster to ship and easy to migrate out later.)
3. **Lead magnet email delivery via Resend** — we already have `RESEND_API_KEY`. OK to wire it up in Phase 1?

Say "go" and I'll start with the migration.