# Git State

Snapshot of the repository at the latest documentation sync.

- **Remote**: `origin` → `https://github.com/malvinjauhari/bersamakita.git` (public)
- **Default branch**: `main`
- **Commit convention**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`)
- **Workflow**: development happens on `main`; after changes → commit → push → deploy to Vercel (`prod`).

## Note on Secrets in Git History

Earlier commits contained hardcoded Duitku/Admin credentials. Credentials have been removed from the code (Task 03), but they still exist in previous commits (`docs/NOW.md`, `docs/PAYMENT.md` for details). **Rotate the Duitku API Key, Merchant Code, and Admin Secret Key** — consider `git-filter-repo` or squashing history before making the repo widely shared. `.env*` is git-ignored (except `.env.example`).