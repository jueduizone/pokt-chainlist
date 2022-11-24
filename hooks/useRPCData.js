import { useCallback } from 'react';
import { useQueries } from 'react-query';
import axios from 'axios';

export const rpcBody = JSON.stringify({
  jsonrpc: '2.0',
  method: 'eth_getBlockByNumber',
  params: ['latest', false],
  id: 1,
});

const fetchChain = async (chain, baseURL) => {
  if (baseURL.includes('API_KEY')) return null;
  try {
    let API = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    API.interceptors.request.use(function (request) {
      request.requestStart = Date.now();
      return request;
    });

    API.interceptors.response.use(
      function (response) {
        response.latency = Date.now() - response.config.requestStart;
        return response;
      },
      function (error) {
        if (error.response) {
          error.response.latency = null;
        }

        return Promise.reject(error);
      }
    );
    console.log("Test:" + baseURL)
    if(chain.isEvm){
      let { data, latency } = await API.post('', rpcBody);
      return { ...data, latency };
    } else {
      console.log(chain.rpcCall.rpcBody)
      let { data, latency } = await API.post('', chain.rpcCall.rpcBody);
      return { ...data, latency };
    }
  } catch (error) {
    return null;
  }
};

const formatData = (chain, url, data) => {
  let height = null;
  if(chain.isEvm){
    height = data?.result?.number ?? null;
  }else{
    let resultPath = chain.rpcCall.resultPath;
    height=eval('data.'+resultPath);
  }
  let latency = data?.latency ?? null;
  if (height) {
    const hexString = height.toString(16);
    height = parseInt(hexString, 16);
  } else {
    latency = null;
  }
  return { url, height, latency };
};

const useHttpQuery = (chain, url) => {
  return {
    queryKey: [url],
    queryFn: () => fetchChain(chain, url),
    refetchInterval: 5000,
    select: useCallback((data) => formatData(chain, url, data), []),
  };
};

function createPromise() {
  let resolve, reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  promise.resolve = resolve;
  promise.reject = reject;

  return promise;
}

const fetchWssChain = async (baseURL) => {
  try {
    // small hack to wait until socket connection opens to show loading indicator on table row
    const queryFn = createPromise();

    const socket = new WebSocket(baseURL);
    let requestStart;

    socket.onopen = function () {
      socket.send(rpcBody);
      requestStart = Date.now();
    };

    socket.onmessage = function (event) {
      const data = JSON.parse(event.data);

      const latency = Date.now() - requestStart;
      queryFn.resolve({ ...data, latency });
    };

    socket.onerror = function (e) {
      queryFn.reject(e);
    };

    return await queryFn;
  } catch (error) {
    return null;
  }
};

const useSocketQuery = (chain, url) => {
  return {
    queryKey: [url],
    queryFn: () => fetchWssChain(url),
    select: useCallback((data) => formatData(chain, url, data), []),
    refetchInterval: 5000,
  };
};

const useRPCData = (chain, urls) => {
  const queries = urls.map((url) => (url.includes('wss://') ? useSocketQuery(chain, url) : useHttpQuery(chain, url)));
  return useQueries(queries);
};

export default useRPCData;
