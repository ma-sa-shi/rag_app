import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  transport: !isProd
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  level: isProd ? 'info' : 'debug',
});
