export {}

declare global {
  interface Window {
    $crisp?: {
      push: (args: any[]) => void
    }
    CRISP_WEBSITE_ID?: string
  }
}
