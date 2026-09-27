-- Permanent shareable URLs (/q/{slug}) and guest credits for each Q&A.
-- Backfills a slug for every existing answered row. Out-of-syllabus rows
-- (sentinel short_answer) never get a slug and never appear publicly.

alter table public.qa_history
  add column if not exists slug    text,
  add column if not exists sources jsonb not null default '[]'::jsonb;

update public.qa_history
set slug =
  coalesce(
    nullif(trim(both '-' from left(regexp_replace(lower(question), '[^a-z0-9]+', '-', 'g'), 60)), ''),
    'q'
  ) || '-' || left(replace(id::text, '-', ''), 5)
where slug is null
  and short_answer <> '__OUT_OF_SYLLABUS__';

create unique index if not exists qa_history_slug_idx on public.qa_history(slug);
create index if not exists qa_history_created_at_idx on public.qa_history(created_at desc);
