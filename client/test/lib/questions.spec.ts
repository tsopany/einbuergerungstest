import {imageUrl, isPictureOptions, questionById, questions} from '@/lib/questions';

describe('questions', () => {
	it('holds the whole catalogue by id', () => {
		expect(questions).toHaveLength(310);
		expect(questionById.get('1')?.options[questionById.get('1')!.correct]).toBe('hier Meinungsfreiheit gilt.');
		expect(questionById.get('NW-1')?.part).toBe('state');
	});

	it('tells picture options (four pictures) from a single picture with text options', () => {
		expect(isPictureOptions(questionById.get('21')!)).toBe(true);
		expect(isPictureOptions(questionById.get('55')!)).toBe(false);
		expect(isPictureOptions(questionById.get('1')!)).toBe(false);
	});

	it('serves pictures from the public images folder', () => {
		expect(imageUrl('21-1.png')).toBe('/images/21-1.png');
	});
});
