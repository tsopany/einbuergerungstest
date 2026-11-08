import {nextTick, ref} from 'vue';

import {useImagesReady} from '@/lib/imagesReady';

describe('useImagesReady', () => {
	it('is ready at once without images and waits for every image otherwise', () => {
		const images = ref(2);
		const {ready, onImage} = useImagesReady(
			() => images.value,
			() => 'q'
		);
		expect(ready.value).toBe(false);
		onImage();
		expect(ready.value).toBe(false);
		onImage();
		expect(ready.value).toBe(true);
		images.value = 0;
		expect(ready.value).toBe(true);
	});

	it('starts over when the question changes', async () => {
		const id = ref('1');
		const {ready, onImage} = useImagesReady(
			() => 1,
			() => id.value
		);
		onImage();
		expect(ready.value).toBe(true);
		id.value = '2';
		await nextTick();
		expect(ready.value).toBe(false);
	});
});
