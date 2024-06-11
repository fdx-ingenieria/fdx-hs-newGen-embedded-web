
export  const isValidInteger = (value: number): boolean => {
  return Number.isFinite(value)
  && parseInt(value.toString()) === value
}

export const customLog = (...args: any) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};