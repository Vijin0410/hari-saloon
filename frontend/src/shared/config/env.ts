type EnvShape = {
  VITE_API_BASE_URL: string;
  VITE_API_PROXY_TARGET: string;
};

function readEnv(): EnvShape {
  return {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL?.trim() || '/api',
    VITE_API_PROXY_TARGET: import.meta.env.VITE_API_PROXY_TARGET?.trim() || 'http://localhost:8080',
  };
}

export const env = readEnv();
