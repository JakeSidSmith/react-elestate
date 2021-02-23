import * as React from 'react';
import type { RefetchOptions, ResponseValues } from 'axios-hooks';
import type { AxiosPromise, AxiosRequestConfig } from 'axios';
import type { ElevateAPI, ElevateBaseState } from '../types';
import { useSubsequentEffect } from 'react-elestate/utils';

export type AxiosHooksResult<S, TError> = [
  ResponseValues<S, TError>,
  (config?: AxiosRequestConfig, options?: RefetchOptions) => AxiosPromise<S>
];

export type ElevateAxiosResult<S, TError> = [
  ResponseValues<S, TError>,
  (config?: AxiosRequestConfig, options?: RefetchOptions) => AxiosPromise<S>
];

export interface ElevateAxiosAPI<S extends ElevateBaseState> {
  useElevateAxios: <
    K extends keyof S,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TError = any
  >(
    key: K,
    axiosHooksResult: AxiosHooksResult<S[K], TError>
  ) => ElevateAxiosResult<S[K], TError>;
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
    axiosHooksResult: AxiosHooksResult<S[K], TError>
  ): ElevateAxiosResult<S[K], TError> => {
    const elevate = useElevate();
    const currentState = useElevated((state) => state[key], [key]);

    const [response, request] = axiosHooksResult;

    useSubsequentEffect(() => {
      elevate((state) => ({
        ...state,
        [key]: response.data,
      }));
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
