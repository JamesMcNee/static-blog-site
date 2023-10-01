const themes = {fantasy: 'light', dark: 'dark'}
const localStorageKey = 'selected-theme'
const html = document.getElementsByTagName("html")[0]

function getPreferredColourScheme() {
    const preferredTheme = getPreferredTheme()

    return themes[preferredTheme]
}

function getPreferredTheme() {
    const themeFromLs = localStorage.getItem(localStorageKey)

    if (themeFromLs) {
        return themeFromLs;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
    }

    return 'fantasy'
}

window.addEventListener('DOMContentLoaded', (event) => {
    setTheme(getPreferredTheme())
});

function setTheme(theme) {
    localStorage.setItem(localStorageKey, theme)
    html.setAttribute('data-theme', theme)

    const isLightTheme = themes[theme] === 'light'
    const themeSelectorIcon = document.getElementById('theme-selector-icon')

    if (isLightTheme) {
        themeSelectorIcon.className = 'ri-sun-fill'
        themeSelectorIcon.onclick = () => setTheme('dark')
        document.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: 'dark' } }))
    } else {
        themeSelectorIcon.className = 'ri-moon-fill'
        themeSelectorIcon.onclick = () => setTheme('fantasy')
        document.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: 'fantasy' } }))
    }
}