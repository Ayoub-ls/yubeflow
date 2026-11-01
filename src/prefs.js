import { useEffect, useState } from 'react'

const read = (k, d) => { try { return localStorage.getItem(k) || d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* storage unavailable */ } }

// [id, translation key]. To add a theme: add it here, add a .theme-<id> block in theme.css, add its name in i18n.js.
export const THEMES = [['dark', 'dark'], ['light', 'light'], ['vault', 'themeVault'], ['clay', 'themeClay']]
const IDS = THEMES.map(([id]) => id)
// The soft themes sit on top of the light theme, so they inherit its text-contrast fixes.
export const themeClass = theme => (theme === 'dark' ? 'theme-dark' : theme === 'light' ? 'theme-light' : 'theme-light theme-' + theme)

// Theme and language live above the app so the login screens can use them too.
export function usePrefs() {
  const [theme, setTheme] = useState(() => { const saved = read('yube-theme', 'dark'); return IDS.includes(saved) ? saved : 'dark' })
  const [locale, setLocale] = useState(() => read('yube-locale', 'en'))
  useEffect(() => write('yube-theme', theme), [theme])
  useEffect(() => {
    write('yube-locale', locale)
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
  }, [locale])
  return { theme, setTheme, locale, setLocale }
}
