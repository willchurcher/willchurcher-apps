/**
 * Pipeline setup — creates Supabase tables.
 * Run once: npx tsx scripts/pipeline/00-setup.ts
 */
import 'dotenv/config'
import { runSQL } from './db.ts'

await runSQL(`
  CREATE TABLE IF NOT EXISTS cpp_lessons (
    id             bigserial PRIMARY KEY,
    chapter        text NOT NULL,
    lesson_number  text NOT NULL,
    lesson_title   text NOT NULL,
    slug           text NOT NULL UNIQUE,
    url            text NOT NULL,
    raw_html       text,
    clean_text     text,
    formatted_notes text,
    scraped_at     timestamptz,
    extracted_at   timestamptz,
    formatted_at   timestamptz,
    cards_at       timestamptz,
    created_at     timestamptz DEFAULT now()
  );
`)
console.log('✓ cpp_lessons table ready')

await runSQL(`
  CREATE TABLE IF NOT EXISTS cpp_flashcards_v3 (
    id             bigserial PRIMARY KEY,
    lesson_id      bigint REFERENCES cpp_lessons(id),
    chapter        text NOT NULL,
    lesson_number  text NOT NULL,
    lesson_title   text NOT NULL,
    topic          text,
    note_section   text,
    q              text NOT NULL,
    a              text NOT NULL,
    importance     int  NOT NULL DEFAULT 0,
    created_at     timestamptz DEFAULT now()
  );
`)
console.log('✓ cpp_flashcards_v3 table ready')

console.log('\nSetup complete.')
