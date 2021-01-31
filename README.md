# react-elestate

**Elevate your React state for access anywhere**

## About

A tiny state sharing library (< 3KB), with zero dependencies (if you exclude React), built on top of React's existing hooks, with TypeScript in mind.

This library is intended primarily for use when building apps, not libraries, however, if used correctly, could be utilized for library state management.

Unlike other state management libraries elestate takes a global-second approach. Do not elevate your state unless it _needs_ to be shared between components. You should use local component state wherever needed and only elevate this state when you find that it is needed elsewhere. This allows much faster initial development with only minor changes when you need to elevate some state.

Additionally, although you may want to create a single elevation for your entire app, there's no harm in having elevations for individual areas in the same way that you might use context.

This library does some clever diffing of values behind the scenes so if you try to elevate the same state twice your components will not update. This is handled by a shallow comparison on the elevation's values. As a result you should not mutate any state from the elevation as it may not cause your components to update.

By default access of elevated state will listen for any changes to the elevated state, but you can provide a list of keys that you wish to subscribe to (and I recommend doing this) which will result in less re-renders and a more performant app.

## Installation

```shell
npm i react-elestate -P
```

## Usage

Note: All of these examples will use TypeScript and ES6 (or higher) syntax.

### createElevation

Unlike other state management libraries elestate requires you to create all your utilities at once which allows them to share types (if you're using TypeScript, so your components cannot get out of sync with the elevation state) and have access to one central store (per elevation) without using context (which is extra boilerplate and can cause unnecessary updates).

Let's create an elevation for a counter. Create a new file for our elevation (we'll call it `counter-elevation.ts`) and put the following in it:

```tsx
import createElevation from 'react-elestate';

export interface ElevatedState {
  count: number;
}

const {
  useElevated,
  useElevate,
  useElevateOnMount,
  useElevateOnUpdate,
  useElevateBeforeUnmount,
  useElevateInitialState,
} = createElevation<ElevatedState>({ count: 0 });
```

We provide this with a default state, but we can also supply an [initial state](#useElevateInitialState) to override this for server side rendering.

You can see here that the returned object contains several hooks that we can use to update/access our elevated state.

Let's export them all from the bottom of the same file:

```tsx
export {
  useElevated,
  useElevate,
  useElevateOnMount,
  useElevateOnUpdate,
  useElevateBeforeUnmount,
  useElevateInitialState,
};
```

### useElevated

Now we want to use some of our state in one of our components. Let's create a counter component that just displays the `count`:

```tsx
import React from 'react';
import { useElevated } from './counter-elevation';

const Counter = () => {
  const count = useElevated((state) => state.count);

  return <p>Count: {count}</p>;
};

export default Counter;
```

This hook takes a selector that can return the state we want from the store. It could return a single piece of state, more than one, a combination of pieces of state, or literally all of the state (not recommended).

Note that we didn't have to add any types to `useElevated` because we already provided them when [creating our elevation](#createElevation).

We now have access to the count from our elevation within our component. This will work out of the box - no need to wrap our app with a provider or anything.

This component will now automatically re-render when any values in the store change, but that's not ideal. Let's make it so that we only listen for changes to the value of `count`.

```tsx
const count = useElevated((state) => state.count, ['count']);
```

By changing this line our counter will only update if the value of `count` changes.

This works a lot like how other hooks' dependencies work, but instead of providing the values we're listening for, we provide the keys to those values.

Similarly if we never wanted the component's `count` to update, we could provide an empty array:

```tsx
const count = useElevated((state) => state.count, []);
```

### useElevate

Now we need something to update our state, so let's create an increment button (that will add 1 to the count when clicked):

```tsx
import React, { useCallback } from 'react';
import { useElevate } from './counter-elevation';

const IncrementButton = () => {
  const elevate = useElevate();
  const increment = useCallback(() => {
    elevate((state) => ({
      count: state.count + 1,
    }));
  }, []);

  return <button onClick={increment}>Increment</button>;
};

export default IncrementButton;
```

The `useElevate` hook returns a function that we can call to elevate state on demand.

Here we're passing a function to `elevate` that receives the current state and returns a sub-set of the state we want to change (but could return literally the entire state if we wanted if for example, you wanted to clear a user's data on logout). This will be merged with the existing state so if there were keys in our elevated state other than `count` they will not be affected by this example. To remove the value of a piece of state set this to `undefined` or `null` as appropriate.

We could also pass a plain object of new values to elevate, but since our new value for `count` relies on the previous value we are using the function variant.

Now we can render our two components anywhere in our app (next to each other, one below the other, etc) and they'll be able to share the same elevated state:

```tsx
import React from 'react';
import Counter from './counter';
import IncrementButton from './increment-button';

const App = () => (
  <>
    <Counter />
    <IncrementButton />
  </>
);

export default App;
```

### useElevateState

The `useElevateState` hook is wrapper around `useElevate` and `useElevated` with a similar API to `useState`. If we wanted our increment button to both elevate the count and render the current count we can use `useElevateState` to save us writing 2 individual hooks.

Rather than having access to the entire state object, we provide the specific key in the state we wish to control.

```tsx
import React, { useCallback } from 'react';
import { useElevate } from './counter-elevation';

const IncrementButton = () => {
  const [count, setCount] = useElevateState('count');
  const increment = useCallback(() => {
    setCount((count) => state.count + 1);
  }, []);

  return <button onClick={increment}>Increment {count}</button>;
};

export default IncrementButton;
```

You'll notice that we don't provide an initial value for our state as we would with a regular `setState`. This is because the API would not be able to tell the difference between an `undefined` initial value, and not wanting to provide an initial value (and instead use the existing elevated value). Instead if you want to set the initial value you can do so with a `useEffect` or `useElevateOnMount` call. e.g.

```tsx
useElevateOnMount({ count: 0 });
```

### useElevateInitialState

What about server side rendering? If we want to provide some initial values for our app we can do so by using the `useElevateInitialState` in our app component.

```tsx
import React from 'react';
import { useElevateInitialState } from './counter-elevation';
import Counter from './counter';
import IncrementButton from './increment-button';

const App = () => {
  useElevateInitialState({ count: 1 });

  return (
    <>
      <Counter />
      <IncrementButton />
    </>
  );
};

export default App;
```

This will override all values that we provided for the default state when [creating our elevation](#createElevation).

This hook will only be triggered once, no matter if the app component is re-rendered. If the app component is un-mounted and re-mounted however, it will re-initialize the state.

This will also cause an instant update, so none of the components listening for this state will be updated, instead this must be called before any of your components that rely on the state are rendered. If called within your app component, when any sub-components render they will already have access to this initial state so they will not need a second update.

### Automatic elevation

#### useElevateOnMount

Will elevate a piece of state when the component calling this mounts, and never again.

This is essentially just a wrapper around `useEffect`.

```tsx
const Tab: FunctionComponent<{ heroImage: string }> = ({
  heroImage,
  children,
}) => {
  useElevateOnMount({ heroImage });

  return <div className="tab-content">{children}</div>;
};
```

#### useElevateBeforeUnmount

Will elevate a piece of state when the component calling this is about to unmount.

This is essentially just a wrapper around `useEffect`.

```tsx
const Tab: FunctionComponent<{ heroImage: string }> = ({
  heroImage,
  children,
}) => {
  useElevateOnMount({ heroImage });
  useElevateBeforeUnmount({ heroImage: null });

  return <div className="tab-content">{children}</div>;
};
```

#### useElevateOnUpdate

Will automatically elevate some state when it changes.

This is essentially just a wrapper around `useEffect`.

WARNING: if you have two components that both call `useElevateOnUpdate` to update the same piece of state they may fight for control of that state and get stuck in a loop if you provide a function instead of an object (as if this relies on the previous state it will always be different). Only use this when you are certain that a single component should have control of the state in question at a time. You can still have 2 components rendered that call `useElevateOnUpdate` if they are elevating different state keys, and you may use `useElevateOnUpdate` in more than one place _if_ you are passing it an object (even if they are elevating the same key). Just be careful,

```tsx
const Timer: FunctionComponent = ({ children }) => {
  const [time, setTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useElevateOnUpdate({ time });

  return <>{children}</>;
};
```

## Gotchas

- Do not mutate elevated state - mutating state may not cause your components to update.
- Avoid rendering more than one component using any of the [automated elevation hooks](#automatic-elevation) to update a single piece of state at the same time - they may fight over which controls the state and either only the latter component rendered will win, or they will get stuck in an infinite loop.
- Only ever call `useElevateInitialState` once at the very root of your app.
- Avoid calling `useElevateInitialState` if you just want to provide some default state, this can be provided when [creating your elevation](#createElevation).
