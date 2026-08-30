import type { MotiTransitionProp } from 'moti';

// moti 0.30's MotiTransitionProp intersects TransitionConfig with Partial<Record<keyof Animate, TransitionConfig>>;
// with react-native-reanimated v4's WithSpringConfig union that intersection wrongly rejects plain
// timing configs when Animate can't be inferred at the call site. Typed as MotiTransitionProp<any> to
// match every MotiView usage without re-triggering that false-positive per call site.
const timing = (duration: number): MotiTransitionProp<any> => ({ type: 'timing', duration }) as MotiTransitionProp<any>;

export const pressTransition = timing(120);
export const screenEnterTransition = timing(350);
export const contentEnterTransition = timing(400);
export const authEnterTransition = timing(450);
export const tabSlideTransition = timing(220);

// Radar-style outward ping — used for the Emergency screen's expanding rings. Several rings share
// this with staggered `delay`s so a new one is always mid-pulse, giving a continuous radar look.
export const radarRingTransition = (delay: number): MotiTransitionProp<any> =>
  ({ type: 'timing', duration: 2400, loop: true, delay, repeatReverse: false }) as MotiTransitionProp<any>;
