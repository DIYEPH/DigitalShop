type WebBackendEnv = {
  NODE_ENV: string;
  PORT: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGINS: string;
  TRUST_PROXY_HOPS: string;
  BCRYPT_ROUNDS: string;
  AUTH_TURNSTILE_REQUIRED: string;
  CLOUDFLARE_TURNSTILE_SECRET_KEY: string;
  DAILY_LOGIN_TIMEZONE: string;
  DAILY_LOGIN_POINTS_REWARD: string;
  USDT_WALLET_ADDRESS: string;
  USDT_TRC20_WALLET_ADDRESS: string;
  USDT_ERC20_WALLET_ADDRESS: string;
  BINANCE_PAY_ID: string;
};

const defaults: Pick<
  WebBackendEnv,
  | 'NODE_ENV'
  | 'PORT'
  | 'JWT_EXPIRES_IN'
  | 'CORS_ORIGINS'
  | 'TRUST_PROXY_HOPS'
  | 'BCRYPT_ROUNDS'
  | 'AUTH_TURNSTILE_REQUIRED'
  | 'CLOUDFLARE_TURNSTILE_SECRET_KEY'
  | 'DAILY_LOGIN_TIMEZONE'
  | 'DAILY_LOGIN_POINTS_REWARD'
  | 'USDT_WALLET_ADDRESS'
  | 'USDT_TRC20_WALLET_ADDRESS'
  | 'USDT_ERC20_WALLET_ADDRESS'
  | 'BINANCE_PAY_ID'
> = {
  NODE_ENV: 'development',
  PORT: '3002',
  JWT_EXPIRES_IN: '7d',
  CORS_ORIGINS: 'http://localhost:4000',
  TRUST_PROXY_HOPS: '1',
  BCRYPT_ROUNDS: '12',
  AUTH_TURNSTILE_REQUIRED: 'false',
  CLOUDFLARE_TURNSTILE_SECRET_KEY: '',
  DAILY_LOGIN_TIMEZONE: 'Asia/Ho_Chi_Minh',
  DAILY_LOGIN_POINTS_REWARD: '5',
  USDT_WALLET_ADDRESS: '',
  USDT_TRC20_WALLET_ADDRESS: '',
  USDT_ERC20_WALLET_ADDRESS: '',
  BINANCE_PAY_ID: '',
};

export function validateEnv(config: Record<string, unknown>): WebBackendEnv {
  const env = {
    ...defaults,
    ...config,
  } as Record<keyof WebBackendEnv, unknown>;

  const requiredKeys: Array<keyof WebBackendEnv> = ['DATABASE_URL', 'JWT_SECRET'];

  for (const key of requiredKeys) {
    if (typeof env[key] !== 'string' || env[key].trim() === '') {
      throw new Error(`Missing required env: ${key}`);
    }
  }

  return {
    NODE_ENV: String(env.NODE_ENV),
    PORT: String(env.PORT),
    DATABASE_URL: String(env.DATABASE_URL),
    JWT_SECRET: String(env.JWT_SECRET),
    JWT_EXPIRES_IN: String(env.JWT_EXPIRES_IN),
    CORS_ORIGINS: String(env.CORS_ORIGINS),
    TRUST_PROXY_HOPS: String(env.TRUST_PROXY_HOPS),
    BCRYPT_ROUNDS: String(env.BCRYPT_ROUNDS),
    AUTH_TURNSTILE_REQUIRED: String(env.AUTH_TURNSTILE_REQUIRED),
    CLOUDFLARE_TURNSTILE_SECRET_KEY: String(env.CLOUDFLARE_TURNSTILE_SECRET_KEY),
    DAILY_LOGIN_TIMEZONE: String(env.DAILY_LOGIN_TIMEZONE),
    DAILY_LOGIN_POINTS_REWARD: String(env.DAILY_LOGIN_POINTS_REWARD),
    USDT_WALLET_ADDRESS: String(env.USDT_WALLET_ADDRESS),
    USDT_TRC20_WALLET_ADDRESS: String(env.USDT_TRC20_WALLET_ADDRESS),
    USDT_ERC20_WALLET_ADDRESS: String(env.USDT_ERC20_WALLET_ADDRESS),
    BINANCE_PAY_ID: String(env.BINANCE_PAY_ID),
  };
}
