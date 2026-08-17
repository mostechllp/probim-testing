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
 * USER TYPES
 * ============================================================
 */

export const USER_TYPES = ["admin", "hr", "employee", "manager", "team_lead"];

/**
 * ============================================================
 * TOKEN KEYS
 * ============================================================
 */

export const TOKEN_KEYS = [
  ...USER_TYPES.map((type) => `${type}-token`),
  "auth-token",
];

/**
 * ============================================================
 * REFRESH CONFIGURATION
 * ============================================================
 */

const REFRESH_BEFORE_EXPIRY_SECONDS = 60;

/**
 * ============================================================
 * INTERNAL STATE
 * ============================================================
 */

let refreshPromise = null;
let refreshTimer = null;
let authExpiredHandled = false;

/**
 * ============================================================
 * LOGOUT GUARD
 * ============================================================
 *
 * FIX: previously this flag was declared and checked, but
 * NOTHING in the codebase ever set it to true, so it was
 * dead code. It's now controlled explicitly via
 * beginLogout()/endLogout(), called from the logout thunk,
 * so an in-flight refresh (timer-based or 401-triggered)
 * cannot write a token back into localStorage after the
 * user has intentionally logged out.
 * ============================================================
 */

let isLoggingOut = false;

export const beginLogout = () => {
  isLoggingOut = true;
  clearRefreshTimer();
};

export const endLogout = () => {
  isLoggingOut = false;
};

/**
 * ============================================================
 * TOKEN HELPERS
 * ============================================================
 */

const isEmptyToken = (value) => {
  return (
    !value ||
    typeof value !== "string" ||
    value.trim() === "" ||
    value === "null" ||
    value === "undefined"
  );
};

const isValidUserType = (type) => {
  return typeof type === "string" && USER_TYPES.includes(type);
};

/**
 * ============================================================
 * STORAGE URL
 * ============================================================
 */

export const getStorageUrl = (path) => {
  if (!path) return null;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("data:")) return path;

  const baseUrl = API_BASE_URL?.replace(/\/api\/?$/, "") || "";
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  return `${baseUrl}/storage/${cleanPath}`;
};

/**
 * ============================================================
 * ACTIVE USER TYPE
 * ============================================================
 */

export const getActiveUserType = () => {
  const activeType = localStorage.getItem("active-user-type");

  if (!isValidUserType(activeType)) {
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

  if (!activeType) return null;

  const tokenKey = `${activeType}-token`;
  const token = localStorage.getItem(tokenKey);

  if (isEmptyToken(token)) return null;

  return tokenKey;
};

/**
 * ============================================================
 * ACTIVE TOKEN
 * ============================================================
 */

export const getActiveToken = () => {
  const tokenKey = getActiveTokenKey();

  if (!tokenKey) return null;

  const token = localStorage.getItem(tokenKey);

  return isEmptyToken(token) ? null : token;
};

const getToken = () => {
  return getActiveToken();
};

/**
 * ============================================================
 * JWT DECODER
 * ============================================================
 */

const decodeJwt = (token) => {
  try {
    if (isEmptyToken(token)) return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 =
      base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    const binary = atob(paddedBase64);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0)
    );

    const json = new TextDecoder().decode(bytes);

    return JSON.parse(json);
  } catch (error) {
    console.warn("Failed to decode JWT:", error);
    return null;
  }
};

/**
 * ============================================================
 * GET TOKEN EXPIRATION
 * ============================================================
 */

export const getTokenExpiration = (token) => {
  const payload = decodeJwt(token);

  if (!payload?.exp || typeof payload.exp !== "number") {
    return null;
  }

  return payload.exp * 1000;
};

/**
 * ============================================================
 * GET REMAINING TOKEN TIME
 * ============================================================
 */

export const getTokenRemainingTime = (token) => {
  const expiration = getTokenExpiration(token);

  if (!expiration) return null;

  return Math.max(0, expiration - Date.now());
};

/**
 * ============================================================
 * TOKEN EXPIRATION CHECK
 * ============================================================
 */

export const isTokenExpired = (token) => {
  const expiration = getTokenExpiration(token);

  if (!expiration) return false;

  return Date.now() >= expiration;
};

/**
 * ============================================================
 * TOKEN EXPIRING SOON
 * ============================================================
 */

export const isExpiringSoon = (token, bufferSeconds = 2) => {
  const expiration = getTokenExpiration(token);

  if (!expiration) return false;

  return Date.now() >= expiration - bufferSeconds * 1000;
};

/**
 * ============================================================
 * PERSIST USER
 * ============================================================
 */

const persistUser = (user) => {
  if (!user) return;

  try {
    localStorage.setItem("user-data", JSON.stringify(user));
    localStorage.setItem("user", JSON.stringify(user));

    if (user.type) {
      localStorage.setItem("user-type", user.type);
      localStorage.setItem("active-user-type", user.type);
    }
  } catch (error) {
    console.warn("Unable to persist user:", error);
  }
};

/**
 * ============================================================
 * PERSIST TOKEN
 * ============================================================
 *
 * FIX: userType is now REQUIRED for refresh-driven writes
 * (see doRefresh below). The function no longer silently
 * falls back to re-reading localStorage when the caller
 * already knows the correct type — that fallback was the
 * seam where a cleared/changed "active-user-type" (e.g. from
 * another tab) could cause a successful refresh to fail to
 * persist.
 * ============================================================
 */

const persistToken = (token, userType = null) => {
  if (isEmptyToken(token)) return false;

  if (isLoggingOut) {
    console.warn("persistToken: Ignored token write during/after logout");
    return false;
  }

  const activeType = userType || getActiveUserType();

  if (!isValidUserType(activeType)) {
    console.warn("persistToken: No valid user type", { activeType });
    return false;
  }

  const tokenKey = `${activeType}-token`;

  TOKEN_KEYS.forEach((key) => {
    if (key !== tokenKey) {
      localStorage.removeItem(key);
    }
  });

  localStorage.setItem(tokenKey, token);
  localStorage.setItem("active-user-type", activeType);
  localStorage.setItem("user-type", activeType);

  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;

  return true;
};

/**
 * ============================================================
 * SET AUTH TOKEN
 * ============================================================
 */

export const setAuthToken = (token, userType, user = null) => {
  if (isEmptyToken(token) || !isValidUserType(userType)) {
    console.warn("setAuthToken: Invalid token or user type");
    return false;
  }

  // A fresh, explicit login always wins over any stale logout state.
  endLogout();

  const saved = persistToken(token, userType);

  if (!saved) return false;

  if (user) {
    persistUser(user);
  }

  scheduleTokenRefresh(token);

  return true;
};

/**
 * ============================================================
 * PUBLIC AUTH TOKEN GETTER
 * ============================================================
 */

export const getAuthToken = (userType = null) => {
  const activeType = userType || getActiveUserType();

  if (!isValidUserType(activeType)) return null;

  const tokenKey = `${activeType}-token`;
  const token = localStorage.getItem(tokenKey);

  return isEmptyToken(token) ? null : token;
};

/**
 * ============================================================
 * CLEAR REFRESH TIMER
 * ============================================================
 */

export const clearRefreshTimer = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

/**
 * ============================================================
 * CLEAR ALL AUTH DATA
 * ============================================================
 */

export const clearAllTokens = () => {
  clearRefreshTimer();

  TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });

  const authStorageKeys = [
    "active-user-type",
    "user-type",
    "userType",
    "user-data",
    "user",
    "token",
    "admin-user",
    "hr-user",
    "employee-user",
    "manager-user",
    "team_lead-user",
    "team-lead-user",
    "remember-me",
    "remembered-email",
  ];

  authStorageKeys.forEach((key) => {
    localStorage.removeItem(key);
  });

  delete apiClient.defaults.headers.common.Authorization;
};

/**
 * ============================================================
 * AUTH EXPIRED HANDLER
 * ============================================================
 */

export const clearAuthAndRedirect = () => {
  if (authExpiredHandled) return;

  authExpiredHandled = true;

  console.warn("🚪 Authentication expired. Logging out.");

  clearAllTokens();

  window.dispatchEvent(new CustomEvent("auth-expired"));

  setTimeout(() => {
    const currentPath = window.location.pathname;

    if (currentPath !== "/login" && currentPath !== "/") {
      window.location.href = "/login";
    }

    authExpiredHandled = false;
  }, 0);
};

/**
 * ============================================================
 * ERROR CLASSIFICATION
 * ============================================================
 *
 * FIX: This is the key addition. Previously ANY error thrown
 * inside doRefresh() — whether the server actually rejected
 * the refresh, or something purely local went wrong after a
 * 200 response — was treated the same way by callers and
 * triggered an immediate logout.
 *
 * Now we distinguish:
 *   - "hard" auth failure: the refresh endpoint itself
 *     returned 401/403, meaning the session really is dead.
 *   - everything else: transient/local — worth retrying,
 *     NOT a reason to log the user out.
 * ============================================================
 */

const isHardAuthFailure = (error) => {
  const status = error?.response?.status;
  return status === 401 || status === 403;
};

/**
 * ============================================================
 * REFRESH ACCESS TOKEN
 * ============================================================
 */

const doRefresh = async () => {
  if (isLoggingOut) {
    throw new Error("Logout in progress; refresh aborted");
  }

  // Snapshot both together, once, at the start — this is the
  // type/token pair we commit to for this whole refresh cycle.
  const activeType = getActiveUserType();
  const currentToken = getToken();

  if (!isValidUserType(activeType) || isEmptyToken(currentToken)) {
    throw new Error("No valid authentication session");
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { token: currentToken },
      {
        headers: {
          Authorization: `Bearer ${currentToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const responseData = response.data?.data;

    const newToken =
      responseData?.access_token ||
      response.data?.access_token ||
      responseData?.token ||
      response.data?.token;

    const refreshedUser = responseData?.user || response.data?.user || null;

    if (isEmptyToken(newToken)) {
      throw new Error("Refresh response did not contain access_token");
    }

    /**
     * FIX: previously, if the backend response didn't include
     * a `user` object with a `type`, we fell back to
     * `activeType` — good — but if for any reason THAT was
     * momentarily invalid we threw, discarding a token the
     * server had just successfully issued. Since activeType
     * was already validated above and captured before the
     * await, it's safe to trust here unconditionally.
     */
    const newUserType =
      refreshedUser?.type && isValidUserType(refreshedUser.type)
        ? refreshedUser.type
        : activeType;

    // Always persist using the type we committed to at the
    // start of this cycle — never re-derive from localStorage
    // here, so a concurrent change elsewhere can't cause a
    // successful refresh to be silently dropped.
    const saved = persistToken(newToken, newUserType);

    if (!saved) {
      // This can now only happen if isLoggingOut flipped true
      // mid-flight (a real, intentional logout) — in which
      // case NOT persisting is correct, not a bug.
      if (isLoggingOut) {
        return newToken;
      }
      throw new Error("Unable to persist refreshed token");
    }

    if (refreshedUser) {
      persistUser(refreshedUser);
    }

    scheduleTokenRefresh(newToken);

    return newToken;
  } catch (error) {
    console.error(
      "❌ Token refresh failed:",
      error.response?.data || error.message
    );
    throw error;
  }
};

/**
 * ============================================================
 * SHARED REFRESH FUNCTION
 * ============================================================
 */

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

/**
 * ============================================================
 * SCHEDULE AUTOMATIC TOKEN REFRESH
 * ============================================================
 */

export const scheduleTokenRefresh = (token) => {
  clearRefreshTimer();

  if (isEmptyToken(token)) return;

  const expiration = getTokenExpiration(token);

  if (!expiration) {
    console.warn("⚠️ Cannot schedule token refresh: JWT exp not found");
    return;
  }

  const now = Date.now();
  const remaining = expiration - now;

  const refreshDelay = Math.max(
    100,
    remaining - REFRESH_BEFORE_EXPIRY_SECONDS * 1000
  );

  refreshTimer = setTimeout(async () => {
    if (isLoggingOut) return;

    const latestToken = getToken();

    if (isEmptyToken(latestToken)) return;

    const latestExpiration = getTokenExpiration(latestToken);

    if (latestExpiration && latestExpiration !== expiration) {
      // Another refresh already happened — reschedule off the new token.
      scheduleTokenRefresh(latestToken);
      return;
    }

    try {
      await refreshAccessToken();
    } catch (error) {
      console.error(
        "❌ Automatic token refresh failed:",
        error.response?.data || error.message
      );

      /**
       * FIX: only force logout on a genuine hard auth failure
       * (server said 401/403) or a token that's actually
       * expired now. Any other error — network blip, timeout,
       * transient local state — gets retried instead of
       * logging the user out from under them.
       */
      const currentToken = getToken();
      const trulyExpired = !currentToken || isTokenExpired(currentToken);

      if (isHardAuthFailure(error) || trulyExpired) {
        clearAuthAndRedirect();
        return;
      }

      refreshTimer = setTimeout(() => {
        if (isLoggingOut) return;
        const retryToken = getToken();
        if (retryToken) {
          scheduleTokenRefresh(retryToken);
        }
      }, 1000);
    }
  }, refreshDelay);
};

/**
 * ============================================================
 * INITIALIZE REFRESH TIMER
 * ============================================================
 */

export const initializeTokenRefresh = () => {
  const token = getToken();

  if (!token) return;

  if (isTokenExpired(token)) {
    console.warn("Stored access token has expired.");
    clearAuthAndRedirect();
    return;
  }

  scheduleTokenRefresh(token);
};

/**
 * ============================================================
 * REQUEST INTERCEPTOR
 * ============================================================
 */

apiClient.interceptors.request.use(
  async (config) => {
    config.headers = config.headers || {};

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else {
      config.headers["Content-Type"] = "application/json";
    }

    if (config.url?.includes("/auth/refresh")) {
      return config;
    }

    let token = getToken();

    if (!token) {
      delete config.headers.Authorization;
      return config;
    }

    if (isExpiringSoon(token, REFRESH_BEFORE_EXPIRY_SECONDS)) {
      try {
        token = await refreshAccessToken();
      } catch (refreshError) {
        console.error(
          "❌ Pre-request token refresh failed:",
          refreshError.response?.data || refreshError.message
        );

        /**
         * FIX: same distinction as above — only bail out to
         * login on a hard auth failure or a token that's
         * actually expired. Otherwise fall through and attach
         * whatever token we still have; the response
         * interceptor's 401 handling is the real safety net.
         */
        if (isHardAuthFailure(refreshError) || isTokenExpired(token)) {
          clearAuthAndRedirect();
          return Promise.reject(refreshError);
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
  (response) => {
    return response;
  },

  async (error) => {
    const originalRequest = error.config;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    if (error.response.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes("/auth/refresh")) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newToken = await refreshAccessToken();

      if (isEmptyToken(newToken)) {
        throw new Error("Refresh returned empty token");
      }

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      console.error(
        "❌ Unable to recover from 401:",
        refreshError.response?.data || refreshError.message
      );

      clearAuthAndRedirect();

      return Promise.reject(refreshError);
    }
  }
);

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const token = getToken();
      if (token) {
        // Reschedule (and refresh immediately if needed) against
        // real elapsed time, not the stale schedule from before
        // the tab was hidden.
        scheduleTokenRefresh(token);
      }
    }
  });
}

/**
 * ============================================================
 * EXPORT
 * ============================================================
 */

export default apiClient;