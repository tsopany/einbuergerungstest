import {optionOrder, setShuffleAnswers, shuffleAnswers} from '@/lib/order';
import {questionById} from '@/lib/questions';

const text = questionById.get('1')!;
const pictures = questionById.get('21')!;
const numbers = questionById.get('NW-8')!;

describe('order', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		setShuffleAnswers(false);
	});

	it('keeps the catalogue order while shuffling is off', () => {
		setShuffleAnswers(false);
		expect(optionOrder(text)).toEqual([0, 1, 2, 3]);
	});

	it('shows every option once in a random order while shuffling is on, and remembers the choice', () => {
		setShuffleAnswers(true);
		expect(shuffleAnswers.value).toBe(true);
		expect(localStorage.getItem('shuffle-answers')).toBe('on');
		const orders = new Set(Array.from({length: 40}, () => optionOrder(text).join('')));
		expect(orders.size).toBeGreaterThan(1);
		for (const order of orders) expect([...order].map(Number).sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
	});

	it('never shuffles picture questions, whose options are labelled Bild 1 to 4', () => {
		setShuffleAnswers(true);
		expect(optionOrder(pictures)).toEqual([0, 1, 2, 3]);
	});

	it('never shuffles options that are plain numbers, such as the map labels 1 to 4', () => {
		setShuffleAnswers(true);
		expect(optionOrder(numbers)).toEqual([0, 1, 2, 3]);
		expect(optionOrder(questionById.get('24')!)).toEqual([0, 1, 2, 3]);
	});

	it('still switches when storage is blocked', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		setShuffleAnswers(true);
		expect(shuffleAnswers.value).toBe(true);
	});
});
