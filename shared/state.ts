export type Answer = { questionId: string; correct: boolean; answeredAt: number };

export type QuestionState = {
	attempts: number;
	correctCount: number;
	lastAnsweredAt: number;
	lastResult: boolean;
	/** Leitner box 0-4: a wrong answer drops to 0, a right one moves up one box. */
	box: number;
};

export const MAX_BOX = 4;

/** Everything the trainer knows about a question, rebuilt from the answers alone (oldest first, ties keep their order). */
export function deriveStates(answers: readonly Answer[]): Map<string, QuestionState> {
	const states = new Map<string, QuestionState>();
	const ordered = answers
		.map((answer, index) => ({ answer, index }))
		.sort((a, b) => a.answer.answeredAt - b.answer.answeredAt || a.index - b.index);
	for (const { answer } of ordered) {
		const before = states.get(answer.questionId);
		states.set(answer.questionId, {
			attempts: (before?.attempts ?? 0) + 1,
			correctCount: (before?.correctCount ?? 0) + (answer.correct ? 1 : 0),
			lastAnsweredAt: answer.answeredAt,
			lastResult: answer.correct,
			box: answer.correct ? Math.min((before?.box ?? 0) + 1, MAX_BOX) : 0,
		});
	}
	return states;
}

export const isMastered = (state: QuestionState | undefined): boolean => state?.box === MAX_BOX;
