import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../utils/apiClient";

// ============================================================
// AUTH CONSTANTS
// ============================================================

const USER_TYPES = [
  "admin",
  "hr",
  "employee",
  "manager",
  "team_lead",
];

const TOKEN_KEYS = USER_TYPES.map((type) => `${type}-token`).concat(
  "auth-token"
);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const isValidToken = (token) => {
  return (
    token &&
    token !== "null" &&
    token !== "undefined" &&
    token.trim?.() !== ""
  );
};

const getTokenKey = (userType) => {
  if (!userType) return null;
  return `${userType}-token`;
};

// Get the token ONLY for the active user type
const getActiveToken = () => {
  const activeType = localStorage.getItem("active-user-type");

  if (!activeType || !USER_TYPES.includes(activeType)) {
    return null;
  }

  const tokenKey = getTokenKey(activeType);
  const token = localStorage.getItem(tokenKey);

  return isValidToken(token) ? token : null;
};

// Clear every authentication-related localStorage value
const clearAuthStorage = () => {
  TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });

  const userStorageKeys = [
    "user-type",
    "user-data",
    "active-user-type",
    "user",
    "token",
    "userType",

    // Old/role-specific storage
    "admin-user",
    "hr-user",
    "employee-user",
    "manager-user",
    "team_lead-user",

    // Remember me
    "remember-me",
    "remembered-email",
  ];

  userStorageKeys.forEach((key) => {
    localStorage.removeItem(key);
  });

  // Remove Axios authorization header
  delete apiClient.defaults.headers.common.Authorization;
};

// Store user information consistently
const persistUserData = (userData, userType) => {
  if (!userData) return;

  localStorage.setItem("user-data", JSON.stringify(userData));

  if (userType) {
    localStorage.setItem("user-type", userType);
    localStorage.setItem("active-user-type", userType);
  }
};

// Get user data safely from localStorage
const getUserFromStorage = () => {
  try {
    const userData = localStorage.getItem("user-data");

    if (!userData) {
      return null;
    }

    const user = JSON.parse(userData);

    if (!user || typeof user !== "object") {
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
  } catch (error) {
    console.error("Failed to parse stored user data:", error);

    localStorage.removeItem("user-data");

    return null;
  }
};

// Get active user type
const getUserTypeFromStorage = () => {
  const activeType = localStorage.getItem("active-user-type");

  if (activeType && USER_TYPES.includes(activeType)) {
    return activeType;
  }

  const userType = localStorage.getItem("user-type");

  if (userType && USER_TYPES.includes(userType)) {
    return userType;
  }

  return null;
};

// Get token ONLY from active user type
const getTokenFromStorage = () => {
  const activeType = getUserTypeFromStorage();

  if (!activeType) {
    return null;
  }

  const tokenKey = getTokenKey(activeType);
  const token = localStorage.getItem(tokenKey);

  return isValidToken(token) ? token : null;
};

// Store role-specific user data if your application needs it
const persistRoleSpecificUser = (userData, userType) => {
  if (!userData || !userType) return;

  const roleStorageMap = {
    admin: "admin-user",
    hr: "hr-user",
    employee: "employee-user",
    manager: "manager-user",
    team_lead: "team_lead-user",
  };

  const storageKey = roleStorageMap[userType];

  if (storageKey) {
    localStorage.setItem(
      storageKey,
      JSON.stringify(userData)
    );
  }
};

// ============================================================
// INITIAL STATE HELPERS
// ============================================================

const storedUser = getUserFromStorage();
const storedToken = getTokenFromStorage();
const storedUserType = getUserTypeFromStorage();

const initialState = {
  user: storedUser,
  token: storedToken,
  userType: storedUserType,

  isAuthenticated: !!storedToken,

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

export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/auth/login", {
        username: email,
        password,
      });

      const data = response.data?.data;

      if (!data) {
        return rejectWithValue(
          "Invalid login response from server"
        );
      }

      const { access_token, user } = data;

      if (!isValidToken(access_token)) {
        return rejectWithValue(
          "Login response does not contain a valid access token"
        );
      }

      if (!user || !user.type) {
        return rejectWithValue(
          "Login response does not contain valid user information"
        );
      }

      const userType = user.type;

      if (!USER_TYPES.includes(userType)) {
        return rejectWithValue(
          `Unsupported user type: ${userType}`
        );
      }

      // --------------------------------------------------------
      // Remove previous session completely
      // --------------------------------------------------------

      clearAuthStorage();

      // --------------------------------------------------------
      // Store ONLY current user's token
      // --------------------------------------------------------

      const tokenKey = getTokenKey(userType);

      localStorage.setItem(tokenKey, access_token);

      localStorage.setItem(
        "active-user-type",
        userType
      );

      localStorage.setItem(
        "user-type",
        userType
      );

      const normalizedUser = {
        ...user,
        name:
          user.employee?.name ||
          user.username ||
          user.name ||
          "",
      };

      persistUserData(
        normalizedUser,
        userType
      );

      persistRoleSpecificUser(
        normalizedUser,
        userType
      );

      // --------------------------------------------------------
      // Set Axios authorization header immediately
      // --------------------------------------------------------

      apiClient.defaults.headers.common.Authorization =
        `Bearer ${access_token}`;

      // --------------------------------------------------------
      // Remember Me
      // --------------------------------------------------------

      if (typeof window !== "undefined") {
        const rememberMe =
          localStorage.getItem("remember-me") === "true";

        if (rememberMe) {
          localStorage.setItem(
            "remembered-email",
            email
          );
        }
      }

      return {
        ...data,
        user: normalizedUser,
      };
    } catch (error) {
      console.error(
        "Login error:",
        error.response?.data || error.message
      );

      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data?.error ||
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
    try {
      // If your backend has a logout API, you can call it here.
      // Do NOT call it if your backend does not provide one.

      return null;
    } finally {
      // Always clear local authentication
      clearAuthStorage();
    }
  }
);

// ============================================================
// INITIALIZE AUTH
// ============================================================

export const initializeAuth = createAsyncThunk(
  "auth/initialize",
  async (_, { rejectWithValue }) => {
    // --------------------------------------------------------
    // 1. Get active user type
    // --------------------------------------------------------

    const activeType =
      localStorage.getItem("active-user-type");

    if (
      !activeType ||
      !USER_TYPES.includes(activeType)
    ) {
      clearAuthStorage();

      return rejectWithValue(
        "No valid active user type"
      );
    }

    // --------------------------------------------------------
    // 2. Get ONLY the active user's token
    // --------------------------------------------------------

    const tokenKey = getTokenKey(activeType);

    const token = localStorage.getItem(tokenKey);

    if (!isValidToken(token)) {
      console.error(
        `No token found for active user type: ${activeType}`
      );

      clearAuthStorage();

      return rejectWithValue(
        "No token for active user type"
      );
    }

    try {
      // ------------------------------------------------------
      // 3. Set Axios token
      // ------------------------------------------------------

      apiClient.defaults.headers.common.Authorization =
        `Bearer ${token}`;

      // ------------------------------------------------------
      // 4. Validate token with backend
      // ------------------------------------------------------

      const response =
        await apiClient.get("/auth/me");

      const responseData = response.data?.data;

      if (!responseData) {
        throw new Error(
          "Invalid response from /auth/me"
        );
      }

      // Your existing backend appears to return:
      // {
      //   data: {
      //     user: {...}
      //   }
      // }
      //
      // But this also safely handles a direct user object.

      const authenticatedUser =
        responseData?.user || responseData;

      if (
        !authenticatedUser ||
        typeof authenticatedUser !== "object"
      ) {
        throw new Error(
          "Invalid user data from /auth/me"
        );
      }

      const backendUserType =
        authenticatedUser.type;

      // ------------------------------------------------------
      // 5. Validate backend user type
      // ------------------------------------------------------

      if (
        !backendUserType ||
        !USER_TYPES.includes(backendUserType)
      ) {
        throw new Error(
          "Invalid user type returned by backend"
        );
      }

      // ------------------------------------------------------
      // 6. Prevent token/user-type mismatch
      // ------------------------------------------------------

      if (backendUserType !== activeType) {
        console.error(
          `AUTH TYPE MISMATCH: localStorage=${activeType}, backend=${backendUserType}`
        );

        clearAuthStorage();

        throw new Error(
          "User type mismatch"
        );
      }

      // ------------------------------------------------------
      // 7. Normalize user
      // ------------------------------------------------------

      const normalizedUser = {
        ...authenticatedUser,
        name:
          authenticatedUser.employee?.name ||
          authenticatedUser.username ||
          authenticatedUser.name ||
          "",
      };

      // ------------------------------------------------------
      // 8. Keep storage consistent
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
      // 9. Remove every OTHER token
      // ------------------------------------------------------

      TOKEN_KEYS.forEach((key) => {
        if (key !== tokenKey) {
          localStorage.removeItem(key);
        }
      });

      // ------------------------------------------------------
      // 10. Make sure Axios uses validated token
      // ------------------------------------------------------

      apiClient.defaults.headers.common.Authorization =
        `Bearer ${token}`;

      return normalizedUser;
    } catch (error) {
      console.error(
        "Authentication initialization failed:",
        error.response?.data || error.message
      );

      clearAuthStorage();

      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Invalid authentication"
      );
    }
  }
);

// ============================================================
// REQUEST PASSWORD RESET
// ============================================================

export const requestPasswordReset = createAsyncThunk(
  "auth/requestPasswordReset",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response =
        await apiClient.post(
          "/auth/forgot-password",
          {
            email,
          }
        );

      console.log(
        "Request password reset response:",
        response.data
      );

      if (
        response.data?.status === "success" ||
        response.data?.success
      ) {
        return {
          message:
            response.data.message ||
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

export const resetPassword = createAsyncThunk(
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

      console.log(
        "Reset password response:",
        response.data
      );

      if (
        response.data?.status === "success" ||
        response.data?.success
      ) {
        return {
          message:
            response.data.message ||
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

      if (error.response?.data?.errors) {
        const errorMessages = Object.values(
          error.response.data.errors
        )
          .flat()
          .join(", ");

        return rejectWithValue(
          errorMessages
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
      { rejectWithValue, getState }
    ) => {
      try {
        const response =
          await apiClient.post(
            "/employee/update-profile",
            {
              name: profileData.fullName,
              email: profileData.email,
            }
          );

        if (
          response.data?.status !== "success"
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

        const newUserData = {
          ...currentUser,
          ...updatedUser,

          name:
            updatedUser.name ||
            updatedUser.employee?.name ||
            profileData.fullName ||
            currentUser?.name ||
            "",

          email:
            updatedUser.email ||
            profileData.email ||
            currentUser?.email ||
            "",
        };

        const userType =
          localStorage.getItem(
            "active-user-type"
          );

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
    async (_, { rejectWithValue }) => {
      try {
        const response =
          await apiClient.get(
            "/employee/profile"
          );

        if (
          response.data?.status !== "success"
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
          localStorage.getItem(
            "active-user-type"
          );

        const normalizedUser = {
          ...userData,
          name:
            userData.employee?.name ||
            userData.username ||
            userData.name ||
            "",
        };

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

const authSlice = createSlice({
  name: "auth",

  initialState,

  reducers: {
    // --------------------------------------------------------
    // Clear general error
    // --------------------------------------------------------

    clearError: (state) => {
      state.error = null;
    },

    // --------------------------------------------------------
    // Remember Me
    // --------------------------------------------------------

    setRememberMe: (state, action) => {
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

    // --------------------------------------------------------
    // Clear profile update error
    // --------------------------------------------------------

    clearProfileUpdateError: (state) => {
      state.profileUpdateError = null;
    },

    // --------------------------------------------------------
    // Update user state
    // --------------------------------------------------------

    updateUserState: (state, action) => {
      const updatedUser = {
        ...state.user,
        ...action.payload,
      };

      state.user = updatedUser;

      const userType =
        localStorage.getItem(
          "active-user-type"
        );

      persistUserData(
        updatedUser,
        userType
      );

      persistRoleSpecificUser(
        updatedUser,
        userType
      );
    },

    // --------------------------------------------------------
    // Update user
    // --------------------------------------------------------

    updateUser: (state, action) => {
      const updatedUser =
        action.payload || {};

      const currentUser =
        state.user || {};

      const mergedUser = {
        ...currentUser,
        ...updatedUser,

        name:
          updatedUser.name ||
          updatedUser.employee?.name ||
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
      };

      state.user = mergedUser;

      const userType =
        localStorage.getItem(
          "active-user-type"
        );

      persistUserData(
        mergedUser,
        userType
      );

      persistRoleSpecificUser(
        mergedUser,
        userType
      );
    },

    // --------------------------------------------------------
    // Clear reset state
    // --------------------------------------------------------

    clearResetState: (state) => {
      state.resetSuccess = false;
      state.resetMessage = "";
      state.resetError = null;
    },
  },

  // ==========================================================
  // EXTRA REDUCERS
  // ==========================================================

  extraReducers: (builder) => {
    builder

      // ======================================================
      // LOGIN
      // ======================================================

      .addCase(
        loginUser.pending,
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )

      .addCase(
        loginUser.fulfilled,
        (state, action) => {
          const user =
            action.payload.user;

          state.loading = false;
          state.isAuthenticated = true;

          state.token =
            action.payload.access_token;

          state.userType =
            user?.type || null;

          state.user = {
            ...user,

            name:
              user?.employee?.name ||
              user?.username ||
              user?.name ||
              "",
          };

          state.error = null;
        }
      )

      .addCase(
        loginUser.rejected,
        (state, action) => {
          state.loading = false;
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
          state.userType = null;
          state.error =
            action.payload ||
            "Login failed";
        }
      )

      // ======================================================
      // INITIALIZE AUTH
      // ======================================================

      .addCase(
        initializeAuth.pending,
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )

      .addCase(
        initializeAuth.fulfilled,
        (state, action) => {
          const resolvedUser =
            action.payload;

          const activeType =
            resolvedUser?.type ||
            localStorage.getItem(
              "active-user-type"
            );

          state.loading = false;
          state.isAuthenticated = true;

          state.token =
            getTokenFromStorage();

          state.userType =
            activeType || null;

          state.user = {
            ...resolvedUser,

            name:
              resolvedUser?.employee?.name ||
              resolvedUser?.username ||
              resolvedUser?.name ||
              "",
          };

          state.error = null;
        }
      )

      .addCase(
        initializeAuth.rejected,
        (state, action) => {
          state.loading = false;
          state.isAuthenticated = false;

          state.user = null;
          state.token = null;
          state.userType = null;

          state.error =
            action.payload ||
            "Authentication failed";
        }
      )

      // ======================================================
      // LOGOUT
      // ======================================================

      .addCase(
        logoutUser.fulfilled,
        (state) => {
          state.user = null;
          state.token = null;
          state.userType = null;

          state.isAuthenticated = false;
          state.loading = false;

          state.error = null;

          state.profileUpdateLoading =
            false;

          state.profileUpdateError =
            null;

          state.resetSuccess = false;
          state.resetMessage = "";
          state.resetError = null;
        }
      )

      // ======================================================
      // UPDATE PROFILE
      // ======================================================

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
        (state, action) => {
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
        (state, action) => {
          state.profileUpdateLoading =
            false;

          state.profileUpdateError =
            action.payload ||
            "Failed to update profile";
        }
      )

      // ======================================================
      // FETCH CURRENT USER
      // ======================================================

      .addCase(
        fetchCurrentUser.pending,
        (state) => {
          state.loading = true;
        }
      )

      .addCase(
        fetchCurrentUser.fulfilled,
        (state, action) => {
          const user =
            action.payload;

          state.loading = false;

          state.user = {
            ...user,

            name:
              user?.employee?.name ||
              user?.username ||
              user?.name ||
              "",
          };

          state.isAuthenticated = true;

          state.token =
            getTokenFromStorage();

          state.userType =
            user?.type ||
            localStorage.getItem(
              "active-user-type"
            );
        }
      )

      .addCase(
        fetchCurrentUser.rejected,
        (state, action) => {
          state.loading = false;

          state.error =
            action.payload ||
            "Failed to fetch user";

          // Do NOT automatically log the user out here.
          // A temporary profile API failure should not destroy
          // a valid authentication session.
        }
      )

      // ======================================================
      // REQUEST PASSWORD RESET
      // ======================================================

      .addCase(
        requestPasswordReset.pending,
        (state) => {
          state.loading = true;
          state.error = null;

          state.resetSuccess = false;
          state.resetMessage = "";
          state.resetError = null;
        }
      )

      .addCase(
        requestPasswordReset.fulfilled,
        (state, action) => {
          state.loading = false;

          state.resetSuccess = true;

          state.resetMessage =
            action.payload.message;

          state.resetError = null;
        }
      )

      .addCase(
        requestPasswordReset.rejected,
        (state, action) => {
          state.loading = false;

          state.resetSuccess = false;

          state.resetMessage = "";

          state.resetError =
            action.payload ||
            "Failed to send reset code";

          state.error =
            action.payload ||
            "Failed to send reset code";
        }
      )

      // ======================================================
      // RESET PASSWORD
      // ======================================================

      .addCase(
        resetPassword.pending,
        (state) => {
          state.loading = true;
          state.error = null;

          state.resetSuccess = false;
          state.resetMessage = "";
          state.resetError = null;
        }
      )

      .addCase(
        resetPassword.fulfilled,
        (state, action) => {
          state.loading = false;

          state.resetSuccess = true;

          state.resetMessage =
            action.payload.message;

          state.resetError = null;
        }
      )

      .addCase(
        resetPassword.rejected,
        (state, action) => {
          state.loading = false;

          state.resetSuccess = false;

          state.resetMessage = "";

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
// EXPORT ACTIONS
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
// EXPORT REDUCER
// ============================================================

export default authSlice.reducer;