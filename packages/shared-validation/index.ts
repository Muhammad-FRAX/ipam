// We will import a real CIDR library later.
export const validateCidr = (cidr: string): boolean => {
  const regex = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))$/;
  return regex.test(cidr);
};
