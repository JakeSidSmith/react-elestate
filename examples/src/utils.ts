import * as React from 'react';

const useSeconds = (): number => {
  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    const callback = () => {
      setSeconds((secs) => secs + 1);
    };

    const interval = window.setInterval(callback, 1000);

    return () => {
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return seconds;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useDebouncePromise = <T extends any, A extends readonly any[]>(
  callback: (...args: A) => Promise<T>,
  delay: number
): ((...args: A) => Promise<T>) => {
  const timeout = React.useRef<number>();

  return React.useCallback(
    (...args: A) => {
      return new Promise<T>((resolve) => {
        window.clearTimeout(timeout.current);

        timeout.current = window.setTimeout(() => {
          resolve(callback(...args));
        }, delay);
      });
    },
    [delay, callback]
  );
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
  }, deps);
};

export { useSeconds, useDebouncePromise, useSubsequentEffect };
