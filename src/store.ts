import type {
  ElevateAction,
  ElevateSubscription,
  ElevateBaseState,
} from './types';
import { getDiffKeys } from './utils';

export class ElevationStore<S extends ElevateBaseState> {
  private state: S;
  private subscriptions: ElevateSubscription<S>[] = [];

  public constructor(state: S) {
    this.state = state;
  }

  public getState(): S {
    return this.state;
  }

  public setState(action: ElevateAction<S>, emit = true): void {
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

  public emit(changedKeys: readonly (keyof S)[]): void {
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
  ): () => void {
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
