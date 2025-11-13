// src/features/embed/embed-utils.js

// --- helpers ---------------------------------------------------------------
const isValidSize = (size) => /^\d+(px|%|em|rem|vw|vh)$/.test(size);

const isValidPosition = (position) => {
  if (typeof position === "string") {
    return ["top-left", "top-right", "bottom-left", "bottom-right"].includes(
      position
    );
  }
  if (position && typeof position === "object") {
    const valid = ["top", "bottom", "left", "right"];
    return Object.keys(position).every((k) => valid.includes(k));
  }
  return false;
};

const normalizePosition = (position) => {
  if (typeof position === "string") {
    const [v, h] = position.split("-");
    return { [v]: "20px", [h]: "20px" }; // default offsets
  }
  if (position && typeof position === "object") {
    // ensure values
    const out = {};
    for (const k of Object.keys(position)) out[k] = String(position[k] || "20px");
    return out;
  }
  return { bottom: "20px", right: "20px" };
};

const formatDuration = (seconds) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
};

// --------------------------------------------------------------------------

export const EmbedUtils = {
  /**
   * Generate a copy-paste snippet for customers.
   * Works with /public/embed-snippet.js and your backend /embed/chatframe/:clientId
   */
  generateEmbedCode: (clientId, options = {}) => {
    const {
      // visual
      position = "bottom-right",
      width = "350px",
      height = "500px",
      theme = "light", // light | dark | auto
      // behavior
      autoOpen = false,
      greetingDelay = 3000,
      // security
      secret, // optional: embed secret (recommended)
      // where your app is hosted
      domain = window.location.origin,
    } = options;

    const pos = normalizePosition(position);

    // NOTE: simplified format - only client-id required, others are defaults
    return `<!-- SaaS Chatbot Widget -->
<div id="saas-chatbot-widget"></div>
<script src='${domain.replace(/\\/$/ '')}/embed-snippet.js' 
        data-client-id='${clientId}'>
</script>`;
  },

  /**
   * Validate params customer entered before showing the snippet.
   */
  validateConfig: (config) => {
    const errors = [];

    if (!config.clientId) errors.push("Client ID is required");

    if (config.width && !isValidSize(config.width)) {
      errors.push("Invalid width format. Use px, %, or valid CSS units");
    }
    if (config.height && !isValidSize(config.height)) {
      errors.push("Invalid height format. Use px, %, or valid CSS units");
    }
    if (config.position && !isValidPosition(config.position)) {
      errors.push(
        "Invalid position. Use top-left, top-right, bottom-left, or bottom-right"
      );
    }
    if (config.theme && !["light", "dark", "auto"].includes(config.theme)) {
      errors.push("Invalid theme. Use light, dark, or auto");
    }

    return { isValid: errors.length === 0, errors };
  },

  /**
   * Open the live chatframe in an <iframe> for preview inside your app.
   * Honors optional embed secret.
   */
  generatePreviewUrl: (clientId, options = {}) => {
    const { theme = "light", secret, domain = window.location.origin } = options;
    const qs = new URLSearchParams({
      theme,
      preview: "true",
      v: String(Date.now()),
      ...(secret ? { secret } : {}),
    }).toString();

    return `${domain.replace(/\\/$/ '')}/embed/chatframe/${clientId}?${qs}`;
  },

  /**
   * Lightweight sanity check that the chatframe route is reachable.
   * (Uses no-cors to avoid auth/CORS issues; resolves success if fetch doesn't throw.)
   */
  testEmbed: async (clientId, options = {}) => {
    try {
      const url = EmbedUtils.generatePreviewUrl(clientId, options);
      await fetch(url, { method: "GET", mode: "no-cors" });
      return { success: true, message: "Embed endpoint reachable" };
    } catch (error) {
      return {
        success: false,
        error: error?.message || "Failed to reach embed endpoint",
        message: "Embed configuration might be incorrect",
      };
    }
  },

  /**
   * Pull basic analytics you show in your UI (falls back gracefully).
   * Depends on your /client/analytics endpoint we added earlier.
   */
  getEmbedAnalytics: async (clientId, dateRange = {}) => {
    try {
      const params = new URLSearchParams({ type: "embed", ...dateRange });
      const res = await fetch(`/api/client/analytics?${params.toString()}`);
      const data = await res.json();

      return {
        success: true,
        data: {
          totalViews: data.embed_views || 0,
          totalInteractions: data.embed_interactions || 0,
          conversionRate: data.embed_conversion_rate || 0,
          averageSessionDuration: data.embed_avg_session || 0,
          topReferrers: data.embed_referrers || [],
          deviceBreakdown: data.embed_devices || {},
        },
      };
    } catch (error) {
      return { success: false, error: error?.message || "Unknown error" };
    }
  },

  /**
   * Pretty numbers for your UI.
   */
  formatEmbedStats: (stats = {}) => ({
    views: new Intl.NumberFormat().format(stats.totalViews || 0),
    interactions: new Intl.NumberFormat().format(stats.totalInteractions || 0),
    conversionRate: `${((stats.conversionRate || 0) * 100).toFixed(1)}%`,
    avgSession: formatDuration(stats.averageSessionDuration || 0),
  }),
};

export default EmbedUtils;
