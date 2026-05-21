export const config = {
  getEnv: (key: string, defaultValue?: string): string => {
    return process.env[key] || defaultValue || '';
  }
};

export { getConfig } from './runtime';
