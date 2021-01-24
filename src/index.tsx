import * as React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StringKeyedObject = Record<string, any>;

export type ElevateAction<S extends StringKeyedObject> =
  | Partial<S>
  | ((state: S) => Partial<S>);

export type ElevateSelector<S extends StringKeyedObject, R> = (state: S) => R;

interface ElevateSubscription<S extends StringKeyedObject> {
  subscribedKeys?: readonly (keyof S)[];
  callback: (nextState: S) => void;
}

export interface ElevationInterface<S extends StringKeyedObject> {
  useElevated: <R>(
    selector: ElevateSelector<S, R>,
    subscribedKeys?: readonly (keyof S)[]
  ) => R;
  useElevateInitialState: (initialState: S) => void;
  useElevate: () => (action: ElevateAction<S>) => void;
  useElevateOnMount: (action: ElevateAction<S>) => void;
  useElevateOnUpdate: (action: ElevateAction<S>) => void;
  useElevateBeforeUnmount: (action: ElevateAction<S>) => void;
}

const getDiffKeys = <S extends StringKeyedObject>(
  state: S,
  nextState: Partial<S>
) => {
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

class ElevationStore<S extends StringKeyedObject> {
  private state: S;
  private subscriptions: ElevateSubscription<S>[] = [];

  public constructor(state: S) {
    this.state = state;
  }

  public getState() {
    return this.state;
  }

  public setState(action: ElevateAction<S>, emit = true) {
    const nextState = {
      ...this.state,
      ...(typeof action === 'function' ? action(this.state) : action),
    };
    const changedKeys = getDiffKeys(nextState, this.state);

    if (!changedKeys.length) {
      return;
    }

    this.state = nextState;

    if (emit) {
      this.emit(changedKeys);
    }
  }

  public emit(changedKeys: readonly (keyof S)[]) {
    this.subscriptions.forEach(({ subscribedKeys, callback }) => {
      if (!subscribedKeys) {
        callback(this.state);
      } else if (subscribedKeys.length) {
        const anyChanged = subscribedKeys.some((key) =>
          changedKeys.includes(key)
        );

        if (anyChanged) {
          callback(this.state);
        }
      }
    });
  }

  public subscribe(
    subscribedKeys: readonly (keyof S)[] | undefined,
    callback: (nextState: S) => void
  ) {
    if (
      !this.subscriptions.find(
        (subscription) => subscription.callback === callback
      )
    ) {
      this.subscriptions.push({
        subscribedKeys,
        callback,
      });
    }

    const unsubscribe = () => {
      const index = this.subscriptions.findIndex(
        (subscription) => subscription.callback === callback
      );

      if (index >= 0) {
        this.subscriptions.splice(index, 1);
      }
    };

    return unsubscribe;
  }
}

const createElevation = <S extends StringKeyedObject>(
  defaultState: S
): ElevationInterface<S> => {
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

  const useElevateInitialState = (initialState: S) => {
    const fired = React.useRef(false);

    if (!fired.current) {
      if (initialState) {
        store.setState(initialState, false);
      }

      fired.current = true;
    }
  };

  const useElevate = () => {
    const elevate = React.useCallback((action: ElevateAction<S>): void => {
      store.setState(action);
    }, []);

    return elevate;
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
    }, [action]);
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

  return {
    useElevated,
    useElevateInitialState,
    useElevate,
    useElevateOnMount,
    useElevateOnUpdate,
    useElevateBeforeUnmount,
  };
};

export { createElevation };

export default createElevation;
