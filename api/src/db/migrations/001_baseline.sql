create function set_updated_at() returns trigger as $$
begin
	new.updated_at = now();
	return new;
end;
$$ language plpgsql;

create table users (
	id uuid primary key default gen_random_uuid(),
	email text not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table identities (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references users (id) on delete cascade,
	provider text not null check (provider in ('google')),
	external_id text not null,
	email text not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (provider, external_id)
);
create index identities_user_id_idx on identities (user_id);

create table refresh_tokens (
	token_hash text primary key,
	user_id uuid not null references users (id) on delete cascade,
	family_id uuid not null default gen_random_uuid(),
	used_at timestamptz,
	expires_at timestamptz not null,
	created_at timestamptz not null default now()
);
create index refresh_tokens_user_id_idx on refresh_tokens (user_id);
create index refresh_tokens_family_id_idx on refresh_tokens (family_id);

create trigger users_updated_at before update on users for each row execute function set_updated_at();
create trigger identities_updated_at before update on identities for each row execute function set_updated_at();
