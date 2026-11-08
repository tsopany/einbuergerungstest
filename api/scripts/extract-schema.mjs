import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const out = "../schema.dbml";

process.loadEnvFile(".env");

if (!process.env.DATABASE_URL) {
	console.error("ERROR: DATABASE_URL not found in api/.env");
	process.exit(1);
}

rmSync(out, { force: true });

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

spawnSync(pnpm, ["db2dbml", "postgres", process.env.DATABASE_URL, "-o", out], { stdio: "inherit" });

if (!existsSync(out)) {
	console.error("ERROR: schema.dbml was not created");
	process.exit(1);
}

const dbml = readFileSync(out, "utf8");
const uniqueColumns = new Set();
let table = null;
for (const line of dbml.split("\n")) {
	const tableMatch = line.match(/^Table "([^"]+)" \{/);
	if (tableMatch) table = tableMatch[1];
	const columnMatch = line.match(/^ {2}"([^"]+)" [^[]*\[([^\]]*)\]/);
	if (table && columnMatch && columnMatch[2].split(", ").includes("unique"))
		uniqueColumns.add(`${table}.${columnMatch[1]}`);
}

writeFileSync(
	out,
	dbml.replace(/^(Ref [^\n]* )(\??)<(\??) "([^"]+)"\."([^"]+)"/gm, (ref, head, left, right, refTable, column) =>
		uniqueColumns.has(`${refTable}.${column}`) ? `${head}${left}-${right} "${refTable}"."${column}"` : ref,
	),
);

console.log("schema.dbml created successfully");
