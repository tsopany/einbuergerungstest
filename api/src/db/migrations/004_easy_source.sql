alter table answers drop constraint answers_source_check;
alter table answers add constraint answers_source_check check (source in ('practice', 'weak', 'easy', 'exam'));
