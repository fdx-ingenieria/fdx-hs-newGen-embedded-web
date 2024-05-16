
export  const isValidInteger = (value: number): boolean => {
  return Number.isFinite(value)
  && parseInt(value.toString()) === value
}
