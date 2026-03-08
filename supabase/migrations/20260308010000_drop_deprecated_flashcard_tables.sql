-- Drop deprecated flashcard tables.
-- Production table is cpp_flashcards_v3; cpp_flashcards and cpp_flashcards_v2 are unused.
drop table if exists cpp_flashcards_v2;
drop table if exists cpp_flashcards;
