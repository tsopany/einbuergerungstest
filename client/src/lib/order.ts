import {ref} from 'vue';

import {random} from '@/lib/random';
import {isPictureOptions} from '@/lib/questions';
import {shuffle} from '#shared/rng';
import type {Question} from '#shared/question';

const KEY = 'shuffle-answers';

function stored(): boolean {
	try {
		return localStorage.getItem(KEY) !== 'off';
	} catch {
		return true;
	}
}

/** Whether answers are shown in a random order (the default) or as the catalogue prints them. */
export const shuffleAnswers = ref(stored());

export function setShuffleAnswers(on: boolean): void {
	shuffleAnswers.value = on;
	try {
		localStorage.setItem(KEY, on ? 'on' : 'off');
	} catch {
		// storage blocked: the choice lasts until reload
	}
}

/** Options that only make sense in their printed order: picture labels ("Bild 1-4") and plain numbers (map labels, ascending figures). */
const isOrdered = (question: Question): boolean => isPictureOptions(question) || question.options.every((option) => /^\d+$/.test(option.trim()));

/** Original option indexes in display order; ordered questions always keep the catalogue order. */
export function optionOrder(question: Question): number[] {
	const fixed = question.options.map((_, index) => index);
	return shuffleAnswers.value && !isOrdered(question) ? shuffle(fixed, random) : fixed;
}
