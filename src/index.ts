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

export type KeysOfType<S extends StringKeyedObject, T> = {
  [K in keyof S]: T extends S[K] ? K : never;
} extends { [_K in keyof S]: infer V }
  ? V
  : never;

export type PickObjectKeys<S extends StringKeyedObject> = Pick<
  S,
  KeysOfType<S, StringKeyedObject>
>;

export type PickStringKeys<S extends StringKeyedObject> = Pick<
  S,
  KeysOfType<S, string>
>;

export type PickNumberKeys<S extends StringKeyedObject> = Pick<
  S,
  KeysOfType<S, number>
>;

export type PickBooleanKeys<S extends StringKeyedObject> = Pick<
  S,
  KeysOfType<S, boolean>
>;

export interface FieldProps<V, E> {
  value: V;
  onChange: (event: E) => void;
}

export interface ElevateFormInterface<S extends StringKeyedObject> {
  useOnSubmit: (
    callback: (data: S, event: React.FormEvent<HTMLFormElement>) => void
  ) => (event: React.FormEvent<HTMLFormElement>) => void;
  useElevateFieldValue: <F extends keyof PickStringKeys<S>>(
    fieldName: F
  ) => {
    value: string;
    onChange: (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => void;
  };
  useElevateFieldNumberValue: <F extends keyof PickNumberKeys<S>>(
    fieldName: F,
    options: { valueWhenNaN: S[F] }
  ) => {
    value: string;
    onChange: (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => void;
  };
  useElevateFieldChecked: <F extends keyof PickBooleanKeys<S>>(
    fieldName: F
  ) => {
    checked: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  };
  useElevateFieldCustom: <F extends keyof S>(
    fieldName: F
  ) => {
    value: S[F];
    onChange: (eventOrValue: S[F]) => void;
  };
}

export interface ElevationInterface<S extends StringKeyedObject> {
  useElevated: <R>(
    selector: ElevateSelector<S, R>,
    subscribedKeys?: readonly (keyof S)[]
  ) => R;
  useElevate: () => (action: ElevateAction<S>) => void;
  useElevateState: <K extends keyof S>(key: K) => ElevateStateInterface<S[K]>;
  useElevateOnMount: (action: ElevateAction<S>) => void;
  useElevateOnUpdate: (action: ElevateAction<S>) => void;
  useElevateBeforeUnmount: (action: ElevateAction<S>) => void;
  useElevateInitialState: (initialState: S) => void;
  createElevationForm: <K extends keyof PickObjectKeys<S>>(
    key: K
  ) => ElevateFormInterface<PickObjectKeys<S>[K]>;
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

  const createElevationForm = <K extends keyof PickObjectKeys<S>>(
    key: K
  ): ElevateFormInterface<PickObjectKeys<S>[K]> => {
    const useOnSubmit = (
      callback: (
        data: PickObjectKeys<S>[K],
        event: React.FormEvent<HTMLFormElement>
      ) => void
    ) => {
      const data = useElevated((state) => state[key]);

      const onSubmit = React.useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
          event.preventDefault();

          callback(data, event);
        },
        [callback, data]
      );

      return onSubmit;
    };

    const useElevateFieldValue = <F extends keyof PickStringKeys<S[K]>>(
      fieldName: F
    ) => {
      const elevate = useElevate();
      const value = useElevated((state) => state[key][fieldName]) ?? '';

      const onChange = React.useCallback(
        (
          event: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >
        ) => {
          elevate((state) => ({
            ...state,
            [key]: {
              ...state[key],
              [fieldName]: event.currentTarget.value,
            },
          }));
        },
        [fieldName, elevate]
      );

      const props = React.useMemo(
        () => ({
          value,
          onChange,
        }),
        [value, onChange]
      );

      return props;
    };

    const useElevateFieldNumberValue = <F extends keyof PickNumberKeys<S[K]>>(
      fieldName: F,
      options: { valueWhenNaN: S[K][F] }
    ) => {
      const elevate = useElevate();
      const numberValue = useElevated((state) => state[key][fieldName]);
      const value =
        (typeof numberValue === 'number'
          ? numberValue.toString()
          : numberValue) ?? '';

      const onChange = React.useCallback(
        (
          event: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >
        ) => {
          const nextValue = parseFloat(event.currentTarget.value);

          elevate((state) => ({
            ...state,
            [key]: {
              ...state[key],
              [fieldName]: Number.isNaN(nextValue)
                ? options.valueWhenNaN
                : nextValue,
            },
          }));
        },
        [fieldName, elevate, options.valueWhenNaN]
      );

      const props = React.useMemo(
        () => ({
          value,
          onChange,
        }),
        [value, onChange]
      );

      return props;
    };

    const useElevateFieldChecked = <F extends keyof PickBooleanKeys<S[K]>>(
      fieldName: F
    ) => {
      const elevate = useElevate();
      const checked = useElevated((state) => state[key][fieldName]) ?? false;

      const onChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
          elevate((state) => ({
            ...state,
            [key]: {
              ...state[key],
              [fieldName]: event.currentTarget.checked,
            },
          }));
        },
        [fieldName, elevate]
      );

      const props = React.useMemo(
        () => ({
          checked,
          onChange,
        }),
        [checked, onChange]
      );

      return props;
    };

    const useElevateFieldCustom = <F extends keyof S[K]>(fieldName: F) => {
      const elevate = useElevate();
      const value = useElevated((state) => state[key][fieldName]);

      const onChange = React.useCallback(
        (nextValue: S[K][F]) => {
          elevate((state) => ({
            ...state,
            [key]: {
              ...state[key],
              [fieldName]: nextValue,
            },
          }));
        },
        [fieldName, elevate]
      );

      const props = React.useMemo(
        () => ({
          value,
          onChange,
        }),
        [value, onChange]
      );

      return props;
    };

    return {
      useOnSubmit,
      useElevateFieldValue,
      useElevateFieldChecked,
      useElevateFieldCustom,
      useElevateFieldNumberValue,
    };
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
    createElevationForm,
  };
};

export { createElevation };

export default createElevation;
