// ====================================================================
// DEV KEYS — Cheile API ale proprietarului aplicației
// Folosite automat pentru utilizatorii cu planul Free (1 video/zi).
// Utilizatorii Basic și Pro trebuie să introducă propriile chei.
// ====================================================================

// ⚠️  IMPORTANT: Înlocuiește valorile de mai jos cu cheile tale reale!
//     Acestea sunt folosite pentru planul Free. Nu le partaja public
//     dacă vrei să limitezi accesul — ele sunt vizibile în bundle.

export const DEV_KEYS = {
  // Pexels API Key — obține de la: https://www.pexels.com/api/new/
  pexelsApiKey: import.meta.env.VITE_PEXELS_KEY || '',

  // Cloudflare Workers AI
  // Account ID — https://dash.cloudflare.com/?to=/:account/workers-and-pages
  cfAccountId: import.meta.env.VITE_CF_ACCOUNT_ID || '',

  // API Token — https://dash.cloudflare.com/profile/api-tokens
  cfApiToken: import.meta.env.VITE_CF_API_TOKEN || '',
};

/**
 * Returnează cheile corecte pentru un utilizator în funcție de plan:
 * - Free  → cheile DEV (ale proprietarului)
 * - Basic/Pro → cheile utilizatorului (din sidebar)
 */
export function resolveApiKeys(plan, userKeys) {
  if (plan.id === 'free') {
    return {
      pexelsApiKey: DEV_KEYS.pexelsApiKey,
      cfAccountId:  DEV_KEYS.cfAccountId,
      cfApiToken:   DEV_KEYS.cfApiToken,
    };
  }
  return {
    pexelsApiKey: userKeys.pexelsApiKey || DEV_KEYS.pexelsApiKey,
    cfAccountId:  userKeys.cfAccountId  || DEV_KEYS.cfAccountId,
    cfApiToken:   userKeys.cfApiToken   || DEV_KEYS.cfApiToken,
  };
}
