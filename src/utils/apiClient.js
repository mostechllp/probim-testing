import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * ============================================================
 * API CLIENT
 * ============================================================
 */

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

/**
 * ============================================================
 * USER TYPES / TOKEN KEYS
 * ============================================================
 *
 * IMPORTANT:
 * Keep this list as the single source of truth.
 */

export const USER_TYPES = [
  "admin",
  "hr",
  "employee",
  "manager",
  "team_lead",
];

export const TOKEN_KEYS = [
  ...USER_TYPES.map((type) => `${type}-token`),
  "auth-token",
];

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

const isEmptyToken = (value) => {
  return (
    !value ||
    value === "null" ||
    value === "undefined" ||
    value.trim?.() === ""
  );
};

/**
 * ============================================================
 * STORAGE URL
 * ============================================================
 */

export const getStorageUrl = (path) => {
  if (!path) return null;

  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  if (path.startsWith("data:")) {
    return path;
  }

  const baseUrl = API_BASE_URL?.replace(/\/api\/?$/, "") || "";

  const cleanPath = path.startsWith("/")
    ? path.slice(1)
    : path;

  return `${baseUrl}/storage/${cleanPath}`;
};

/**
 * ============================================================
 * ACTIVE USER TYPE
 * ============================================================
 */

export const getActiveUserType = () => {
  const activeType = localStorage.getItem(
    "active-user-type"
  );

  if (!activeType) {
    return null;
  }

  if (!USER_TYPES.includes(activeType)) {
    return null;
  }

  return activeType;
};

/**
 * ============================================================
 * ACTIVE TOKEN KEY
 * ============================================================
 */

export const getActiveTokenKey = () => {
  const activeType = getActiveUserType();

  if (!activeType) {
    return null;
  }

  const tokenKey = `${activeType}-token`;
  const token = localStorage.getItem(tokenKey);

  if (isEmptyToken(token)) {
    return null;
  }

  return tokenKey;
};

/**
 * ============================================================
 * GET ACTIVE TOKEN
 * ============================================================
 */

export const getActiveToken = () => {
  const tokenKey = getActiveTokenKey();

  if (!tokenKey) {
    return null;
  }

  const token = localStorage.getItem(tokenKey);

  return isEmptyToken(token) ? null : token;
};

/**
 * Internal alias used by refresh logic.
 */
const getToken = () => {
  return getActiveToken();
};

/**
 * ============================================================
 * PERSIST TOKEN
 * ============================================================
 */

const persistToken = (newToken) => {
  if (isEmptyToken(newToken)) {
    return false;
  }

  const activeType = getActiveUserType();

  if (!activeType) {
    return false;
  }

  const tokenKey = `${activeType}-token`;

  localStorage.setItem(tokenKey, newToken);

  return true;
};

/**
 * ============================================================
 * REMOVE ALL AUTH DATA
 * ============================================================
 */

export const clearAllTokens = () => {
  /**
   * Remove every supported token.
   */
  TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });

  /**
   * Remove authentication-related storage.
   */
  const authStorageKeys = [
    "active-user-type",
    "user-type",
    "user-data",
    "userType",
    "user",
    "token",

    "admin-user",
    "hr-user",
    "employee-user",
    "manager-user",
    "team-lead-user",

    "remember-me",
    "remembered-email",
  ];

  authStorageKeys.forEach((key) => {
    localStorage.removeItem(key);
  });

  /**
   * Remove Axios default authorization.
   */
  delete apiClient.defaults.headers.common.Authorization;

  console.log("🧹 All authentication data cleared");
};

/**
 * ============================================================
 * AUTH EXPIRED HANDLER
 * ============================================================
 */

let authExpiredHandled = false;

export const clearAuthAndRedirect = () => {
  /**
   * Prevent multiple simultaneous expiry events.
   */
  if (authExpiredHandled) {
    return;
  }

  authExpiredHandled = true;

  clearAllTokens();

  /**
   * Notify the application.
   */
  window.dispatchEvent(
    new CustomEvent("auth-expired")
  );

  /**
   * Give React/router a chance to handle the event.
   *
   * If there is no listener, fall back to login.
   */
  setTimeout(() => {
    const currentPath = window.location.pathname;

    if (
      currentPath !== "/" &&
      currentPath !== "/login"
    ) {
      window.location.href = "/login";
    }

    authExpiredHandled = false;
  }, 0);
};

/**
 * ============================================================
 * JWT DECODER
 * ============================================================
 */

const decodeJwt = (token) => {
  try {
    if (isEmptyToken(token)) {
      return null;
    }

    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];

    const base64 = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const paddedBase64 =
      base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    const json = decodeURIComponent(
      atob(paddedBase64)
        .split("")
        .map(
          (character) =>
            "%" +
            character
              .charCodeAt(0)
              .toString(16)
              .padStart(2, "0")
        )
        .join("")
    );

    return JSON.parse(json);
  } catch (error) {
    console.warn("Failed to decode JWT:", error);
    return null;
  }
};

/**
 * ============================================================
 * CHECK TOKEN EXPIRATION
 * ============================================================
 *
 * Returns true when the token is already expired or
 * will expire within the specified buffer.
 */

export const isExpiringSoon = (
  token,
  bufferSeconds = 30
) => {
  const payload = decodeJwt(token);

  /**
   * If the JWT does not contain exp, we cannot determine
   * expiration on the client.
   */
  if (!payload?.exp) {
    return false;
  }

  return (
    Date.now() >=
    payload.exp * 1000 -
      bufferSeconds * 1000
  );
};

/**
 * ============================================================
 * REFRESH STATE
 * ============================================================
 *
 * This prevents multiple API calls from triggering multiple
 * refresh requests simultaneously.
 */

let refreshPromise = null;

/**
 * ============================================================
 * REFRESH ACCESS TOKEN
 * ============================================================
 */

const doRefresh = async () => {
  const expiredToken = getToken();

  if (isEmptyToken(expiredToken)) {
    clearAuthAndRedirect();

    throw new Error(
      "No token available to refresh"
    );
  }

  try {
    console.log("🔄 Refreshing access token...");

    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {
        token: expiredToken,
      },
      {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    const newToken =
      response.data?.data?.access_token ||
      response.data?.access_token ||
      response.data?.data?.token ||
      response.data?.token;

    if (isEmptyToken(newToken)) {
      throw new Error(
        "Refresh response did not contain a valid token"
      );
    }

    /**
     * Store refreshed token under the currently active
     * user type.
     */
    const saved = persistToken(newToken);

    if (!saved) {
      throw new Error(
        "Unable to persist refreshed token"
      );
    }

    /**
     * Update Axios default authorization.
     */
    apiClient.defaults.headers.common.Authorization =
      `Bearer ${newToken}`;

    console.log("✅ Access token refreshed");

    return newToken;
  } catch (error) {
    console.error(
      "❌ Token refresh failed:",
      error.response?.data || error.message
    );

    clearAuthAndRedirect();

    throw error;
  }
};

/**
 * ============================================================
 * SHARED REFRESH FUNCTION
 * ============================================================
 */

const refreshAccessToken = () => {
  /**
   * If refresh is already running, return the existing
   * promise instead of creating another request.
   */
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

/**
 * ============================================================
 * PUBLIC AUTH TOKEN GETTER
 * ============================================================
 */

export const getAuthToken = (userType = null) => {
  const activeType =
    userType || getActiveUserType();

  if (!activeType) {
    return null;
  }

  if (!USER_TYPES.includes(activeType)) {
    return null;
  }

  const tokenKey = `${activeType}-token`;
  const token = localStorage.getItem(tokenKey);

  return isEmptyToken(token)
    ? null
    : token;
};

/**
 * ============================================================
 * SET AUTH TOKEN
 * ============================================================
 */

export const setAuthToken = (
  token,
  userType
) => {
  if (
    isEmptyToken(token) ||
    !userType ||
    !USER_TYPES.includes(userType)
  ) {
    console.warn(
      "setAuthToken: Invalid token or user type"
    );

    return false;
  }

  /**
   * Remove old tokens first.
   */
  TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });

  const tokenKey = `${userType}-token`;

  /**
   * Store the new token.
   */
  localStorage.setItem(
    tokenKey,
    token
  );

  /**
   * Store active user type.
   */
  localStorage.setItem(
    "active-user-type",
    userType
  );

  localStorage.setItem(
    "user-type",
    userType
  );

  /**
   * Update Axios.
   */
  apiClient.defaults.headers.common.Authorization =
    `Bearer ${token}`;

  console.log(
    `🔑 Token set for ${userType}`
  );

  return true;
};

/**
 * ============================================================
 * REQUEST INTERCEPTOR
 * ============================================================
 */

apiClient.interceptors.request.use(
  async (config) => {
    /**
     * Ensure headers exist.
     */
    config.headers = config.headers || {};

    /**
     * Don't manually set multipart Content-Type.
     * Browser/Axios will set the correct boundary.
     */
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else {
      config.headers["Content-Type"] =
        "application/json";
    }

    /**
     * Refresh endpoint should not trigger another
     * refresh.
     */
    if (
      config.url?.includes("/auth/refresh")
    ) {
      return config;
    }

    let token = getToken();

    /**
     * If token is close to expiration, refresh it
     * before making the request.
     */
    if (
      token &&
      isExpiringSoon(token, 30)
    ) {
      try {
        token = await refreshAccessToken();
      } catch (error) {
        /**
         * Refresh already clears authentication.
         *
         * Do not attach the old token to the request.
         */
        token = null;
      }
    }

    /**
     * Always use the latest token.
     */
    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * ============================================================
 * RESPONSE INTERCEPTOR
 * ============================================================
 */

apiClient.interceptors.response.use(
  /**
   * Successful response.
   */
  (response) => {
    return response;
  },

  /**
   * Error response.
   */
  async (error) => {
    const originalRequest =
      error.config;

    /**
     * No response or no request configuration.
     */
    if (
      !error.response ||
      !originalRequest
    ) {
      return Promise.reject(error);
    }

    /**
     * Only handle 401 errors.
     */
    if (
      error.response.status !== 401
    ) {
      return Promise.reject(error);
    }

    /**
     * Never try to refresh the refresh request itself.
     */
    if (
      originalRequest.url?.includes(
        "/auth/refresh"
      )
    ) {
      clearAuthAndRedirect();

      return Promise.reject(error);
    }

    /**
     * Prevent infinite retry loops.
     */
    if (originalRequest._retry) {
      clearAuthAndRedirect();

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /**
       * Get a fresh token.
       *
       * If another request is already refreshing,
       * this waits for the same promise.
       */
      const newToken =
        await refreshAccessToken();

      /**
       * Make sure headers exist.
       */
      originalRequest.headers =
        originalRequest.headers || {};

      /**
       * Replace old token.
       */
      originalRequest.headers.Authorization =
        `Bearer ${newToken}`;

      /**
       * Retry original request.
       */
      return apiClient(originalRequest);
    } catch (refreshError) {
      return Promise.reject(
        refreshError
      );
    }
  }
);

/**
 * ============================================================
 * EXPORT
 * ============================================================
 */

export default apiClient;