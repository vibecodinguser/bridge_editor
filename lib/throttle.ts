export const throttle = <T extends (...args: never[]) => void>(
  fn: T,
  limitMs: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= limitMs) {
      lastCall = now
      fn(...args)
    }
  }
}
