export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}