import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import apiClient, {
  USER_TYPES,
  TOKEN_KEYS,
  getActiveToken,
  setAuthToken,
  clearAllTokens,
} from "../../utils/apiClient";

// ============================================================
// HELPERS
// ============================================================

const isValidToken = (token) => {
  return (
    typeof token === "string" &&
    token.trim() !== "" &&
    token !== "null" &&
    token !== "undefined"
  );
};

// ------------------------------------------------------------
// Get token key according to user type
// ------------------------------------------------------------

const getTokenKey = (userType) => {
  if (!userType) {
    return null;
  }

  // If TOKEN_KEYS is an object
  if (
    !Array.isArray(TOKEN_KEYS) &&
    TOKEN_KEYS[userType]
  ) {
    return TOKEN_KEYS[userType];
  }

  // If TOKEN_KEYS is an array, try common naming patterns
  if (Array.isArray(TOKEN_KEYS)) {
    const possibleKeys = [
      `${userType}-token`,
      `${userType}_token`,
      `${userType}Token`,
    ];

    const matchingKey = possibleKeys.find((key) =>
      TOKEN_KEYS.includes(key)
    );

    if (matchingKey) {
      return matchingKey;
    }
  }

  // Fallback
  return `${userType}-token`;
};

// ------------------------------------------------------------
// Get user type safely
// ------------------------------------------------------------

const getUserTypeFromStorage = () => {
  try {
    const activeType =
      localStorage.getItem("active-user-type");

    if (
      activeType &&
      USER_TYPES.includes(activeType)
    ) {
      return activeType;
    }

    const userType =
      localStorage.getItem("user-type");

    if (
      userType &&
      USER_TYPES.includes(userType)
    ) {
      return userType;
    }

    return null;
  } catch (error) {
    console.error(
      "Failed to get user type from storage:",
      error
    );

    return null;
  }
};

// ------------------------------------------------------------
// Get user safely
// ------------------------------------------------------------

const normalizeUser = (user) => {
  if (
    !user ||
    typeof user !== "object"
  ) {
    return null;
  }

  return {
    ...user,

    name:
      user.employee?.name ||
      user.username ||
      user.name ||
      "",
  };
};

const getUserFromStorage = () => {
  try {
    const storedUser =
      localStorage.getItem("user-data");

    if (!storedUser) {
      return null;
    }

    const parsedUser =
      JSON.parse(storedUser);

    return normalizeUser(parsedUser);
  } catch (error) {
    console.error(
      "Failed to parse stored user:",
      error
    );

    localStorage.removeItem(
      "user-data"
    );

    return null;
  }
};

// ============================================================
// SAFE TOKEN INITIALIZATION
// ============================================================

/*
 * IMPORTANT:
 *
 * Do NOT call getActiveToken() here.
 *
 * getActiveToken() may expect an active user type.
 * On the first application load there is no active user type,
 * which causes:
 *
 * "No valid active user type"
 *
 * Instead, only read a token if a valid user type already exists.
 */

const getStoredTokenSafely = () => {
  try {
    const userType =
      getUserTypeFromStorage();

    if (!userType) {
      return null;
    }

    const tokenKey =
      getTokenKey(userType);

    if (!tokenKey) {
      return null;
    }

    const token =
      localStorage.getItem(tokenKey);

    return isValidToken(token)
      ? token
      : null;
  } catch (error) {
    console.error(
      "Failed to get stored authentication token:",
      error
    );

    return null;
  }
};

// ============================================================
// PERSIST USER
// ============================================================

const persistUserData = (
  user,
  userType
) => {
  if (!user) {
    return;
  }

  const normalizedUser =
    normalizeUser(user);

  localStorage.setItem(
    "user-data",
    JSON.stringify(normalizedUser)
  );

  if (userType) {
    localStorage.setItem(
      "active-user-type",
      userType
    );

    localStorage.setItem(
      "user-type",
      userType
    );
  }
};

// ============================================================
// ROLE-SPECIFIC USER STORAGE
// ============================================================

const persistRoleSpecificUser = (
  user,
  userType
) => {
  if (!user || !userType) {
    return;
  }

  const storageMap = {
    admin: "admin-user",
    hr: "hr-user",
    employee: "employee-user",
    manager: "manager-user",
    team_lead: "team_lead-user",
  };

  const storageKey =
    storageMap[userType];

  if (storageKey) {
    localStorage.setItem(
      storageKey,
      JSON.stringify(user)
    );
  }
};

// ============================================================
// CLEAR USER DATA
// ============================================================

const clearUserData = () => {
  const userKeys = [
    "user-data",
    "user-type",
    "active-user-type",
    "user",
    "userType",

    "admin-user",
    "hr-user",
    "employee-user",
    "manager-user",
    "team_lead-user",
  ];

  userKeys.forEach((key) => {
    localStorage.removeItem(key);
  });
};

// ============================================================
// CLEAR AUTH STORAGE
// ============================================================

const clearAuthStorage = () => {
  /*
   * Clear tokens through apiClient helper.
   */
  try {
    clearAllTokens();
  } catch (error) {
    console.error(
      "Failed to clear authentication tokens:",
      error
    );
  }

  /*
   * Clear user information.
   */
  clearUserData();

  /*
   * Clear axios authorization header.
   */
  if (
    apiClient?.defaults?.headers?.common
  ) {
    delete apiClient.defaults.headers
      .common.Authorization;
  }
};

// ============================================================
// INITIAL STATE
// ============================================================

const storedUser =
  getUserFromStorage();

const storedUserType =
  getUserTypeFromStorage();

/*
 * IMPORTANT:
 *
 * Use getStoredTokenSafely() instead of getActiveToken()
 * during module initialization.
 */
const storedToken =
  getStoredTokenSafely();

const initialState = {
  user: storedUser,

  token: storedToken,

  userType: storedUserType,

  isAuthenticated:
    Boolean(
      storedToken &&
      storedUser &&
      storedUserType
    ),

  /*
   * Keep true until initializeAuth completes.
   */
  loading: true,

  error: null,

  profileUpdateLoading: false,

  profileUpdateError: null,

  resetSuccess: false,

  resetMessage: "",

  resetError: null,
};

// ============================================================
// LOGIN
// ============================================================

export const loginUser =
  createAsyncThunk(
    "auth/login",

    async (
      { email, password },
      { rejectWithValue }
    ) => {
      try {
        const response =
          await apiClient.post(
            "/auth/login",
            {
              username: email,
              password,
            }
          );

        const data =
          response.data?.data;

        if (!data) {
          return rejectWithValue(
            "Invalid login response from server"
          );
        }

        const accessToken =
          data.access_token;

        const user =
          data.user;

        if (
          !isValidToken(accessToken)
        ) {
          return rejectWithValue(
            "Login response does not contain a valid access token"
          );
        }

        if (
          !user ||
          !user.type
        ) {
          return rejectWithValue(
            "Login response does not contain valid user information"
          );
        }

        const userType =
          user.type;

        if (
          !USER_TYPES.includes(
            userType
          )
        ) {
          return rejectWithValue(
            `Unsupported user type: ${userType}`
          );
        }

        // ------------------------------------------------------
        // Clear previous session
        // ------------------------------------------------------

        clearAuthStorage();

        // ------------------------------------------------------
        // Save authentication token
        // ------------------------------------------------------

        const tokenSaved =
          setAuthToken(
            accessToken,
            userType
          );

        if (!tokenSaved) {
          return rejectWithValue(
            "Unable to save authentication token"
          );
        }

        // ------------------------------------------------------
        // Normalize user
        // ------------------------------------------------------

        const normalizedUser =
          normalizeUser(user);

        // ------------------------------------------------------
        // Save user
        // ------------------------------------------------------

        persistUserData(
          normalizedUser,
          userType
        );

        persistRoleSpecificUser(
          normalizedUser,
          userType
        );

        // ------------------------------------------------------
        // Remember me
        // ------------------------------------------------------

        const rememberMe =
          localStorage.getItem(
            "remember-me"
          ) === "true";

        if (rememberMe) {
          localStorage.setItem(
            "remembered-email",
            email
          );
        }

        // ------------------------------------------------------
        // Set axios authorization
        // ------------------------------------------------------

        apiClient.defaults.headers.common.Authorization =
          `Bearer ${accessToken}`;

        return {
          ...data,

          user:
            normalizedUser,
        };
      } catch (error) {
        console.error(
          "Login error:",
          error.response?.data ||
            error.message
        );

        return rejectWithValue(
          error.response?.data
            ?.message ||
            error.response?.data
              ?.error ||
            "Login failed"
        );
      }
    }
  );

// ============================================================
// LOGOUT
// ============================================================

export const logoutUser = createAsyncThunk(
  "auth/logout",

  async () => {

    clearAuthStorage();

   

    return null;
  }
);

// ============================================================
// INITIALIZE AUTH
// ============================================================

export const initializeAuth =
  createAsyncThunk(
    "auth/initialize",

    async () => {
      // --------------------------------------------------------
      // 1. Get active user type
      // --------------------------------------------------------

      const activeType =
        getUserTypeFromStorage();

      /*
       * IMPORTANT:
       *
       * No active user type is completely normal
       * when the application is opened for the first time.
       *
       * Do NOT treat this as an error.
       */

      if (!activeType) {
        return {
          authenticated: false,

          user: null,

          token: null,

          userType: null,
        };
      }

      // --------------------------------------------------------
      // 2. Get token
      // --------------------------------------------------------

      const tokenKey =
        getTokenKey(activeType);

      if (!tokenKey) {
        clearAuthStorage();

        return {
          authenticated: false,

          user: null,

          token: null,

          userType: null,
        };
      }

      const token =
        localStorage.getItem(
          tokenKey
        );

      // --------------------------------------------------------
      // 3. No token
      // --------------------------------------------------------

      if (!isValidToken(token)) {
        clearAuthStorage();

        return {
          authenticated: false,

          user: null,

          token: null,

          userType: null,
        };
      }

      try {
        // ------------------------------------------------------
        // 4. Set axios token
        // ------------------------------------------------------

        apiClient.defaults.headers.common.Authorization =
          `Bearer ${token}`;

        // ------------------------------------------------------
        // 5. Validate token
        // ------------------------------------------------------

        const response =
          await apiClient.get(
            "/auth/me"
          );

        const responseData =
          response.data?.data;

        if (!responseData) {
          throw new Error(
            "Invalid response from /auth/me"
          );
        }

        const authenticatedUser =
          responseData?.user ||
          responseData;

        if (
          !authenticatedUser ||
          typeof authenticatedUser !==
            "object"
        ) {
          throw new Error(
            "Invalid user data from /auth/me"
          );
        }

        // ------------------------------------------------------
        // 6. Backend user type
        // ------------------------------------------------------

        const backendUserType =
          authenticatedUser.type;

        if (
          !backendUserType ||
          !USER_TYPES.includes(
            backendUserType
          )
        ) {
          throw new Error(
            "Invalid user type returned by backend"
          );
        }

        // ------------------------------------------------------
        // 7. Validate user type
        // ------------------------------------------------------

        if (
          backendUserType !==
          activeType
        ) {
          console.error(
            "AUTH TYPE MISMATCH:",
            {
              localStorageType:
                activeType,

              backendType:
                backendUserType,
            }
          );

          clearAuthStorage();

          return {
            authenticated: false,

            user: null,

            token: null,

            userType: null,
          };
        }

        // ------------------------------------------------------
        // 8. Normalize user
        // ------------------------------------------------------

        const normalizedUser =
          normalizeUser(
            authenticatedUser
          );

        // ------------------------------------------------------
        // 9. Keep localStorage consistent
        // ------------------------------------------------------

        localStorage.setItem(
          "active-user-type",
          backendUserType
        );

        localStorage.setItem(
          "user-type",
          backendUserType
        );

        localStorage.setItem(
          tokenKey,
          token
        );

        persistUserData(
          normalizedUser,
          backendUserType
        );

        persistRoleSpecificUser(
          normalizedUser,
          backendUserType
        );

        // ------------------------------------------------------
        // 10. Remove other role tokens
        // ------------------------------------------------------

        if (Array.isArray(TOKEN_KEYS)) {
          TOKEN_KEYS.forEach(
            (key) => {
              if (key !== tokenKey) {
                localStorage.removeItem(
                  key
                );
              }
            }
          );
        } else if (
          TOKEN_KEYS &&
          typeof TOKEN_KEYS ===
            "object"
        ) {
          Object.values(
            TOKEN_KEYS
          ).forEach((key) => {
            if (
              key &&
              key !== tokenKey
            ) {
              localStorage.removeItem(
                key
              );
            }
          });
        }

        // ------------------------------------------------------
        // 11. Set validated token
        // ------------------------------------------------------

        apiClient.defaults.headers.common.Authorization =
          `Bearer ${token}`;

        return {
          authenticated: true,

          user:
            normalizedUser,

          token,

          userType:
            backendUserType,
        };
      } catch (error) {
        console.error(
          "Authentication initialization failed:",
          error.response?.data ||
            error.message
        );

        clearAuthStorage();

        return {
          authenticated: false,

          user: null,

          token: null,

          userType: null,
        };
      }
    }
  );

// ============================================================
// REQUEST PASSWORD RESET
// ============================================================

export const requestPasswordReset =
  createAsyncThunk(
    "auth/requestPasswordReset",

    async (
      { email },
      { rejectWithValue }
    ) => {
      try {
        const response =
          await apiClient.post(
            "/auth/forgot-password",
            {
              email,
            }
          );

        if (
          response.data?.status ===
            "success" ||
          response.data?.success
        ) {
          return {
            message:
              response.data?.message ||
              "Password reset code sent to your email",
          };
        }

        return rejectWithValue(
          response.data?.message ||
            "Failed to send reset code"
        );
      } catch (error) {
        console.error(
          "Request password reset error:",
          error.response?.data
        );

        return rejectWithValue(
          error.response?.data?.message ||
            "Failed to send reset code. Please try again."
        );
      }
    }
  );

// ============================================================
// RESET PASSWORD
// ============================================================

export const resetPassword =
  createAsyncThunk(
    "auth/resetPassword",

    async (
      { code, password },
      { rejectWithValue }
    ) => {
      try {
        const response =
          await apiClient.post(
            "/auth/reset-password",
            {
              code,
              password,
            }
          );

        if (
          response.data?.status ===
            "success" ||
          response.data?.success
        ) {
          return {
            message:
              response.data?.message ||
              "Password reset successfully",
          };
        }

        return rejectWithValue(
          response.data?.message ||
            "Failed to reset password"
        );
      } catch (error) {
        console.error(
          "Reset password error:",
          error.response?.data
        );

        if (
          error.response?.data
            ?.errors
        ) {
          const messages =
            Object.values(
              error.response.data.errors
            )
              .flat()
              .join(", ");

          return rejectWithValue(
            messages
          );
        }

        return rejectWithValue(
          error.response?.data?.message ||
            "Failed to reset password. Please try again."
        );
      }
    }
  );

// ============================================================
// UPDATE USER PROFILE
// ============================================================

export const updateUserProfile =
  createAsyncThunk(
    "auth/updateProfile",

    async (
      profileData,
      {
        rejectWithValue,
        getState,
      }
    ) => {
      try {
        const response =
          await apiClient.post(
            "/employee/update-profile",
            {
              name:
                profileData.fullName,

              email:
                profileData.email,
            }
          );

        if (
          response.data?.status !==
          "success"
        ) {
          return rejectWithValue(
            response.data?.message ||
              "Profile update failed"
          );
        }

        const updatedUser =
          response.data?.data ||
          response.data?.user;

        if (!updatedUser) {
          return rejectWithValue(
            "Invalid profile response"
          );
        }

        const currentUser =
          getState().auth.user;

        const newUserData =
          normalizeUser({
            ...currentUser,

            ...updatedUser,

            name:
              updatedUser.name ||
              updatedUser.employee
                ?.name ||
              profileData.fullName ||
              currentUser?.name ||
              "",

            email:
              updatedUser.email ||
              profileData.email ||
              currentUser?.email ||
              "",
          });

        const userType =
          getUserTypeFromStorage();

        persistUserData(
          newUserData,
          userType
        );

        persistRoleSpecificUser(
          newUserData,
          userType
        );

        return newUserData;
      } catch (error) {
        console.error(
          "Profile update error:",
          error.response?.data ||
            error.message
        );

        return rejectWithValue(
          error.response?.data?.message ||
            "Failed to update profile"
        );
      }
    }
  );

// ============================================================
// FETCH CURRENT USER
// ============================================================

export const fetchCurrentUser =
  createAsyncThunk(
    "auth/fetchCurrentUser",

    async (
      _,
      { rejectWithValue }
    ) => {
      try {
        const response =
          await apiClient.get(
            "/employee/profile"
          );

        if (
          response.data?.status !==
          "success"
        ) {
          return rejectWithValue(
            response.data?.message ||
              "Failed to fetch user data"
          );
        }

        const userData =
          response.data?.data ||
          response.data?.user;

        if (!userData) {
          return rejectWithValue(
            "Invalid user data"
          );
        }

        const userType =
          getUserTypeFromStorage();

        const normalizedUser =
          normalizeUser(userData);

        persistUserData(
          normalizedUser,
          userType
        );

        persistRoleSpecificUser(
          normalizedUser,
          userType
        );

        return normalizedUser;
      } catch (error) {
        console.error(
          "Fetch current user error:",
          error.response?.data ||
            error.message
        );

        return rejectWithValue(
          error.response?.data?.message ||
            "Failed to fetch user"
        );
      }
    }
  );

// ============================================================
// AUTH SLICE
// ============================================================

const authSlice =
  createSlice({
    name: "auth",

    initialState,

    reducers: {
      // ------------------------------------------------------
      // CLEAR ERROR
      // ------------------------------------------------------

      clearError: (state) => {
        state.error = null;
      },

      // ------------------------------------------------------
      // REMEMBER ME
      // ------------------------------------------------------

      setRememberMe: (
        state,
        action
      ) => {
        if (action.payload) {
          localStorage.setItem(
            "remember-me",
            "true"
          );
        } else {
          localStorage.removeItem(
            "remember-me"
          );

          localStorage.removeItem(
            "remembered-email"
          );
        }
      },

      // ------------------------------------------------------
      // CLEAR PROFILE ERROR
      // ------------------------------------------------------

      clearProfileUpdateError: (
        state
      ) => {
        state.profileUpdateError =
          null;
      },

      // ------------------------------------------------------
      // UPDATE USER STATE
      // ------------------------------------------------------

      updateUserState: (
        state,
        action
      ) => {
        const updatedUser =
          normalizeUser({
            ...state.user,
            ...action.payload,
          });

        state.user =
          updatedUser;

        const userType =
          getUserTypeFromStorage();

        persistUserData(
          updatedUser,
          userType
        );

        persistRoleSpecificUser(
          updatedUser,
          userType
        );
      },

      // ------------------------------------------------------
      // UPDATE USER
      // ------------------------------------------------------

      updateUser: (
        state,
        action
      ) => {
        const updatedUser =
          action.payload || {};

        const currentUser =
          state.user || {};

        const mergedUser =
          normalizeUser({
            ...currentUser,

            ...updatedUser,

            name:
              updatedUser.name ||
              updatedUser.employee
                ?.name ||
              currentUser.name ||
              "",

            email:
              updatedUser.email ||
              currentUser.email ||
              "",

            username:
              updatedUser.username ||
              currentUser.username ||
              "",
          });

        state.user =
          mergedUser;

        const userType =
          getUserTypeFromStorage();

        persistUserData(
          mergedUser,
          userType
        );

        persistRoleSpecificUser(
          mergedUser,
          userType
        );
      },

      // ------------------------------------------------------
      // CLEAR RESET STATE
      // ------------------------------------------------------

      clearResetState: (
        state
      ) => {
        state.resetSuccess =
          false;

        state.resetMessage =
          "";

        state.resetError =
          null;
      },
    },

    // ========================================================
    // EXTRA REDUCERS
    // ========================================================

    extraReducers: (
      builder
    ) => {
      builder

        // ====================================================
        // LOGIN
        // ====================================================

        .addCase(
          loginUser.pending,
          (state) => {
            state.loading = true;

            state.error = null;
          }
        )

        .addCase(
          loginUser.fulfilled,
          (
            state,
            action
          ) => {
            const user =
              action.payload.user;

            state.loading =
              false;

            state.isAuthenticated =
              true;

            state.token =
              action.payload
                .access_token;

            state.userType =
              user?.type || null;

            state.user =
              normalizeUser(user);

            state.error =
              null;
          }
        )

        .addCase(
          loginUser.rejected,
          (
            state,
            action
          ) => {
            state.loading =
              false;

            state.isAuthenticated =
              false;

            state.user = null;

            state.token = null;

            state.userType = null;

            state.error =
              action.payload ||
              "Login failed";
          }
        )

        // ====================================================
        // INITIALIZE AUTH
        // ====================================================

        .addCase(
          initializeAuth.pending,
          (state) => {
            state.loading =
              true;

            state.error =
              null;
          }
        )

        .addCase(
          initializeAuth.fulfilled,
          (
            state,
            action
          ) => {
            const {
              authenticated,
              user,
              token,
              userType,
            } =
              action.payload;

            state.loading =
              false;

            state.isAuthenticated =
              Boolean(
                authenticated
              );

            state.user =
              user || null;

            state.token =
              token || null;

            state.userType =
              userType || null;

            state.error =
              null;
          }
        )

        .addCase(
          initializeAuth.rejected,
          (
            state,
            action
          ) => {
            state.loading =
              false;

            state.isAuthenticated =
              false;

            state.user = null;

            state.token = null;

            state.userType = null;

            state.error =
              action.payload ||
              "Authentication failed";
          }
        )

        // ====================================================
        // LOGOUT
        // ====================================================

        .addCase(
          logoutUser.fulfilled,
          (state) => {
            state.user =
              null;

            state.token =
              null;

            state.userType =
              null;

            state.isAuthenticated =
              false;

            state.loading =
              false;

            state.error =
              null;

            state.profileUpdateLoading =
              false;

            state.profileUpdateError =
              null;

            state.resetSuccess =
              false;

            state.resetMessage =
              "";

            state.resetError =
              null;
          }
        )

        // ====================================================
        // UPDATE PROFILE
        // ====================================================

        .addCase(
          updateUserProfile.pending,
          (state) => {
            state.profileUpdateLoading =
              true;

            state.profileUpdateError =
              null;
          }
        )

        .addCase(
          updateUserProfile.fulfilled,
          (
            state,
            action
          ) => {
            state.profileUpdateLoading =
              false;

            state.user =
              action.payload;

            state.profileUpdateError =
              null;
          }
        )

        .addCase(
          updateUserProfile.rejected,
          (
            state,
            action
          ) => {
            state.profileUpdateLoading =
              false;

            state.profileUpdateError =
              action.payload ||
              "Failed to update profile";
          }
        )

        // ====================================================
        // FETCH CURRENT USER
        // ====================================================

        .addCase(
          fetchCurrentUser.pending,
          (state) => {
            state.loading =
              true;
          }
        )

        .addCase(
          fetchCurrentUser.fulfilled,
          (
            state,
            action
          ) => {
            const user =
              normalizeUser(
                action.payload
              );

            state.loading =
              false;

            state.user =
              user;

            state.isAuthenticated =
              true;

            /*
             * Safely retrieve token.
             */
            state.token =
              getStoredTokenSafely();

            state.userType =
              user?.type ||
              getUserTypeFromStorage();
          }
        )

        .addCase(
          fetchCurrentUser.rejected,
          (
            state,
            action
          ) => {
            state.loading =
              false;

            state.error =
              action.payload ||
              "Failed to fetch user";
          }
        )

        // ====================================================
        // REQUEST PASSWORD RESET
        // ====================================================

        .addCase(
          requestPasswordReset.pending,
          (state) => {
            state.loading =
              true;

            state.error =
              null;

            state.resetSuccess =
              false;

            state.resetMessage =
              "";

            state.resetError =
              null;
          }
        )

        .addCase(
          requestPasswordReset.fulfilled,
          (
            state,
            action
          ) => {
            state.loading =
              false;

            state.resetSuccess =
              true;

            state.resetMessage =
              action.payload.message;

            state.resetError =
              null;
          }
        )

        .addCase(
          requestPasswordReset.rejected,
          (
            state,
            action
          ) => {
            state.loading =
              false;

            state.resetSuccess =
              false;

            state.resetMessage =
              "";

            state.resetError =
              action.payload ||
              "Failed to send reset code";

            state.error =
              action.payload ||
              "Failed to send reset code";
          }
        )

        // ====================================================
        // RESET PASSWORD
        // ====================================================

        .addCase(
          resetPassword.pending,
          (state) => {
            state.loading =
              true;

            state.error =
              null;

            state.resetSuccess =
              false;

            state.resetMessage =
              "";

            state.resetError =
              null;
          }
        )

        .addCase(
          resetPassword.fulfilled,
          (
            state,
            action
          ) => {
            state.loading =
              false;

            state.resetSuccess =
              true;

            state.resetMessage =
              action.payload.message;

            state.resetError =
              null;
          }
        )

        .addCase(
          resetPassword.rejected,
          (
            state,
            action
          ) => {
            state.loading =
              false;

            state.resetSuccess =
              false;

            state.resetMessage =
              "";

            state.resetError =
              action.payload ||
              "Failed to reset password";

            state.error =
              action.payload ||
              "Failed to reset password";
          }
        );
    },
  });

// ============================================================
// ACTIONS
// ============================================================

export const {
  clearError,
  setRememberMe,
  clearProfileUpdateError,
  updateUserState,
  updateUser,
  clearResetState,
} = authSlice.actions;

// ============================================================
// REDUCER
// ============================================================

export default authSlice.reducer;