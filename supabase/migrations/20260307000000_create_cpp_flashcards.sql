create table if not exists cpp_flashcards (
  id           bigserial primary key,
  chapter      text not null,
  topic        text not null default '',
  note_section text not null default '',
  q            text not null,
  a            text not null,
  importance   int not null default 0
);
