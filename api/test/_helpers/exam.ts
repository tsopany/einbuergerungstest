import { questionById } from "@/services/questions";

export const EXAM_IDS = [...Array.from({ length: 30 }, (_, index) => String(index + 1)), "NW-1", "NW-2", "NW-3"];

const correctOf = (id: string) => questionById.get(id)!.correct;
export const wrongOf = (id: string) => (correctOf(id) + 1) % 4;

/** A submission with the first `right` questions right and the rest wrong. */
export const submission = (right: number, ids = EXAM_IDS) => ({
	questionIds: ids,
	answers: ids.map((questionId, index) => ({
		questionId,
		chosen: index < right ? correctOf(questionId) : wrongOf(questionId),
	})),
});
