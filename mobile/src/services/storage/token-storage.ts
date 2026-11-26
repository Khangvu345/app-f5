import { sessionStorage } from './session-storage';

// All session fields share one secure record, so token and profile cannot diverge.
export const tokenStorage = {
  getAccessToken: async () => (await sessionStorage.get())?.accessToken ?? null,
};
