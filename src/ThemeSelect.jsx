import { THEMES } from './prefs.js'

// Same look as the language menu. The choice is saved in localStorage by usePrefs().
export default function ThemeSelect({ theme, setTheme, t }) {
  return (
    <label className="language-select">
      <span className="sr-only">{t('theme')}</span>
      <select value={theme} onChange={e => setTheme(e.target.value)} aria-label={t('theme')}>
        {THEMES.map(([id, key]) => <option key={id} value={id}>{t(key)}</option>)}
      </select>
    </label>
  )
}