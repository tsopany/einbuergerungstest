import catalogue from '#shared/questions.json';
import type {Question} from '#shared/question';

export const questions = catalogue as unknown as Question[];

export const questionById: ReadonlyMap<string, Question> = new Map(questions.map((question) => [question.id, question]));

export const isPictureOptions = (question: Question): boolean => question.images.length === 4 && question.options.every((option, index) => option === `Bild ${index + 1}`);

export const imageUrl = (file: string): string => `/images/${file}`;
