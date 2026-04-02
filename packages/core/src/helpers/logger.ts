export const log = {
  debug: (...messages: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('🐛', '\x1b[35m', ...messages, '\x1b[0m');
    }
  },
  info: (...messages: unknown[]) => {
    console.info('❕', '\x1b[36m', ...messages, '\x1b[0m');
  },
  success: (...messages: unknown[]) => {
    console.log('🎉', '\x1b[32m', ...messages, '\x1b[0m');
  },
  warn: (...messages: unknown[]) => {
    console.warn('❗️', '\x1b[33m', ...messages, '\x1b[0m');
  },
  error: (...messages: unknown[]) => {
    console.error('❌', '\x1b[31m', ...messages, '\x1b[0m');
  },
};
