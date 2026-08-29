let listeners = [];

export function showToast(message) {
  listeners.forEach((fn) => fn(message));
}

export function subscribeToast(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
