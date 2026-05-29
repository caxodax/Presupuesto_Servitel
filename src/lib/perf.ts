export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now()

  try {
    return await fn()
  } finally {
    const duration = Math.round(performance.now() - start)

    if (process.env.NODE_ENV !== "production" || duration > 500) {
      console.log(`[PERF] ${label}: ${duration}ms`)
    }
  }
}
