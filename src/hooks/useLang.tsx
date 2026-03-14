import { createContext, useContext, useState, ReactNode } from 'react'

type Lang = 'sv' | 'en'

interface LangContextType {
  lang: Lang
  toggle: () => void
}

const LangContext = createContext<LangContextType>({ lang: 'sv', toggle: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('sv')
  const toggle = () => setLang(l => l === 'sv' ? 'en' : 'sv')
  return <LangContext.Provider value={{ lang, toggle }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

// Bilingual text helper: returns sv or en based on current lang
export function t(sv: string, en: string, lang: Lang): string {
  return lang === 'sv' ? sv : en
}
