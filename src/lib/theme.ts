export function applyTheme(darkMode: boolean): void {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.toggle('light-theme', !darkMode);
  document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
}
