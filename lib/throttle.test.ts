import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { throttle } from "./throttle"

describe("throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("fires on leading edge then suppresses until limitMs", () => {
    const fn = vi.fn()
    const th = throttle(fn, 100)

    th()
    expect(fn).toHaveBeenCalledTimes(1)

    th()
    th()
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    th()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("passes arguments through", () => {
    const fn = vi.fn()
    const th = throttle(fn, 50)
    th(1, "a")
    expect(fn).toHaveBeenCalledWith(1, "a")
  })
})
