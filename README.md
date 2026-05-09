# Sales Tracking System (STS)

A small, single-store sales tracker built with plain HTML, Bootstrap 5, vanilla JavaScript, [Supabase](https://supabase.com) (auth + Postgres), and deployed on [Vercel](https://vercel.com).

## Pages
- **Today** — record today's sales (product + quantity), edit / delete rows, see live totals.
- **Weekly / Monthly / Yearly** — date-bucketed rollups with a Top-5-products pie chart.
- **Products** — manage the product catalog (name, purchasing price, selling price).

## Calculations
Per the project spec:
| Column | Formula |
| --- | --- |
| Total Selling Price | `qty × sell` |
| Gross Profit % | `buy / sell` |
| Gross Profit ₱ | `sell − buy` (per unit) |

Aggregate revenue = Σ `qty × sell`. Aggregate profit = Σ `(sell − buy) × qty`.

## How data ownership works

Every row in `products` and `sales` has an `owner_id` column tied to the user who created it. RLS policies only let a user see or modify rows where `owner_id = auth.uid()`. This means each Supabase user gets their own private workspace — you can safely add a public demo account that anyone can use to test the app, and their data will never touch yours.

## One-time setup

### 1. Create a Supabase project
Sign in at [supabase.com](https://supabase.com) → **New project**. Note the **Project URL** and **anon public key** (Settings → API).

### 2. Run the schema
Open the **SQL editor** and paste the contents of [`supabase/schema.sql`](supabase/schema.sql). Run it. This creates the `products` and `sales` tables, indexes, and Row Level Security policies that scope every row to its owner.

> **Already ran the old schema before `owner_id` existed?** Use [`supabase/migration_001_owner_id.sql`](supabase/migration_001_owner_id.sql) instead. Edit the placeholder UUID at the top to your real account's user ID (Auth → Users → click your row → ID), then run the whole file.

### 3. Disable public signups
**Authentication → Providers → Email** → turn off **"Enable Sign Ups"**. Accounts are provisioned manually.

### 4. Create your owner account
**Authentication → Users → Add user** → use email + password (auto-confirm).

### 5. (Optional) Create the demo account
This is the account anyone can use to play with the site without affecting your real data.

1. **Authentication → Users → Add user** → use a separate email like `demo@yourstore.com` and a memorable password. Auto-confirm.
2. Sign in as the demo user once and add a couple of sample products + sales so visitors don't see an empty page.
3. Share the demo email + password with anyone you want to let in. They sign in through the normal login form.
4. Edit [`js/config.js`](js/config.js) and set `DEMO_EMAIL` to the demo account's email. The navbar will then show a yellow **DEMO MODE** badge while that account is signed in, so visitors know they're in the sandbox.

### 6. Wire up the frontend
Edit [`js/config.js`](js/config.js) and replace the placeholder values with your project URL and anon key:

```js
export const SUPABASE_URL = "https://your-project.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOi...";

// optional — only needed if you created a demo account in step 5
export const DEMO_EMAIL = "demo@yourstore.com";
```

> The anon key is **safe to expose** — RLS is what protects the data, and the demo account is sandboxed. Your real account's data is unreachable to anyone who isn't signed in as you.

## Run locally

Any static file server works:

```bash
npx serve .
# or
python -m http.server 8000
```

Then visit http://localhost:8000 — the index page will redirect to login.

## Deploy to Vercel

1. `git init && git add . && git commit -m "init"` and push to GitHub.
2. In Vercel, click **Add New → Project** and import the repo.
3. Framework preset: **Other**. Build command: *(none)*. Output directory: `./`.
4. Deploy. That's it — `vercel.json` enables clean URLs (`/today` instead of `/today.html`).

## End-to-end smoke test

1. Sign in with the account you created.
2. Open **Products** → add `Colgate Toothpaste`, buy `7`, sell `13`.
3. Open **Today** → click **+ Add sale** → select Colgate, qty `2`. Row should read:
   `Colgate Toothpaste | 2 | ₱7.00 | ₱13.00 | ₱26.00 | 54% | ₱6.00`. Profit total = ₱12.00.
4. Edit the qty to 3, then delete the row, and confirm totals update.
5. (Optional) Backdate a sale to test the report pages by running this in the Supabase SQL editor:
   ```sql
   insert into sales (product_id, quantity, sold_at)
   values ((select id from products where name = 'Colgate Toothpaste'), 5, current_date - 2);
   ```
6. Open **Weekly / Monthly / Yearly** — confirm the row appears in the right bucket and the pie chart shows Colgate.
7. Click **Logout** and try to visit `/today` directly — you should be redirected to login.

## Notes / Out of scope
- Prices are not snapshotted on each sale row. If you change a product's price later, historical reports will re-cost using the new price. (For most variety stores with stable prices, this is fine; flag this if it ever becomes an issue.)
- Single currency: Philippine Peso (₱).
- No printable receipts, CSV export, supplier tracking, or inventory levels — those weren't requested.
