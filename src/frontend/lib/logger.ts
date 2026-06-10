import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

const jstTimestamp = () => {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(now.getTime() + jstOffset);

  return `,"time":"${jstDate.toISOString().replace('Z', '+09:00')}"`;
};

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
  timestamp: isProd ? jstTimestamp : pino.stdTimeFunctions.isoTime,
});
