import useAxios from 'axios-hooks';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import createElevation from 'react-elestate';
import { createElevateAxios } from 'react-elestate/addons/axios-hooks';
import axios from 'axios';

interface ElevatedState {
  count: number;
  header: string | null;
  beers?: readonly { id: number; name: string }[];
}

const elevationAPI = createElevation<ElevatedState>({
  count: 0,
  header: null,
});

const {
  useElevated,
  useElevate,
  useElevateState,
  useElevateOnMount,
  useElevateOnUpdate,
  useElevateBeforeUnmount,
  useElevateInitialState,
} = elevationAPI;

const { useElevateAxios } = createElevateAxios(elevationAPI);

const Counter = () => {
  const count = useElevated((state) => state.count, ['count']);

  return <p>Count: {count}</p>;
};

const Increment = () => {
  const elevate = useElevate();
  const count = useElevated((state) => state.count, ['count']);

  const onClick = React.useCallback(() => {
    elevate((state) => ({
      count: state.count + 1,
    }));
  }, [elevate]);

  return <button onClick={onClick}>Increment {count}</button>;
};

const Decrement = () => {
  const elevate = useElevate();
  const count = useElevated((state) => state.count, ['count']);

  const onClick = React.useCallback(() => {
    elevate((state) => ({
      count: state.count - 1,
    }));
  }, [elevate]);

  return <button onClick={onClick}>Decrement {count}</button>;
};

const CounterControl = () => {
  const [count, setCount] = useElevateState('count');
  const onChange = React.useCallback(
    ({ currentTarget: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      const nextCount = parseInt(value, 10);
      setCount(Number.isNaN(nextCount) ? 0 : nextCount);
    },
    [setCount]
  );

  return <input type="number" onChange={onChange} value={count} />;
};

const Header = () => {
  const title = useElevated((state) => state.header, ['header']);

  if (!title) {
    return null;
  }

  return <h1>{title}</h1>;
};

const useSeconds = () => {
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

const Tab1 = () => {
  useElevateOnMount(() => ({
    header: 'Tab 1 elevated header',
  }));

  useElevateBeforeUnmount({ header: null });

  return <p>Tab 1 (with header)</p>;
};

const Tab2 = () => {
  const seconds = useSeconds();

  useElevateOnUpdate(() => ({
    header: `Tab 2 elevated header (open for ${seconds} seconds)`,
  }));

  useElevateBeforeUnmount({ header: null });

  return <p>Tab 2 (with header)</p>;
};

const Tabs = () => {
  const [activeTab, setActiveTab] = React.useState(0);

  const onClick0 = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setActiveTab(0);
    },
    [setActiveTab]
  );

  const onClick1 = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setActiveTab(1);
    },
    [setActiveTab]
  );

  const onClick2 = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setActiveTab(2);
    },
    [setActiveTab]
  );

  return (
    <>
      <div>
        <a onClick={onClick0} href="#">
          No Tab
        </a>{' '}
        <a onClick={onClick1} href="#">
          Tab 1
        </a>{' '}
        <a onClick={onClick2} href="#">
          Tab 2
        </a>
      </div>
      {activeTab === 1 && <Tab1 />}
      {activeTab === 2 && <Tab2 />}
    </>
  );
};

const BEER_API_ROOT = 'https://api.punkapi.com/v2/beers';

const BeerCount = () => {
  const beerCount = useElevated((state) => state.beers?.length);

  if (typeof beerCount === 'undefined') {
    return null;
  }

  return <p>Viewing {beerCount} beers</p>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useDebouncePromise = <T extends any, A extends readonly any[]>(
  callback: (...args: A) => Promise<T>,
  delay: number
) => {
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

const Beers = () => {
  const [search, setSearch] = React.useState<string>('');
  const [{ data, loading, error }, request] = useElevateAxios(
    'beers',
    useAxios(BEER_API_ROOT)
  );
  const debouncedRequest = useDebouncePromise(request, 500);

  const onChangeSearch = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(event.currentTarget.value);
    },
    []
  );

  React.useEffect(() => {
    debouncedRequest({
      params: {
        // eslint-disable-next-line camelcase
        beer_name: search || undefined,
      },
    }).catch((err) => {
      if (!axios.isCancel(err)) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    });
  }, [debouncedRequest, search]);

  return (
    <>
      <input
        type="text"
        placeholder="Search beers..."
        value={search}
        onChange={onChangeSearch}
      />
      {loading && <p>Loading...</p>}
      {error && <p>{error.message}</p>}
      {!loading && !error && (
        <ul>
          {data?.map((beer) => (
            <li key={beer.id}>{beer.name}</li>
          ))}
        </ul>
      )}
    </>
  );
};

const App = () => {
  useElevateInitialState({ count: 1, header: null });

  return (
    <>
      <Counter />
      <Increment />
      <Decrement />
      <CounterControl />
      <Header />
      <Tabs />
      <BeerCount />
      <Beers />
    </>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
