/** يمنع تعليق الصفحة على الموبايل عند بطء Auth/الشبكة */
export async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label = "انتهت المهلة",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
