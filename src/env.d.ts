/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string
  readonly VITE_ADSENSE_ENABLED?: string
  readonly VITE_ADSENSE_CLIENT?: string
  readonly VITE_ADSENSE_SLOT_CONTENT?: string
}

interface Window {
  adsbygoogle?: Array<Record<string, unknown>>
}
