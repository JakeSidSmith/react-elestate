import * as React from 'react';
import type { ElevateStateAction, ElevateBaseState } from './types';

const isElevateStateActionFunction = <S>(
  action: ElevateStateAction<S>
): action is (state: S) => S => typeof action === 'function';

const getDiffKeys = <S extends ElevateBaseState>(
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

const useSubsequentEffect = (
  callback: React.EffectCallback,
  deps: React.DependencyList
): void => {
  const calledOnce = React.useRef(false);

  React.useEffect(() => {
    if (calledOnce.current) {
      callback();
    }

    calledOnce.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps]);
};

export { isElevateStateActionFunction, getDiffKeys, useSubsequentEffect };
