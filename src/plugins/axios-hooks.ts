import * as React from 'react';
import type { RefetchOptions, ResponseValues } from 'axios-hooks';
import type { AxiosPromise, AxiosRequestConfig } from 'axios';
import type { ElevateAPI, ElevateBaseState } from '../types';

const createPlugin = <S extends ElevateBaseState>({
  useElevate,
  useElevated,
}: ElevateAPI<S>): (<
  K extends keyof S,
  TResponse extends S[K],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TError = any
>(
  key: K,
  axiosHooksResult: [
    ResponseValues<TResponse, TError>,
    (
      config?: AxiosRequestConfig,
      options?: RefetchOptions
    ) => AxiosPromise<TResponse>
  ]
) => [
  ResponseValues<TResponse, TError>,
  (
    config?: AxiosRequestConfig,
    options?: RefetchOptions
  ) => AxiosPromise<TResponse>
]) => {
  const useElevateAxios = <
    K extends keyof S,
    TResponse extends S[K],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TError = any
  >(
    key: K,
    axiosHooksResult: [
      ResponseValues<TResponse, TError>,
      (
        config?: AxiosRequestConfig,
        options?: RefetchOptions
      ) => AxiosPromise<TResponse>
    ]
  ): [
    ResponseValues<TResponse, TError>,
    (
      config?: AxiosRequestConfig,
      options?: RefetchOptions
    ) => AxiosPromise<TResponse>
  ] => {
    const elevate = useElevate();
    const currentState = useElevated((state) => state[key]);
    const fired = React.useRef(false);

    const [response, request] = axiosHooksResult;

    React.useEffect(() => {
      if (fired.current) {
        elevate((state) => ({
          ...state,
          [key]: response.data,
        }));
      }

      fired.current = true;
    }, [response.data, elevate, key]);

    const memoResponse = React.useMemo(
      () => ({
        data: currentState,
        loading: response.loading,
        error: response.error,
        response: response.response,
      }),
      [currentState, response.loading, response.error, response.response]
    );

    return [memoResponse, request];
  };

  return useElevateAxios;
};

export { createPlugin as useElevateAxios };
