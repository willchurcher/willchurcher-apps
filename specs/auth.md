# Authentication & Backend

All apps requiring persistent data are gated behind a login screen. Auth is handled by Supabase; data is stored in a Supabase PostgreSQL database.

---

## How It Works

- The entire app requires login — unauthenticated users see a sign-in form, nothing else
- Sign in with **email + password** (Supabase Auth)
- Session is persisted automatically by the Supabase client and refreshed silently — you stay logged in for a long time without re-entering credentials
- Sign out is available via the **···** menu on the home screen

---

## Supabase Project

| Property | Value |
|---|---|
| Project name | `willchurcher-apps` |
| Project ref | `xnqmnhqclbprorcghyeh` |
| Region | West Europe (London) |
| Dashboard | `supabase.com/dashboard/project/xnqmnhqclbprorcghyeh` |

---

## Managing Users

Users are created manually via the Supabase dashboard — there is no self-signup.

1. Go to **Auth → Users** in the Supabase dashboard
2. Click **Add user → Create new user**
3. Enter an email and password

To remove a user, delete them from the same screen.

---

## Data Storage

Each app stores its data as a JSON blob in the `app_data` table:

```sql
app_data (
  id         uuid  primary key,
  user_id    uuid  references auth.users,
  app        text,              -- e.g. 'notes', 'planner'
  data       jsonb,             -- full app state as JSON
  updated_at timestamptz,
  unique(user_id, app)
)
```

Row Level Security is enabled — users can only read and write their own rows.

Each app reads on mount and upserts on every state change. There is no conflict resolution — last write wins (fine for single-user use).

---

## Frontend

| File | Purpose |
|---|---|
| `src/supabase.ts` | Supabase client (reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`) |
| `src/AuthContext.tsx` | Auth state provider — exposes `user`, `loading`, `signIn`, `signOut` |
| `src/Login.tsx` | Login screen shown to unauthenticated users |

The `AuthProvider` wraps the entire app. `AppContent` checks auth state: if loading, shows a spinner; if no user, shows `<Login />`; otherwise renders the router with all routes.

---

## Environment Variables

Two variables required (set in Vercel dashboard and `.env.local` for local dev):

```
VITE_SUPABASE_URL=https://xnqmnhqclbprorcghyeh.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
```

The anon key is safe to expose in the frontend — security is enforced by Row Level Security policies on the database, not by keeping the key secret.

---

## Infrastructure as Code

The database schema is fully declarative and committed to the repo:

```
supabase/
├── config.toml                              — project config
└── migrations/
    └── 20260307053015_init_app_data.sql     — app_data table + RLS policies
```

To reproduce on a new Supabase project:
1. `supabase login --token <your-token>`
2. `supabase link --project-ref <new-ref>`
3. `supabase db push --linked --yes`

---

## Reproducibility Checklist

To set up on a new machine after `git clone`:

1. Install Supabase CLI: `curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C /usr/local/bin supabase`
2. `supabase login --token <token>`
3. `supabase link --project-ref xnqmnhqclbprorcghyeh`
4. Copy env vars into `apps/example/.env.local`
5. `npm install && npm run dev` inside `apps/example`

The Supabase project and all its migrations are already live — no need to re-create it.
