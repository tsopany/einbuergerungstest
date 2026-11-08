create table exams (
	id serial primary key,
	user_id uuid not null references users (id) on delete cascade,
	started_at timestamptz not null default now(),
	finished_at timestamptz,
	score smallint check (score between 0 and 33),
	passed boolean,
	check ((finished_at is null) = (score is null) and (score is null) = (passed is null))
);
create index exams_user_id_idx on exams (user_id, started_at);

create table answers (
	id serial primary key,
	user_id uuid not null references users (id) on delete cascade,
	question_id text not null,
	chosen smallint not null check (chosen between 0 and 3),
	correct boolean not null,
	answered_at timestamptz not null default now(),
	source text not null check (source in ('practice', 'weak', 'exam')),
	exam_id integer references exams (id) on delete cascade,
	check ((source = 'exam') = (exam_id is not null))
);
create index answers_user_question_idx on answers (user_id, question_id, answered_at);
create index answers_exam_id_idx on answers (exam_id);

create table user_meta (
	user_id uuid not null references users (id) on delete cascade,
	key text not null,
	value jsonb not null,
	primary key (user_id, key)
);
