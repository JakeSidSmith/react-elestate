import * as React from 'react';
import type { RefetchOptions, ResponseValues } from 'axios-hooks';
import type { AxiosPromise, AxiosRequestConfig } from 'axios';
import type { ElevateAPI, ElevateBaseState } from '../types';

export interface ElevateAxiosAPI<S extends ElevateBaseState> {
  useElevateAxios: <
    K extends keyof S,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TError = any
  >(
    key: K,
    axiosHooksResult: [
      ResponseValues<S[K], TError>,
      (
        config?: AxiosRequestConfig,
        options?: RefetchOptions
      ) => AxiosPromise<S[K]>
    ]
  ) => [
    ResponseValues<S[K], TError>,
    (
      config?: AxiosRequestConfig,
      options?: RefetchOptions
    ) => AxiosPromise<S[K]>
  ];
}

const createElevateAxios = <S extends ElevateBaseState>({
  useElevate,
  useElevated,
}: ElevateAPI<S>): ElevateAxiosAPI<S> => {
  const useElevateAxios = <
    K extends keyof S,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TError = any
  >(
    key: K,
    axiosHooksResult: [
      ResponseValues<S[K], TError>,
      (
        config?: AxiosRequestConfig,
        options?: RefetchOptions
      ) => AxiosPromise<S[K]>
    ]
  ): [
    ResponseValues<S[K], TError>,
    (
      config?: AxiosRequestConfig,
      options?: RefetchOptions
    ) => AxiosPromise<S[K]>
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

  return { useElevateAxios };
};

export { createElevateAxios };

export default createElevateAxios;
