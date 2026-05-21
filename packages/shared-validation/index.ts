import { parseCidr } from './cidr';

export * from './cidr';

export const validateCidr = (cidr: string): boolean => {
  try {
    parseCidr(cidr);
    return true;
  } catch {
    return false;
  }
};
