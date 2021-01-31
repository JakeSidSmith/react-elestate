import * as React from 'react';
import * as ReactDOM from 'react-dom';
import createElevation from 'react-elestate';

interface ElevatedState {
  count: number;
  header: string | null;
  favoriteForm: Partial<{
    favoriteFood: string;
    favoriteColor: string;
    tellingTheTruth: boolean;
    dateString: string;
    custom: number | undefined;
  }>;
}

const {
  useElevated,
  useElevate,
  useElevateState,
  useElevateOnMount,
  useElevateOnUpdate,
  useElevateBeforeUnmount,
  useElevateInitialState,
  createElevationForm,
} = createElevation<ElevatedState>({
  count: 0,
  header: null,
  favoriteForm: {},
});

const {
  useOnSubmit,
  useElevateFieldValue,
  useElevateFieldChecked,
  useElevateFieldCustom,
} = createElevationForm('favoriteForm');

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

interface CustomInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

const CustomInput = ({ value, onChange }: CustomInputProps) => {
  const onChangeWrapper = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.currentTarget.value) {
        const int = parseInt(event.currentTarget.value, 10);

        if (Number.isFinite(int)) {
          onChange(int);
          return;
        }
      }

      onChange(undefined);
    },
    [onChange]
  );

  return <input type="number" value={value ?? ''} onChange={onChangeWrapper} />;
};

const Form = () => {
  const onSubmit = useOnSubmit((data) => alert(JSON.stringify(data)));
  const favoriteFood = useElevateFieldValue('favoriteFood');
  const favoriteColor = useElevateFieldValue('favoriteColor');
  const tellingTheTruth = useElevateFieldChecked('tellingTheTruth');
  const dateString = useElevateFieldValue('dateString');
  const custom = useElevateFieldCustom('custom');

  return (
    <form onSubmit={onSubmit}>
      <input type="text" {...favoriteFood} />
      <input type="text" {...favoriteColor} />
      <input type="checkbox" {...tellingTheTruth} />
      <CustomInput {...custom} />
      <input type="date" {...dateString} />
      <button type="submit">Submit</button>
    </form>
  );
};

const App = () => {
  useElevateInitialState({ count: 1, header: null, favoriteForm: {} });

  return (
    <>
      <Counter />
      <Increment />
      <Decrement />
      <CounterControl />
      <Header />
      <Tabs />
      <Form />
    </>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
