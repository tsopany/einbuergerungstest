// Builds the dataset from the PDF extraction (leben-in-deutschland-app extractor), the app's preliminary
// keys and the stored BAMF pages. Writes shared/questions.json, client/public/images/*.png,
// data/questions_en.json (for us only) and data/verification.md. Fails on any broken invariant.
//
//   node data/build/build.mjs --source <clone of leben-in-deutschland-app, extract.mjs already run>
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decode } from "./lib-apex.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const rawDir = path.join(here, "bamf_raw");
const PICTURE_IDS = ["21", "55", "70", "130", "176", "181", "187", "209", "216", "226", "235", "NW-1", "NW-8"];
const TOTAL = 310;

export const norm = (text) =>
	text
		.normalize("NFC")
		.replaceAll("…", "...")
		.replace(/[„“”«»‚‘’‹›]/g, '"')
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();

const STOP = new Set(["der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einer", "eines", "er", "sie", "und"]);

/** Comparison form: no diacritics, articles or pronouns, feminine twins ("Bürgerin" next to "Bürger") dropped, word order ignored. */
export function canon(text) {
	const tokens = norm(text)
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.split(/[^\p{L}\p{N}]+/u)
		.filter((token) => token && !STOP.has(token));
	const twin = (token) => {
		const base = token.replace(/(innen|in)$/, "");
		return base !== token && tokens.some((other) => [base, `${base}n`, `${base}en`, `${base}s`].includes(other));
	};
	return tokens
		.filter((token) => !twin(token))
		.sort()
		.join(" ");
}

const grams = (text) => {
	const flat = canon(text).replace(/\s+/g, "");
	const out = new Map();
	for (let i = 0; i < flat.length - 1; i++) out.set(flat.slice(i, i + 2), (out.get(flat.slice(i, i + 2)) ?? 0) + 1);
	return { out, size: Math.max(flat.length - 1, 0) };
};

/** Dice coefficient over character pairs; absorbs gender-form, spelling and punctuation differences between PDF and site. */
export function similarity(a, b) {
	const left = grams(a);
	const right = grams(b);
	let shared = 0;
	for (const [gram, count] of left.out) shared += Math.min(count, right.out.get(gram) ?? 0);
	return left.size + right.size === 0 ? 1 : (2 * shared) / (left.size + right.size);
}

const permutations = (items) => (items.length <= 1 ? [items] : items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest])));

/** Pairs every BAMF option with exactly one PDF option (best total similarity); null when not clearly one way. */
export function pairOptions(pdf, bamf) {
	if (pdf.every((text) => /^Bild \d$/.test(text)) && bamf.every((text) => /^\d$/.test(text.trim()))) return bamf.map((text) => Number(text) - 1);
	const exact = bamf.map((text) => pdf.map((candidate, index) => (canon(candidate) === canon(text) ? index : -1)).filter((index) => index >= 0));
	if (exact.every((hits) => hits.length === 1) && new Set(exact.flat()).size === 4) return exact.flat();
	const scored = permutations([0, 1, 2, 3])
		.map((pairs) => ({ pairs, scores: pairs.map((index, at) => similarity(bamf[at], pdf[index])) }))
		.map((entry) => ({ ...entry, total: entry.scores.reduce((sum, score) => sum + score, 0) }))
		.sort((x, y) => y.total - x.total);
	const [best, next] = scored;
	return Math.min(...best.scores) >= 0.6 && best.total - next.total >= 0.3 ? best.pairs : null;
}

const setKey = (answers) => answers.map(norm).sort().join("\u0001");
const textKey = (question, answers) => `${norm(question)}\u0002${setKey(answers)}`;

/** Parses a stored BAMF page: { n, options: [{ text, correct }] }. */
export function parseBamf(html) {
	const n = Number(/Aufgabe\s+(\d+)\s+von\s+\d+/.exec(html)?.[1]);
	const rows = [...html.matchAll(/(falsche|richtige) Antwort =>[\s\S]*?headers="ANTWORT"[^>]*>([\s\S]*?)<\/td>/g)];
	const options = rows.map((row) => ({
		text: decode(row[2].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim(),
		correct: row[1] === "richtige",
	}));
	return { n, options };
}

function readArgs() {
	const at = process.argv.indexOf("--source");
	if (at < 0 || !process.argv[at + 1]) throw new Error("--source <leben-in-deutschland-app clone> is required");
	return path.resolve(process.argv[at + 1]);
}

function pdfQuestions(source) {
	const catalogue = JSON.parse(readFileSync(path.join(source, "src/catalogue/data/bamf-catalogue.json"), "utf8")).questions;
	const general = catalogue.filter((q) => q.part === "general");
	const state = catalogue.filter((q) => q.stateCode === "NW");
	if (general.length !== 300 || state.length !== 10) throw new Error(`catalogue has ${general.length} general and ${state.length} NW questions`);
	return [...general, ...state];
}

function appKeys(source) {
	const rows = JSON.parse(readFileSync(path.join(source, "src/web/data/question.json"), "utf8"));
	const index = new Map();
	for (const row of rows) {
		const answers = { a: row.a, b: row.b, c: row.c, d: row.d };
		const key = textKey(row.question, Object.values(answers));
		if (!index.has(key)) index.set(key, { row, answers });
	}
	return index;
}

export function buildDataset(source) {
	const pdf = pdfQuestions(source);
	const app = appKeys(source);
	const report = { unresolved: [], gaps: [], appDisagreements: [], textMismatches: [], overrides: [], appMatched: 0 };
	const overrides = existsSync(path.join(here, "overrides.json")) ? JSON.parse(readFileSync(path.join(here, "overrides.json"), "utf8")) : {};
	const questions = [];
	const english = [];

	pdf.forEach((q, position) => {
		const id = q.num;
		const bamfNumber = position + 1;
		const answers = q.answers;
		const bamf = parseBamf(readFileSync(path.join(rawDir, `${String(bamfNumber).padStart(3, "0")}.html`), "utf8"));
		if (bamf.n !== bamfNumber) throw new Error(`${id}: stored BAMF page is Aufgabe ${bamf.n}, expected ${bamfNumber}`);
		if (bamf.options.length !== 4 || bamf.options.filter((o) => o.correct).length !== 1) throw new Error(`${id}: BAMF page has no single key`);

		let correct;
		const sameAsSet = setKey(bamf.options.map((o) => o.text)) === setKey(answers);
		if (sameAsSet) {
			const keyText = norm(bamf.options.find((o) => o.correct).text);
			correct = answers.findIndex((a) => norm(a) === keyText);
		} else {
			const pairs = pairOptions(answers, bamf.options.map((o) => o.text));
			const mismatch = { id, pdf: answers, bamf: bamf.options.map((o) => o.text), pairs };
			report.textMismatches.push(mismatch);
			if (pairs) {
				correct = pairs[bamf.options.findIndex((o) => o.correct)];
				mismatch.keyed = { bamf: bamf.options.find((o) => o.correct).text, pdf: answers[correct] };
			}
		}
		if (overrides[id] !== undefined) {
			report.overrides.push({ id, index: overrides[id], note: "set by hand in overrides.json" });
			correct = overrides[id];
		}
		if (correct === undefined || correct === -1) {
			report.unresolved.push(id);
			return;
		}

		const preliminary = app.get(textKey(q.question, answers));
		if (preliminary) {
			report.appMatched += 1;
			const letter = preliminary.row.solution;
			const appIndex = answers.findIndex((a) => norm(a) === norm(preliminary.answers[letter]));
			if (appIndex !== correct) report.appDisagreements.push({ id, app: appIndex, bamf: correct });
			const t = preliminary.row.translation?.en;
			if (t) {
				const byText = new Map(Object.entries(preliminary.answers).map(([l, text]) => [norm(text), t[l]]));
				english.push({ id, text: t.question, options: answers.map((a) => byText.get(norm(a)) ?? null) });
			}
		} else {
			report.gaps.push(id);
		}

		questions.push({
			id,
			part: q.part,
			text: q.question,
			options: answers,
			correct,
			images: (q.images ?? []).map((image) => path.basename(image)),
			...(q.credit ? { credit: q.credit } : {}),
		});
	});
	if (report.unresolved.length) {
		for (const m of report.textMismatches) process.stderr.write(`${m.id}\n  PDF : ${JSON.stringify(m.pdf)}\n  BAMF: ${JSON.stringify(m.bamf)}\n`);
		throw new Error(`${report.unresolved.length} questions without a verified key: ${report.unresolved.join(", ")}`);
	}
	return { questions, english, report, pdf };
}

function check(questions) {
	if (questions.length !== TOTAL) throw new Error(`${questions.length} questions, expected ${TOTAL}`);
	const ids = new Set(questions.map((q) => q.id));
	if (ids.size !== TOTAL) throw new Error("duplicate ids");
	for (const q of questions) {
		if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) throw new Error(`${q.id}: key ${q.correct}`);
		if (q.options.length !== 4) throw new Error(`${q.id}: ${q.options.length} options`);
	}
	const pictured = questions.filter((q) => q.images.length).map((q) => q.id);
	if (pictured.join() !== PICTURE_IDS.join()) throw new Error(`picture questions differ: ${pictured.join(" ")}`);
}

function writeReport(report, questions) {
	const verified = questions.length;
	const lines = [
		"# Verification",
		"",
		`Generated by \`data/build/build.mjs\`. Source of texts: \`gesamtfragenkatalog-lebenindeutschland.pdf\` (Stand 07.05.2025). Authoritative keys: the BAMF practice site (\`oet.bamf.de\`, Nordrhein-Westfalen), raw pages in \`data/build/bamf_raw/\`.`,
		"",
		`- Questions verified against BAMF: **${verified}/${TOTAL}** (each BAMF page has exactly one marked answer and four options that match the PDF's, see below)`,
		`- Matched to the app's preliminary keys by question text and answer set: ${report.appMatched}`,
		`- Without a preliminary key (filled from BAMF only): ${report.gaps.length}${report.gaps.length ? ` — ${report.gaps.join(", ")}` : ""}`,
		`- Preliminary key differs from BAMF key: ${report.appDisagreements.length}${report.appDisagreements.length ? "" : " (none)"}`,
		`- PDF option text differs from BAMF option text (all paired unambiguously): ${report.textMismatches.length}${report.textMismatches.length ? "" : " (none)"}`,
		`- Keys set by hand (overrides.json): ${report.overrides.length}${report.overrides.length ? "" : " (none)"}`,
		"",
	];
	for (const d of report.appDisagreements) lines.push(`- ${d.id}: app key index ${d.app}, BAMF key index ${d.bamf} (BAMF wins)`);
	if (report.textMismatches.length) lines.push('', 'Option texts that differ between PDF and site (gender forms, spelling, punctuation); paired by canonical form, key shown as site text -> PDF text:');
	for (const m of report.textMismatches) lines.push(`- ${m.id}: ${JSON.stringify(m.keyed.bamf)} -> ${JSON.stringify(m.keyed.pdf)}`);
	for (const o of report.overrides) lines.push(`- ${o.id}: key index ${o.index}, ${o.note}`);
	lines.push("", "The BAMF site shows the question stem as an image, so pages are matched to the PDF by position (Aufgabe 1–300 = general 1–300, 301–310 = NW-1–NW-10) and confirmed by the four option texts.", "");
	return lines.join("\n");
}

const MAX_SIDE = 1000;

/** The PDF holds some pictures at print size (up to 14 MB); screens need at most MAX_SIDE px. Needs macOS `sips`. */
function shrink(file) {
	const info = spawnSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file], { encoding: "utf8" });
	if (info.status !== 0) throw new Error("sips (macOS) is needed to shrink the pictures");
	const [width, height] = [...info.stdout.matchAll(/pixel(?:Width|Height): (\d+)/g)].map((m) => Number(m[1]));
	if (Math.max(width, height) > MAX_SIDE) spawnSync("sips", ["-Z", String(MAX_SIDE), file], { encoding: "utf8" });
}

function run() {
	const source = readArgs();
	const { questions, english, report } = buildDataset(source);
	check(questions);
	const imagesOut = path.join(root, "client/public/images");
	rmSync(imagesOut, { recursive: true, force: true });
	mkdirSync(imagesOut, { recursive: true });
	for (const q of questions)
		for (const image of q.images) {
			const from = path.join(source, "src/catalogue/output/images", image);
			if (!existsSync(from)) throw new Error(`${q.id}: image ${image} missing`);
			const to = path.join(imagesOut, image);
			copyFileSync(from, to);
			shrink(to);
		}
	writeFileSync(path.join(root, "shared/questions.json"), `${JSON.stringify(questions, null, "\t")}\n`);
	writeFileSync(path.join(root, "data/questions_en.json"), `${JSON.stringify(english, null, "\t")}\n`);
	writeFileSync(path.join(root, "data/verification.md"), writeReport(report, questions));
	process.stdout.write(`${questions.length} questions, ${english.length} translations, ${report.gaps.length} without preliminary key, ${report.appDisagreements.length} disagreements, ${report.textMismatches.length} text mismatches\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	run();
}
