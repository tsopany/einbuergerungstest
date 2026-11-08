import type {Rng} from '#shared/rng';

/** Uniform in [0, 1), from the browser's secure generator. */
export const random: Rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
