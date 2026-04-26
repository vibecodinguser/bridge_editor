/**
 * Returns a throttled version of `fn` that fires at most once per `limitMs`.
 * Uses the leading-edge call and discards intermediate calls.
 */
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
