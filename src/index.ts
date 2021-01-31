import * as React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StringKeyedObject = Record<string, any>;

export type ElevateStateAction<S> = S | ((state: S) => S);

export type ElevateStateInterface<S> = [
  S,
  (action: ElevateStateAction<S>) => void
];

export type ElevateAction<S extends StringKeyedObject> =
  | Partial<S>
  | ((state: S) => Partial<S>);

export type ElevateSelector<S extends StringKeyedObject, R> = (state: S) => R;

export interface ElevateSubscription<S extends StringKeyedObject> {
  subscribedKeys?: readonly (keyof S)[];
  callback: (nextState: S) => void;
}

export type ObjectKeys<S extends StringKeyedObject> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof S]: S[K] extends readonly any[]
    ? never
    : S[K] extends StringKeyedObject
    ? K
    : never;
} extends { [_K in keyof S]: infer V }
  ? V
  : never;

export type PickObjectKeys<S extends StringKeyedObject> = Pick<
  S,
  ObjectKeys<S>
>;

export interface FieldProps<V, E> {
  value: V;
  onChange: (eventOrValue: E) => void;
}

export interface FieldOptions<V, E, P> {
  transformProps?: (props: FieldProps<V, E>) => P;
  transformValue?: (eventOrValue: E) => V;
}

export interface EnforcedFieldOptions<V, E, P> extends FieldOptions<V, E, P> {
  transformValue: (eventOrValue: E) => V;
}

export type AdditionalFieldArgs<V, E, P> = E extends React.ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>
  ? string extends V
    ? [options?: FieldOptions<V, E, P>]
    : [options: EnforcedFieldOptions<V, E, P>]
  : E extends V
  ? [options?: FieldOptions<V, E, P>]
  : [options: EnforcedFieldOptions<V, E, P>];

export interface ElevateFormInterface<S extends StringKeyedObject> {
  useOnSubmit: (
    callback: (data: S, event: React.FormEvent<HTMLFormElement>) => void
  ) => (event: React.FormEvent<HTMLFormElement>) => void;
  useField: <
    F extends keyof S,
    E = React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    P = FieldProps<S[F], E>
  >(
    fieldName: F,
    ...args: AdditionalFieldArgs<S[F], E, P>
  ) => P;
}

export interface ElevationInterface<S extends StringKeyedObject> {
  useElevated: <R>(
    selector: ElevateSelector<S, R>,
    subscribedKeys?: readonly (keyof S)[]
  ) => R;
  useElevate: () => (action: ElevateAction<S>) => void;
  useElevateState: <K extends keyof S>(key: K) => ElevateStateInterface<S[K]>;
  useElevateForm: <K extends keyof PickObjectKeys<S>>(
    key: K
  ) => ElevateFormInterface<PickObjectKeys<S>[K]>;
  useElevateOnMount: (action: ElevateAction<S>) => void;
  useElevateOnUpdate: (action: ElevateAction<S>) => void;
  useElevateBeforeUnmount: (action: ElevateAction<S>) => void;
  useElevateInitialState: (initialState: S) => void;
}

const isElevateStateActionFunction = <S>(
  action: ElevateStateAction<S>
): action is (state: S) => S => typeof action === 'function';

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

  const useElevate = () => {
    const elevate = React.useCallback((action: ElevateAction<S>): void => {
      store.setState(action);
    }, []);

    return elevate;
  };

  const useElevateState = <K extends keyof S>(
    key: K
  ): ElevateStateInterface<S[K]> => {
    const elevate = useElevate();
    const currentState = useElevated((state) => state[key], [key]);

    const setState = React.useCallback(
      (action: ElevateStateAction<S[K]>) => {
        elevate((previousState) => ({
          ...previousState,
          [key]: isElevateStateActionFunction(action)
            ? action(previousState[key])
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
