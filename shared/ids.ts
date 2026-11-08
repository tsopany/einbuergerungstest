export const GENERAL_COUNT = 300;
export const STATE_COUNT = 10;
export const QUESTION_COUNT = GENERAL_COUNT + STATE_COUNT;

export const EXAM = { total: 33, general: 30, state: 3, minutes: 60, passMark: 17 } as const;

const ID = /^(?:(\d{1,3})|NW-(\d{1,2}))$/;

export const idNumber = (id: string): { part: "general" | "state"; number: number } | null => {
	const match = ID.exec(id);
	if (!match) return null;
	const part = match[1] ? "general" : "state";
	const number = Number(match[1] ?? match[2]);
	const max = part === "general" ? GENERAL_COUNT : STATE_COUNT;
	return number >= 1 && number <= max ? { part, number } : null;
};

export const QUESTION_IDS: readonly string[] = [
	...Array.from({ length: GENERAL_COUNT }, (_, index) => String(index + 1)),
	...Array.from({ length: STATE_COUNT }, (_, index) => `NW-${index + 1}`),
];

/** Catalogue order: general questions by number, then the state questions. */
export const compareIds = (a: string, b: string): number => {
	const left = idNumber(a);
	const right = idNumber(b);
	if (!left || !right) return a.localeCompare(b);
	if (left.part !== right.part) return left.part === "general" ? -1 : 1;
	return left.number - right.number;
};

export const isQuestionId = (id: string): boolean => idNumber(id) !== null;
