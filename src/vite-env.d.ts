/// <reference types="vite/client" />

declare module 'virtual:pwa-register/react' {
  export function useRegisterSW(): {
    needRefresh: [boolean];
    updateServiceWorker: (reloadPage?: boolean) => void;
  };
}

interface ImportMetaEnv {
  readonly VITE_SOCKET_URL?: string
  readonly VITE_API_URL: string
  readonly VITE_POSTHOG_API_KEY?: string
  readonly VITE_POSTHOG_HOST?: string
  readonly VITE_SOCKET_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
