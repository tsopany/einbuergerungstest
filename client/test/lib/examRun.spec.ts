import {clearRun, loadRun, saveRun, type Run} from '@/lib/examRun';

const run: Run = {examId: 5, questionIds: ['1', '21', 'NW-1'], chosen: [['1', 2]], orders: [['1', [3, 1, 0, 2]]], current: 1, deadline: 123};

describe('examRun', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
	});

	it('keeps a run per user and forgets it when cleared', () => {
		saveRun('u1', run);
		expect(loadRun('u1')).toEqual(run);
		expect(loadRun('u2')).toBeNull();
		clearRun('u1');
		expect(loadRun('u1')).toBeNull();
	});

	it.each([
		['not json', '{'],
		['an unknown question', JSON.stringify({...run, questionIds: ['999']})],
		['a position past the end', JSON.stringify({...run, current: 3})],
		['no questions', JSON.stringify({...run, questionIds: [], current: 0})],
		['no deadline', JSON.stringify({...run, deadline: 'soon'})],
		['broken answers', JSON.stringify({...run, chosen: 'x'})]
	])('ignores %s', (_name, stored) => {
		localStorage.setItem('exam-run:u1', stored);
		expect(loadRun('u1')).toBeNull();
	});

	it('does not break when storage is blocked', () => {
		const blocked = () => {
			throw new Error('blocked');
		};
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
		vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
		expect(() => saveRun('u1', run)).not.toThrow();
		expect(() => clearRun('u1')).not.toThrow();
		expect(loadRun('u1')).toBeNull();
	});
});
