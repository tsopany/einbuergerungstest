import {computed, ref, watch} from 'vue';

/** True once every image of the current question has loaded (or failed), so taps cannot land on buttons that are still about to move. */
export function useImagesReady(expected: () => number, question: () => unknown) {
	const settled = ref(0);
	watch(question, () => {
		settled.value = 0;
	});
	return {
		ready: computed(() => settled.value >= expected()),
		onImage: () => {
			settled.value += 1;
		}
	};
}
