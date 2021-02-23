import type { ElevateStateAction, ElevateBaseState } from './types';

export const isElevateStateActionFunction = <S>(
  action: ElevateStateAction<S>
): action is (state: S) => S => typeof action === 'function';

export const getDiffKeys = <S extends ElevateBaseState>(
  state: S,
  nextState: Partial<S>
): readonly (keyof S)[] => {
  const keys: readonly (keyof S)[] = [
    ...Object.keys(state),
    ...Object.keys(nextState),
  ];

  return keys.reduce<readonly (keyof S)[]>((changed, key) => {
    if (nextState[key] !== state[key] && !changed.includes(key)) {
      return [...changed, key];
    }

    return changed;
  }, []);
};
