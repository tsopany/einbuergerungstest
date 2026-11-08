export type Queryable = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };

export async function seedUser(client: Queryable, label: string, email = `${label}@example.com`): Promise<string> {
	const { rows } = await client.query("insert into users (email) values ($1) returning id", [email]);
	return rows[0].id;
}
