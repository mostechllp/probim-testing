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

export const USER_TYPES = [
  "admin",
  "hr",
  "employee",
  "manager",
  "team_lead",
];

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
 *
 * The refresh buffer is NOT based on the token lifetime.
 *
 * We calculate the actual JWT expiry dynamically from `exp`
 * and refresh 2 seconds BEFORE that expiry.
 *
 * Example:
 *
 * Token expires at 10:00:00
 * Refresh scheduled at 09:59:58
 *
 * ============================================================
 */

const REFRESH_BEFORE_EXPIRY_SECONDS = 2;

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
 * Prevents an in-flight token refresh (scheduled timer OR a
 * 401-triggered refresh) from writing a token back into
 * localStorage AFTER the user has logged out.
 *
 * Without this, the following race is possible:
 *
 * 1. Refresh request is sent (token about to expire).
 * 2. User clicks logout -> clearAllTokens() wipes storage.
 * 3. Refresh response arrives -> persistToken() re-saves the
 *    token -> user appears logged in again after reload.
 * ============================================================
 */

let isLoggingOut = false;

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
  return (
    typeof type === "string" &&
    USER_TYPES.includes(type)
  );
};

/**
 * ============================================================
 * STORAGE URL
 * ============================================================
 */

export const getStorageUrl = (path) => {
  if (!path) {
    return null;
  }

  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  if (path.startsWith("data:")) {
    return path;
  }

  const baseUrl =
    API_BASE_URL?.replace(/\/api\/?$/, "") || "";

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
  const activeType =
    localStorage.getItem(
      "active-user-type"
    );

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
  const activeType =
    getActiveUserType();

  if (!activeType) {
    return null;
  }

  const tokenKey =
    `${activeType}-token`;

  const token =
    localStorage.getItem(tokenKey);

  if (isEmptyToken(token)) {
    return null;
  }

  return tokenKey;
};

/**
 * ============================================================
 * ACTIVE TOKEN
 * ============================================================
 */

export const getActiveToken = () => {
  const tokenKey =
    getActiveTokenKey();

  if (!tokenKey) {
    return null;
  }

  const token =
    localStorage.getItem(tokenKey);

  return isEmptyToken(token)
    ? null
    : token;
};

/**
 * Internal alias
 */

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
    if (isEmptyToken(token)) {
      return null;
    }

    const parts =
      token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload =
      parts[1];

    const base64 =
      payload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const paddedBase64 =
      base64 +
      "=".repeat(
        (4 -
          (base64.length % 4)) %
          4
      );

    const binary =
      atob(paddedBase64);

    const bytes =
      Uint8Array.from(
        binary,
        (character) =>
          character.charCodeAt(0)
      );

    const json =
      new TextDecoder().decode(bytes);

    return JSON.parse(json);
  } catch (error) {
    console.warn(
      "Failed to decode JWT:",
      error
    );

    return null;
  }
};

/**
 * ============================================================
 * GET TOKEN EXPIRATION
 * ============================================================
 *
 * Returns expiry timestamp in milliseconds.
 *
 * JWT:
 *
 * {
 *   exp: 1755000000
 * }
 *
 * ============================================================
 */

export const getTokenExpiration = (
  token
) => {
  const payload =
    decodeJwt(token);

  if (
    !payload?.exp ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  return payload.exp * 1000;
};

/**
 * ============================================================
 * GET REMAINING TOKEN TIME
 * ============================================================
 *
 * Returns remaining lifetime in milliseconds.
 * ============================================================
 */

export const getTokenRemainingTime = (
  token
) => {
  const expiration =
    getTokenExpiration(token);

  if (!expiration) {
    return null;
  }

  return Math.max(
    0,
    expiration - Date.now()
  );
};

/**
 * ============================================================
 * TOKEN EXPIRATION CHECK
 * ============================================================
 */

export const isTokenExpired = (
  token
) => {
  const expiration =
    getTokenExpiration(token);

  if (!expiration) {
    return false;
  }

  return (
    Date.now() >= expiration
  );
};

/**
 * ============================================================
 * TOKEN EXPIRING SOON
 * ============================================================
 *
 * This function is kept for compatibility.
 *
 * Unlike the old implementation, callers can provide
 * their own buffer.
 * ============================================================
 */

export const isExpiringSoon = (
  token,
  bufferSeconds = 2
) => {
  const expiration =
    getTokenExpiration(token);

  if (!expiration) {
    return false;
  }

  return (
    Date.now() >=
    expiration -
      bufferSeconds * 1000
  );
};

/**
 * ============================================================
 * PERSIST USER
 * ============================================================
 */

const persistUser = (user) => {
  if (!user) {
    return;
  }

  try {
    localStorage.setItem(
      "user-data",
      JSON.stringify(user)
    );

    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );

    if (user.type) {
      localStorage.setItem(
        "user-type",
        user.type
      );

      localStorage.setItem(
        "active-user-type",
        user.type
      );
    }
  } catch (error) {
    console.warn(
      "Unable to persist user:",
      error
    );
  }
};

/**
 * ============================================================
 * PERSIST TOKEN
 * ============================================================
 */

const persistToken = (
  token,
  userType = null
) => {
  if (isEmptyToken(token)) {
    return false;
  }

  /**
   * A logout happened while this token was in flight
   * (e.g. a scheduled refresh or a 401 retry that started
   * before clearAllTokens() ran). Do NOT resurrect the
   * session.
   */

  if (isLoggingOut) {
    console.warn(
      "persistToken: Ignored token write during/after logout"
    );

    return false;
  }

  const activeType =
    userType ||
    getActiveUserType();

  if (!isValidUserType(activeType)) {
    console.warn(
      "persistToken: No valid user type",
      {
        activeType,
      }
    );

    return false;
  }

  const tokenKey =
    `${activeType}-token`;

  /**
   * Remove other role tokens.
   */

  TOKEN_KEYS.forEach(
    (key) => {
      if (key !== tokenKey) {
        localStorage.removeItem(
          key
        );
      }
    }
  );

  /**
   * Save new token.
   */

  localStorage.setItem(
    tokenKey,
    token
  );

  localStorage.setItem(
    "active-user-type",
    activeType
  );

  localStorage.setItem(
    "user-type",
    activeType
  );

  /**
   * Synchronize Axios default header.
   */

  apiClient.defaults.headers.common.Authorization =
    `Bearer ${token}`;

  return true;
};

/**
 * ============================================================
 * SET AUTH TOKEN
 * ============================================================
 */

export const setAuthToken = (
  token,
  userType,
  user = null
) => {
  if (
    isEmptyToken(token) ||
    !isValidUserType(userType)
  ) {
    console.warn(
      "setAuthToken: Invalid token or user type"
    );

    return false;
  }

  /**
   * A fresh, explicit login always wins over any stale
   * logout state.
   */

  isLoggingOut = false;

  const saved =
    persistToken(
      token,
      userType
    );

  if (!saved) {
    return false;
  }

  if (user) {
    persistUser(user);
  }

  /**
   * Immediately schedule automatic refresh.
   */

  scheduleTokenRefresh(
    token
  );

  console.log(
    `🔐 Authentication stored for ${userType}`
  );

  return true;
};

/**
 * ============================================================
 * PUBLIC AUTH TOKEN GETTER
 * ============================================================
 */

export const getAuthToken = (
  userType = null
) => {
  const activeType =
    userType ||
    getActiveUserType();

  if (
    !isValidUserType(
      activeType
    )
  ) {
    return null;
  }

  const tokenKey =
    `${activeType}-token`;

  const token =
    localStorage.getItem(
      tokenKey
    );

  return isEmptyToken(token)
    ? null
    : token;
};

/**
 * ============================================================
 * CLEAR REFRESH TIMER
 * ============================================================
 */

export const clearRefreshTimer = () => {
  if (refreshTimer) {
    clearTimeout(
      refreshTimer
    );

    refreshTimer = null;
  }
};

/**
 * ============================================================
 * CLEAR ALL AUTH DATA
 * ============================================================
 */

export const clearAllTokens = () => {
  console.log('🧹 clearAllTokens() CALLED. admin-token before:', localStorage.getItem('admin-token'));

  clearRefreshTimer();

  TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });

  console.log('🧹 After TOKEN_KEYS removal loop. admin-token now:', localStorage.getItem('admin-token'));
  console.log('🧹 TOKEN_KEYS was:', TOKEN_KEYS);

  const authStorageKeys = [
    "active-user-type", "user-type", "userType", "user-data", "user", "token",
    "admin-user", "hr-user", "employee-user", "manager-user", "team_lead-user", "team-lead-user",
    "remember-me", "remembered-email",
  ];

  authStorageKeys.forEach((key) => {
    localStorage.removeItem(key);
  });

  delete apiClient.defaults.headers.common.Authorization;

  console.log('🧹 clearAllTokens() FINISHED. admin-token final:', localStorage.getItem('admin-token'));
};

/**
 * ============================================================
 * AUTH EXPIRED HANDLER
 * ============================================================
 */

export const clearAuthAndRedirect =
  () => {
    if (authExpiredHandled) {
      return;
    }

    authExpiredHandled =
      true;

    console.warn(
      "🚪 Authentication expired. Logging out."
    );

    clearAllTokens();

    window.dispatchEvent(
      new CustomEvent(
        "auth-expired"
      )
    );

    setTimeout(() => {
      const currentPath =
        window.location.pathname;

      if (
        currentPath !== "/login" &&
        currentPath !== "/"
      ) {
        window.location.href =
          "/login";
      }

      authExpiredHandled =
        false;
    }, 0);
  };

/**
 * ============================================================
 * REFRESH ACCESS TOKEN
 * ============================================================
 */

const doRefresh = async () => {
  if (isLoggingOut) {
    throw new Error(
      "Logout in progress; refresh aborted"
    );
  }

  const activeType =
    getActiveUserType();

  const currentToken =
    getToken();

  /**
   * We require both.
   */

  if (
    !isValidUserType(
      activeType
    ) ||
    isEmptyToken(
      currentToken
    )
  ) {
    throw new Error(
      "No valid authentication session"
    );
  }

  /**
   * IMPORTANT:
   *
   * Do not attempt to refresh an already expired token.
   *
   * The backend may blacklist/reject it.
   */

  if (
    isTokenExpired(
      currentToken
    )
  ) {
    throw new Error(
      "Access token has already expired"
    );
  }

  /**
   * Calculate remaining lifetime.
   */

  const remainingTime =
    getTokenRemainingTime(
      currentToken
    );

  console.log(
    "🔄 Refreshing access token...",
    {
      userType:
        activeType,

      remainingSeconds:
        remainingTime !== null
          ? Math.round(
              remainingTime /
                1000
            )
          : null,
    }
  );

  try {
    /**
     * Use plain axios.
     *
     * This prevents the refresh request from
     * triggering our own interceptors.
     */

    const response =
      await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {
          token:
            currentToken,
        },
        {
          headers: {
            Authorization:
              `Bearer ${currentToken}`,

            Accept:
              "application/json",

            "Content-Type":
              "application/json",
          },

          timeout: 15000,
        }
      );

    /**
     * Backend response:
     *
     * {
     *   status: "success",
     *   message: "...",
     *   data: {
     *      access_token: "...",
     *      token_type: "bearer",
     *      expires_in: 3600,
     *      user: {...}
     *   }
     * }
     */

    const responseData =
      response.data?.data;

    const newToken =
      responseData
        ?.access_token ||
      response.data
        ?.access_token ||
      responseData?.token ||
      response.data?.token;

    const refreshedUser =
      responseData?.user ||
      response.data?.user ||
      null;

    if (
      isEmptyToken(
        newToken
      )
    ) {
      throw new Error(
        "Refresh response did not contain access_token"
      );
    }

    /**
     * Determine user type.
     */

    const newUserType =
      refreshedUser?.type ||
      activeType;

    if (
      !isValidUserType(
        newUserType
      )
    ) {
      throw new Error(
        "Refresh response contains invalid user type"
      );
    }

    /**
     * Save NEW token.
     */

    const saved =
      persistToken(
        newToken,
        newUserType
      );

    if (!saved) {
      throw new Error(
        "Unable to persist refreshed token"
      );
    }

    /**
     * Save refreshed user.
     */

    if (refreshedUser) {
      persistUser(
        refreshedUser
      );
    }

    /**
     * Immediately schedule refresh
     * using the NEW token.
     */

    scheduleTokenRefresh(
      newToken
    );

    /**
     * Log actual new expiry.
     */

    const newRemainingTime =
      getTokenRemainingTime(
        newToken
      );

    console.log(
      "✅ Access token refreshed successfully",
      {
        userType:
          newUserType,

        expiresInSeconds:
          newRemainingTime !==
          null
            ? Math.round(
                newRemainingTime /
                  1000
              )
            : null,

        backendExpiresIn:
          responseData
            ?.expires_in,
      }
    );

    return newToken;
  } catch (error) {
    console.error(
      "❌ Token refresh failed:",
      error.response?.data ||
        error.message
    );

    throw error;
  }
};

/**
 * ============================================================
 * SHARED REFRESH FUNCTION
 * ============================================================
 *
 * Prevents multiple refresh requests.
 *
 * If 10 API requests happen at exactly the same time,
 * only ONE /auth/refresh request is sent.
 * ============================================================
 */

const refreshAccessToken =
  () => {
    if (!refreshPromise) {
      refreshPromise =
        doRefresh()
          .finally(() => {
            refreshPromise =
              null;
          });
    }

    return refreshPromise;
  };

/**
 * ============================================================
 * SCHEDULE AUTOMATIC TOKEN REFRESH
 * ============================================================
 *
 * This is the important part.
 *
 * We do NOT assume that tokens live for 3600 seconds.
 *
 * Instead:
 *
 * JWT exp
 *   ↓
 * actual expiration timestamp
 *   ↓
 * expiration - 2 seconds
 *   ↓
 * setTimeout()
 *
 * Example:
 *
 * Token expires in 3600 seconds:
 *
 * refresh after:
 * 3598 seconds
 *
 * Token expires in 900 seconds:
 *
 * refresh after:
 * 898 seconds
 *
 * Token expires in 120 seconds:
 *
 * refresh after:
 * 118 seconds
 *
 * ============================================================
 */

export const scheduleTokenRefresh = (
  token
) => {
  /**
   * Clear existing timer.
   */

  clearRefreshTimer();

  if (
    isEmptyToken(token)
  ) {
    return;
  }

  const expiration =
    getTokenExpiration(
      token
    );

  if (!expiration) {
    console.warn(
      "⚠️ Cannot schedule token refresh: JWT exp not found"
    );

    return;
  }

  const now =
    Date.now();

  const remaining =
    expiration - now;

  /**
   * Refresh 2 seconds before expiry.
   */

  const refreshDelay =
    Math.max(
      100,
      remaining -
        REFRESH_BEFORE_EXPIRY_SECONDS *
          1000
    );

  console.log(
    "⏰ Token refresh scheduled",
    {
      expiresInSeconds:
        Math.round(
          remaining / 1000
        ),

      refreshInSeconds:
        Math.round(
          refreshDelay / 1000
        ),

      refreshBeforeExpiry:
        REFRESH_BEFORE_EXPIRY_SECONDS,
    }
  );

  refreshTimer =
    setTimeout(
      async () => {
        /**
         * Get the latest token.
         *
         * This is important because another request
         * might already have refreshed it.
         */

        const latestToken =
          getToken();

        if (
          isEmptyToken(
            latestToken
          )
        ) {
          return;
        }

        /**
         * Check whether this timer belongs to
         * the current token.
         */

        const latestExpiration =
          getTokenExpiration(
            latestToken
          );

        if (
          latestExpiration &&
          latestExpiration !==
            expiration
        ) {
          /**
           * Another refresh already happened.
           *
           * Schedule based on the new token.
           */

          console.log(
            "🔁 Token already refreshed by another process. Rescheduling."
          );

          scheduleTokenRefresh(
            latestToken
          );

          return;
        }

        try {
          console.log(
            "⏳ Token approaching expiration. Starting automatic refresh..."
          );

          await refreshAccessToken();
        } catch (error) {
          console.error(
            "❌ Automatic token refresh failed:",
            error.response
              ?.data ||
              error.message
          );

          /**
           * If the token is still valid,
           * give it another chance shortly.
           *
           * If it is already expired,
           * logout.
           */

          const currentToken =
            getToken();

          if (
            !currentToken ||
            isTokenExpired(
              currentToken
            )
          ) {
            clearAuthAndRedirect();

            return;
          }

          /**
           * Retry after 1 second.
           *
           * This is NOT a fixed token lifetime.
           * It is only a retry interval.
           */

          refreshTimer =
            setTimeout(
              () => {
                const retryToken =
                  getToken();

                if (
                  retryToken
                ) {
                  scheduleTokenRefresh(
                    retryToken
                  );
                }
              },
              1000
            );
        }
      },
      refreshDelay
    );
};

/**
 * ============================================================
 * INITIALIZE REFRESH TIMER
 * ============================================================
 *
 * Call this after application startup if a token already
 * exists in localStorage.
 * ============================================================
 */

export const initializeTokenRefresh =
  () => {
    const token =
      getToken();

    if (
      !token
    ) {
      return;
    }

    /**
     * If already expired, don't attempt to refresh
     * using an expired token.
     */

    if (
      isTokenExpired(
        token
      )
    ) {
      console.warn(
        "Stored access token has expired."
      );

      clearAuthAndRedirect();

      return;
    }

    scheduleTokenRefresh(
      token
    );
  };

/**
 * ============================================================
 * REQUEST INTERCEPTOR
 * ============================================================
 */

apiClient.interceptors.request.use(
  async (config) => {
    config.headers =
      config.headers || {};

    /**
     * Multipart request.
     */

    if (
      config.data instanceof
      FormData
    ) {
      delete config
        .headers[
        "Content-Type"
      ];
    } else {
      config.headers[
        "Content-Type"
      ] =
        "application/json";
    }

    /**
     * Never intercept refresh endpoint.
     */

    if (
      config.url?.includes(
        "/auth/refresh"
      )
    ) {
      return config;
    }

    let token =
      getToken();

    /**
     * No authentication token.
     *
     * Allow public APIs.
     */

    if (!token) {
      delete config.headers
        .Authorization;

      return config;
    }

    /**
     * ========================================================
     * LAST-MOMENT SAFETY CHECK
     * ========================================================
     *
     * Normally the timer will already have refreshed
     * the token.
     *
     * This is only a safety net in case:
     *
     * - browser slept
     * - computer went to sleep
     * - tab was suspended
     * - timer was delayed
     */

    if (
      isExpiringSoon(
        token,
        REFRESH_BEFORE_EXPIRY_SECONDS
      )
    ) {
      try {
        token =
          await refreshAccessToken();
      } catch (refreshError) {
        console.error(
          "❌ Pre-request token refresh failed:",
          refreshError
            .response?.data ||
            refreshError.message
        );

        /**
         * Don't intentionally send an expired token.
         */

        if (
          isTokenExpired(
            token
          )
        ) {
          clearAuthAndRedirect();

          return Promise.reject(
            refreshError
          );
        }

        /**
         * If still valid, attach it.
         *
         * Response interceptor can handle a 401.
         */
      }
    }

    /**
     * Always use latest token.
     */

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(
      error
    );
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
   * Failed response.
   */

  async (error) => {
    const originalRequest =
      error.config;

    /**
     * Network error.
     */

    if (
      !error.response ||
      !originalRequest
    ) {
      return Promise.reject(
        error
      );
    }

    /**
     * Only handle 401.
     */

    if (
      error.response.status !==
      401
    ) {
      return Promise.reject(
        error
      );
    }

    /**
     * Never refresh the refresh endpoint.
     *
     * If refresh itself returns 401,
     * the refresh token/session is no longer valid.
     */

    if (
      originalRequest.url?.includes(
        "/auth/refresh"
      )
    ) {
      clearAuthAndRedirect();

      return Promise.reject(
        error
      );
    }

    /**
     * Prevent infinite retry.
     */

    if (
      originalRequest._retry
    ) {
      clearAuthAndRedirect();

      return Promise.reject(
        error
      );
    }

    originalRequest._retry =
      true;

    try {
      console.log(
        "🔄 API returned 401. Attempting token refresh..."
      );

      /**
       * One shared refresh request.
       */

      const newToken =
        await refreshAccessToken();

      if (
        isEmptyToken(
          newToken
        )
      ) {
        throw new Error(
          "Refresh returned empty token"
        );
      }

      /**
       * Ensure headers exist.
       */

      originalRequest.headers =
        originalRequest
          .headers || {};

      /**
       * Attach NEW token.
       */

      originalRequest.headers.Authorization =
        `Bearer ${newToken}`;

      /**
       * Retry original API request.
       */

      return apiClient(
        originalRequest
      );
    } catch (refreshError) {
      console.error(
        "❌ Unable to recover from 401:",
        refreshError
          .response?.data ||
          refreshError.message
      );

      clearAuthAndRedirect();

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