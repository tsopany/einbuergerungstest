// Minimal client for the BAMF practice site (Oracle APEX): cookies, form parsing, form submission.
const BASE = "https://oet.bamf.de/ords/oetut/";
const DELAY_MS = 1500;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const decode = (text) =>
	text
		.replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(Number(dec)))
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");

export class Apex {
	constructor() {
		this.cookies = new Map();
		this.last = 0;
	}

	async request(url, init = {}) {
		const wait = this.last + DELAY_MS - Date.now();
		if (wait > 0) await sleep(wait);
		const headers = { "user-agent": "einbuergerungstest-dataset-build (one-off, polite)", ...init.headers };
		if (this.cookies.size) headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
		const response = await fetch(new URL(url, BASE), { ...init, headers, redirect: "manual" });
		this.last = Date.now();
		for (const line of response.headers.getSetCookie?.() ?? []) {
			const [pair] = line.split(";");
			const at = pair.indexOf("=");
			this.cookies.set(pair.slice(0, at).trim(), pair.slice(at + 1));
		}
		if (response.status >= 300 && response.status < 400) {
			return this.request(new URL(response.headers.get("location"), new URL(url, BASE)).href);
		}
		if (!response.ok) throw new Error(`${response.status} for ${url}`);
		return response.text();
	}

	get(url) {
		return this.request(url);
	}

	/** Parses the page's main form: { action, fields: [[name, value]...] }. */
	static form(html) {
		const form = /<form[^>]*id="wwvFlowForm"[^>]*>/.exec(html);
		if (!form) throw new Error("no wwvFlowForm");
		const action = decode(/action="([^"]+)"/.exec(form[0])[1]);
		const fields = new Map();
		for (const tag of html.matchAll(/<input\b[^>]*>/g)) {
			const name = /\bname="([^"]+)"/.exec(tag[0])?.[1];
			const type = /\btype="([^"]+)"/.exec(tag[0])?.[1] ?? "text";
			if (!name || ["button", "submit", "image"].includes(type)) continue;
			fields.set(name, decode(/\bvalue="([^"]*)"/.exec(tag[0])?.[1] ?? ""));
		}
		for (const select of html.matchAll(/<select\b[^>]*\bname="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
			const chosen = /<option value="([^"]*)"[^>]*selected/.exec(select[2]) ?? /<option value="([^"]*)"/.exec(select[2]);
			fields.set(select[1], decode(chosen?.[1] ?? ""));
		}
		return { action, fields };
	}

	/** Submits the page's form the way apex.submit does (p_json with salt, protected items and item values). */
	submit(html, request, overrides = {}) {
		const { action, fields } = Apex.form(html);
		const value = (id) => decode(new RegExp(`id="${id}"[^>]*value="([^"]*)"|value="([^"]*)"[^>]*id="${id}"`).exec(html)?.slice(1).find(Boolean) ?? "");
		const items = new Map([...fields].filter(([name]) => /^P\d+_/.test(name)));
		for (const [name, v] of Object.entries(overrides)) items.set(name, String(v));
		const json = {
			pageItems: {
				itemsToSubmit: [...items].map(([n, v]) => ({ n, v })),
				protected: value("pPageItemsProtected"),
				rowVersion: value("pPageItemsRowVersion"),
				formRegionChecksums: [],
			},
			salt: value("pSalt"),
		};
		const body = new URLSearchParams();
		for (const name of ["p_flow_id", "p_flow_step_id", "p_instance", "p_page_submission_id", "p_reload_on_submit"])
			body.set(name, fields.get(name) ?? "");
		body.set("p_request", request);
		body.set("p_json", JSON.stringify(json));
		return this.request(action, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body,
		});
	}
}
export { decode };
