# asktgp

- [PRD.md](PRD.md) is the spec. Read it before changing behaviour or design, and record every decision change in its Changelog.
- Mockups live in [design-reference/](design-reference/). When the PRD and the mockups disagree, the PRD wins.
- Mobile first: build and check at 375px before desktop (PRD §9.0).
- Database changes go in a numbered file in [supabase/](supabase/) and are applied by hand in the Supabase SQL Editor. Every new table gets RLS enabled and anon/authenticated revoked ([SECURITY.md](SECURITY.md)).
- `main` auto-deploys to production on Vercel. Work on a branch; merge only when Kedar says so.
