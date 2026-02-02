import React, { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  primaryColor: string
  setPrimaryColor: (color: string) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Helpers pour gérer les couleurs
const hexToHsl = (hex: string): { h: number; s: number; l: number } | null => {
  let sanitized = hex.trim()
  if (!sanitized.startsWith('#')) return null
  sanitized = sanitized.slice(1)

  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map((c) => c + c)
      .join('')
  }

  if (sanitized.length !== 6) return null

  const r = parseInt(sanitized.slice(0, 2), 16) / 255
  const g = parseInt(sanitized.slice(2, 4), 16) / 255
  const b = parseInt(sanitized.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0
  let g = 0
  let b = 0

  if (h >= 0 && h < 60) {
    r = c
    g = x
    b = 0
  } else if (h >= 60 && h < 120) {
    r = x
    g = c
    b = 0
  } else if (h >= 120 && h < 180) {
    r = 0
    g = c
    b = x
  } else if (h >= 180 && h < 240) {
    r = 0
    g = x
    b = c
  } else if (h >= 240 && h < 300) {
    r = x
    g = 0
    b = c
  } else {
    r = c
    g = 0
    b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

const rgbString = (r: number, g: number, b: number) => `${r} ${g} ${b}`

const applyPrimaryColorToCSSVariables = (hexColor: string) => {
  if (typeof document === 'undefined') return

  const hsl = hexToHsl(hexColor)
  if (!hsl) return

  const { h, s, l } = hsl

  // Variante "soft" (plus claire)
  const soft = hslToRgb(h, s * 0.9, Math.min(l + 20, 95))
  // Couleur principale
  const main = hslToRgb(h, s, l)
  // Variante "strong" (plus sombre)
  const strong = hslToRgb(h, Math.min(s * 1.05, 100), Math.max(l - 15, 10))

  const root = document.documentElement
  root.style.setProperty('--primary-soft', rgbString(soft.r, soft.g, soft.b))
  root.style.setProperty('--primary', rgbString(main.r, main.g, main.b))
  root.style.setProperty('--primary-strong', rgbString(strong.r, strong.g, strong.b))
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Récupérer le thème depuis localStorage ou utiliser la préférence système
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme
      }
      // Détecter la préférence système
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
    }
    return 'light'
  })

  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('primaryColor')
      if (saved) {
        return saved
      }
    }
    // Bleu par défaut
    return '#2C6BB3'
  })

  // Appliquer le thème au montage (lecture depuis localStorage / préférence système)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement
      if (theme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  // Appliquer la classe sur <html> de façon synchrone (évite le décalage barre / contenu)
  const applyThemeToDOM = (newTheme: Theme) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', newTheme)
  }

  // Appliquer la couleur principale choisie à la palette CSS (utilisée par Tailwind)
  useEffect(() => {
    applyPrimaryColorToCSSVariables(primaryColor)
    if (typeof window !== 'undefined') {
      localStorage.setItem('primaryColor', primaryColor)
    }
  }, [primaryColor])

  const toggleTheme = () => {
    setThemeState((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light'
      applyThemeToDOM(newTheme)
      return newTheme
    })
  }

  const setTheme = (newTheme: Theme) => {
    applyThemeToDOM(newTheme)
    setThemeState(newTheme)
  }

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, primaryColor, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
