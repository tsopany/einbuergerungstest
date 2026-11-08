// Reads the 310 questions of the official BAMF practice site (Nordrhein-Westfalen) and keeps the raw
// answer section of every page in bamf_raw/<NNN>.html, so the site is never scraped twice.
//
//   node data/build/scrape-bamf.mjs        # skips pages already stored
//
// The site shows the question stem as an image, so only the four options and which one is marked
// "richtige Antwort" are read here; build.mjs matches them to the PDF by option text.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Apex } from "./lib-apex.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.join(here, "bamf_raw");
const TOTAL = 310;
const NORDRHEIN_WESTFALEN = 9;

export const fileFor = (n) => path.join(rawDir, `${String(n).padStart(3, "0")}.html`);

/** The part of a question page that holds the header and the options. */
export function answerSection(html) {
	const start = html.indexOf('class="RegionHeader"');
	const end = html.indexOf("Gehe zu Aufgabe");
	if (start < 0 || end < 0 || end < start) throw new Error("unexpected page layout");
	return html.slice(start, end);
}

export function rowNumbers(html) {
	const select = /<select[^>]*name="P30_ROWNUM"[^>]*>([\s\S]*?)<\/select>/.exec(html)?.[1] ?? "";
	return new Map([...select.matchAll(/<option value="([^"]*)"[^>]*>\s*(\d+)\s*<\/option>/g)].map((m) => [Number(m[2]), m[1]]));
}

async function run() {
	mkdirSync(rawDir, { recursive: true });
	const apex = new Apex();
	let page = await apex.submit(await apex.get("f?p=514:1"), "SUBMIT", { P1_BUL_ID: NORDRHEIN_WESTFALEN });
	const rows = rowNumbers(page);
	if (rows.size !== TOTAL) throw new Error(`expected ${TOTAL} entries in the question list, found ${rows.size}`);
	for (let n = 1; n <= TOTAL; n++) {
		if (existsSync(fileFor(n))) continue;
		page = await apex.submit(page, "P30_ROWNUM", { P30_ROWNUM: rows.get(n) });
		const header = /Aufgabe\s+(\d+)\s+von\s+(\d+)/.exec(page);
		if (!header || Number(header[1]) !== n || Number(header[2]) !== TOTAL) throw new Error(`asked for ${n}, got ${header?.[0] ?? "no question"}`);
		writeFileSync(fileFor(n), `${answerSection(page)}\n`);
		if (n % 25 === 0) process.stdout.write(`${n}/${TOTAL}\n`);
	}
	process.stdout.write("done\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await run();
}
