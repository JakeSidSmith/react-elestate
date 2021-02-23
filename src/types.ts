import type { ElevationStore } from './store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ElevateBaseState = Record<string, any>;

export type ElevateStateAction<S> = S | ((state: S) => S);

export type ElevateStateInterface<S> = [
  S,
  (action: ElevateStateAction<S>) => void
];

export type ElevateAction<S extends ElevateBaseState> =
  | Partial<S>
  | ((state: S) => Partial<S>);

export type ElevateSelector<S extends ElevateBaseState, R> = (state: S) => R;

export interface ElevateSubscription<S extends ElevateBaseState> {
  subscribedKeys?: readonly (keyof S)[];
  callback: (nextState: S) => void;
}

export interface ElevateAPI<S extends ElevateBaseState> {
  store: ElevationStore<S>;
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
}

export type ElevationInterface<S extends ElevateBaseState> = ElevateAPI<S>;
