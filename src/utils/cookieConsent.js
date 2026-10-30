export const COOKIE_CONSENT_EVENT = 'prepnova-cookie-consent-change'

export function getCookieConsent() {
  if (typeof document === 'undefined') return null
  const consent = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('prepnova_cookie_consent='))
    ?.split('=')[1]
  return consent === 'accepted' || consent === 'denied' ? consent : null
}

export function saveCookieConsent(consent) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `prepnova_cookie_consent=${consent}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }))
}
