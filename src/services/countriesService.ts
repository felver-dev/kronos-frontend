/**
 * Service pour les pays et villes (API libres).
 * - Pays + indicatif téléphonique : REST Countries (https://restcountries.com)
 * - Villes par pays : Countries Now (https://countriesnow.space)
 */

const REST_COUNTRIES_URL = 'https://restcountries.com/v3.1'
const COUNTRIES_NOW_URL = 'https://countriesnow.space/api/v0.1'

export interface CountryOption {
  /** Nom du pays en français (affichage et enregistrement) */
  name: string
  /** Nom du pays en anglais (pour l’API des villes) */
  nameEn: string
  code: string
  dialCode: string
}

function parseDialCode(idd: { root?: string; suffixes?: string[] } | undefined): string {
  if (!idd?.root) return ''
  const suffix = idd.suffixes?.[0] ?? ''
  return idd.root + suffix
}

/**
 * Récupère la liste des pays avec nom en français, code ISO2 et indicatif téléphonique.
 */
export async function fetchCountries(): Promise<CountryOption[]> {
  const res = await fetch(
    `${REST_COUNTRIES_URL}/all?fields=name,cca2,idd,translations`
  )
  if (!res.ok) throw new Error('Impossible de charger les pays')
  const data = await res.json()
  type CountryRow = {
    name: { common: string }
    cca2: string
    idd?: { root?: string; suffixes?: string[] }
    translations?: { fra?: { common?: string } }
  }
  return (data as CountryRow[])
    .filter((c) => c.idd?.root && c.name?.common)
    .map((c) => {
      const nameEn = c.name.common
      const name = c.translations?.fra?.common || nameEn
      return {
        name,
        nameEn,
        code: c.cca2,
        dialCode: parseDialCode(c.idd),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

/**
 * Récupère la liste des villes pour un pays donné.
 * @param countryNameEn nom du pays en anglais (requis par l’API Countries Now)
 */
export async function fetchCitiesByCountry(countryNameEn: string): Promise<string[]> {
  if (!countryNameEn.trim()) return []
  const res = await fetch(`${COUNTRIES_NOW_URL}/countries/cities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country: countryNameEn.trim() }),
  })
  if (!res.ok) return []
  const data = await res.json()
  const cities = data?.data
  if (!Array.isArray(cities)) return []
  return cities.map((c: string) => c).sort((a: string, b: string) => a.localeCompare(b))
}

export const countriesService = {
  fetchCountries,
  fetchCitiesByCountry,
  
}

