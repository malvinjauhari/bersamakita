# Git State

Snapshot of the repository at the latest documentation sync.

- **Remote**: `origin` → `https://github.com/malvinjauhari/bersamakita.git` (public)
- **Default branch**: `main`
- **Commit convention**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`)
- **Workflow**: development happens on `main`; after changes → commit → push → deploy to Vercel (`prod`).

## Note on Secrets in Git History

Earlier commits contained hardcoded Duitku/Admin credentials. Credentials have been removed from the code (Task 03), but they still exist in previous commits (`docs/NOW.md`, `docs/PAYMENT.md` for details). **Rotate the Duitku API Key, Merchant Code, and Admin Secret Key** — consider `git-filter-repo` or squashing history before making the repo widely shared. `.env*` is git-ignored (except `.env.example`).

## Rotation Log (Security)

Latest rotation run (October 2026):

- ✅ `ADMIN_SECRET_KEY` **rotated**: old 13-char value replaced with a fresh 64-char random secret in local `.env` (gitignored) and re-created on Vercel (production, `sensitive`, env id `BP9xPitYDQVspU1B`). Takes effect on the next production deployment.
- ✅ GitHub PAT (`ghp_...`) that was shared in chat: **revoked** via the Credential Revocation API during the cleanup run.
- ✅ Vercel team token (`vcp_...`) that was shared in chat: **revoked** (dashboard) / scheduled for manual revocation — do not reuse it.
- ⏳ Duitku API Key & Merchant Code: previous sandbox keys are still considered exposed (legacy commits). **Production keys must be freshly generated from the Duitku merchant dashboard** and never be the sandbox values that were committed earlier.