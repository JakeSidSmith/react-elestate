import * as React from 'react';
import { ElevationStore } from './store';
export * from './types';
// eslint-disable-next-line no-duplicate-imports
import type {
  ElevateAction,
  ElevateSelector,
  ElevateStateAction,
  ElevateStateResult,
  ElevateBaseState,
  ElevateAPI,
} from './types';
import { isElevateStateActionFunction } from './utils';

const createElevation = <S extends ElevateBaseState>(
  defaultState: S
): ElevateAPI<S> => {
  const store = new ElevationStore(defaultState);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useElevated = <R extends any>(
    selector: ElevateSelector<S, R>,
    subscribedKeys?: readonly (keyof S)[]
  ): R => {
    const [state, setState] = React.useState(store.getState());

    React.useEffect(() => {
      const callback = (nextState: S) => {
        setState(nextState);
      };

      const unsubscribe = store.subscribe(subscribedKeys, callback);

      return unsubscribe;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, subscribedKeys);

    return selector(state);
  };

  const useElevate = () => {
    const elevate = React.useCallback((action: ElevateAction<S>): void => {
      store.setState(action);
    }, []);

    return elevate;
  };

  const useElevateState = <K extends keyof S>(
    key: K
  ): ElevateStateResult<S[K]> => {
    const elevate = useElevate();
    const currentState = useElevated((state) => state[key], [key]);

    const setState = React.useCallback(
      (action: ElevateStateAction<S[K]>) => {
        elevate((state) => ({
          ...state,
          [key]: isElevateStateActionFunction(action)
            ? action(state[key])
            : action,
        }));
      },
      [elevate, key]
    );

    return [currentState, setState];
  };

  const useElevateOnMount = (action: ElevateAction<S>): void => {
    React.useEffect(() => {
      store.setState(action);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  };

  const useElevateOnUpdate = (action: ElevateAction<S>): void => {
    React.useEffect(() => {
      store.setState(action);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typeof action === 'function' ? action : Object.values(action)]);
  };

  const useElevateBeforeUnmount = (action: ElevateAction<S>): void => {
    React.useEffect(
      () => () => {
        store.setState(action);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );
  };

  const useElevateInitialState = (initialState: S) => {
    const fired = React.useRef(false);

    if (!fired.current) {
      if (initialState) {
        store.setState(initialState, false);
      }

      fired.current = true;
    }
  };

  return {
    store,
    useElevated,
    useElevate,
    useElevateState,
    useElevateOnMount,
    useElevateOnUpdate,
    useElevateBeforeUnmount,
    useElevateInitialState,
  };
};

export { createElevation };

export default createElevation;
