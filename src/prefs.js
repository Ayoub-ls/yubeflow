import { useEffect, useState } from 'react'

const read = (k, d) => { try { return localStorage.getItem(k) || d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* storage unavailable */ } }

// Theme and language live above the app so the login screens can use them too.
export function usePrefs() {
  const [theme, setTheme] = useState(() => read('yube-theme', 'dark'))
  const [locale, setLocale] = useState(() => read('yube-locale', 'en'))
  useEffect(() => write('yube-theme', theme), [theme])
  useEffect(() => {
    write('yube-locale', locale)
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
  }, [locale])
  return { theme, setTheme, locale, setLocale }
}
