import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../utils/apiClient"; 


export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/auth/login", {
        username: email,  
        password,
      });

      const data = response.data.data;
      const { access_token, user } = data;
      
      // 🔥 CLEANUP: Remove ALL existing tokens first
      const tokenKeys = ['admin-token', 'hr-token', 'employee-token', 'auth-token'];
      tokenKeys.forEach(key => localStorage.removeItem(key));
      
      // Remove any stale user data
      localStorage.removeItem("user-type");
      localStorage.removeItem("user-data");
      localStorage.removeItem("active-user-type");
      
      // Store ONLY the token for this user type
      const tokenKey = `${user.type}-token`;
      localStorage.setItem(tokenKey, access_token);
      localStorage.setItem("active-user-type", user.type);
      localStorage.setItem("user-type", user.type);
      localStorage.setItem("user-data", JSON.stringify(user));

      // Store remember me info if checked
      if (typeof window !== 'undefined') {
        const rememberMe = localStorage.getItem("remember-me") === "true";
        if (rememberMe) {
          localStorage.setItem("remembered-email", email);
        }
      }

      return data;
    } catch (error) {
      console.error("Login error:", error.response?.data);
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  }
);

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  // Clear ALL tokens and user data
  const tokenKeys = ['admin-token', 'hr-token', 'employee-token', 'auth-token'];
  tokenKeys.forEach(key => localStorage.removeItem(key));
  
  localStorage.removeItem("user-type");
  localStorage.removeItem("user-data");
  localStorage.removeItem("active-user-type");
  localStorage.removeItem("remember-me");
  localStorage.removeItem("remembered-email");
  localStorage.removeItem("hr-user");
  localStorage.removeItem("employee-user");
  
  // Remove any other auth-related items
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  
  return null;
});

export const initializeAuth = createAsyncThunk(
  "auth/initialize",
  async (_, { rejectWithValue }) => {
    const clearAuthStorage = () => {
      const tokenKeys = [
        "admin-token",
        "hr-token",
        "employee-token",
        "auth-token",
      ];

      tokenKeys.forEach((key) => localStorage.removeItem(key));

      localStorage.removeItem("user-type");
      localStorage.removeItem("user-data");
      localStorage.removeItem("active-user-type");
      localStorage.removeItem("hr-user");
      localStorage.removeItem("employee-user");
    };

    // ---------------------------------------------------------
    // 1. Active user type MUST exist
    // ---------------------------------------------------------
    const activeType = localStorage.getItem("active-user-type");

    if (!activeType) {
      return rejectWithValue("No active user type");
    }

    // Only allow known user types
    const allowedTypes = ["admin", "hr", "employee", "manager", "team_lead"];

    if (!allowedTypes.includes(activeType)) {
      clearAuthStorage();
      return rejectWithValue("Invalid user type");
    }

    // ---------------------------------------------------------
    // 2. Get ONLY the token belonging to active-user-type
    // ---------------------------------------------------------
    const tokenKey = `${activeType}-token`;
    const token = localStorage.getItem(tokenKey);

    if (!token || token === "null" || token === "undefined") {
      console.error(
        `No token found for active user type: ${activeType}`
      );

      clearAuthStorage();
      return rejectWithValue("No token for active user type");
    }

    try {
      // ---------------------------------------------------------
      // 3. Make sure apiClient uses THIS token
      // ---------------------------------------------------------
      apiClient.defaults.headers.common.Authorization =
        `Bearer ${token}`;

      // ---------------------------------------------------------
      // 4. Validate token with backend
      // ---------------------------------------------------------
      const response = await apiClient.get("/auth/me");

      const userData = response.data.data;
      const authenticatedUser = userData?.user;

      if (!authenticatedUser) {
        throw new Error("Invalid user data from /auth/me");
      }

      const backendUserType = authenticatedUser.type;

      // ---------------------------------------------------------
      // 5. VERY IMPORTANT:
      //    Backend user type MUST match active-user-type
      // ---------------------------------------------------------
      if (backendUserType !== activeType) {
        console.error(
          `AUTH TYPE MISMATCH: localStorage=${activeType}, backend=${backendUserType}`
        );

        throw new Error("User type mismatch");
      }

      // ---------------------------------------------------------
      // 6. Store ONLY consistent authentication information
      // ---------------------------------------------------------
      localStorage.setItem(
        "active-user-type",
        backendUserType
      );

      localStorage.setItem(
        "user-type",
        backendUserType
      );

      localStorage.setItem(
        "user-data",
        JSON.stringify(userData)
      );

      // ---------------------------------------------------------
      // 7. Remove every other token
      // ---------------------------------------------------------
      const tokenKeys = [
        "admin-token",
        "hr-token",
        "employee-token",
        "manager-token",
        "team_lead-token",
        "auth-token",
      ];

      tokenKeys.forEach((key) => {
        if (key !== tokenKey) {
          localStorage.removeItem(key);
        }
      });

      return userData;
    } catch (error) {
      console.error(
        "Authentication initialization failed:",
        error.response?.data || error.message
      );

      clearAuthStorage();

      return rejectWithValue(
        error.message || "Invalid authentication"
      );
    }
  }
);

// Update getUserFromStorage to check all token types
const getUserFromStorage = () => {
  const userData = localStorage.getItem("user-data");
  if (userData) {
    const user = JSON.parse(userData);
    return {
      ...user,
      name: user.employee?.name || user.username || user.name,
    };
  }
  return null;
};

// Update initialState to check all token types
const getTokenFromStorage = () => {
  const tokenKeys = ['admin-token', 'hr-token', 'employee-token', 'auth-token'];
  for (const key of tokenKeys) {
    const token = localStorage.getItem(key);
    if (token && token !== 'null' && token !== 'undefined') {
      return token;
    }
  }
  return null;
};

const getUserTypeFromStorage = () => {
  const type = localStorage.getItem("user-type");
  if (type) return type;
  
  // Try to infer from token type
  const tokenKeys = ['admin-token', 'hr-token', 'employee-token'];
  for (const key of tokenKeys) {
    if (localStorage.getItem(key)) {
      return key.replace('-token', '');
    }
  }
  return null;
};

const initialState = {
  user: getUserFromStorage(),
  token: getTokenFromStorage(),
  userType: getUserTypeFromStorage(),
  isAuthenticated: !!getTokenFromStorage(),
  loading: true,
  error: null,
  profileUpdateLoading: false,
  profileUpdateError: null,
};

// ─── Request Password Reset (Step 1) ──────────────────────────────────────
export const requestPasswordReset = createAsyncThunk(
  "auth/requestPasswordReset",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/auth/forgot-password", { 
        email: email 
      });
      
      console.log("Request password reset response:", response.data);
      
      if (response.data.status === "success" || response.data.success) {
        return {
          message: response.data.message || "Password reset code sent to your email"
        };
      }
      
      return rejectWithValue(response.data.message || "Failed to send reset code");
    } catch (error) {
      console.error("Request password reset error:", error.response?.data);
      return rejectWithValue(
        error.response?.data?.message || "Failed to send reset code. Please try again."
      );
    }
  }
);

// ─── Reset Password with Code (Step 2) ──────────────────────────────────────
export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ code, password }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/auth/reset-password", { 
        code: code,
        password: password
      });
      
      console.log("Reset password response:", response.data);
      
      if (response.data.status === "success" || response.data.success) {
        return {
          message: response.data.message || "Password reset successfully"
        };
      }
      
      return rejectWithValue(response.data.message || "Failed to reset password");
    } catch (error) {
      console.error("Reset password error:", error.response?.data);
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors)
          .flat()
          .join(", ");
        return rejectWithValue(errorMessages);
      }
      
      return rejectWithValue(
        error.response?.data?.message || "Failed to reset password. Please try again."
      );
    }
  }
);



// Update user profile
export const updateUserProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData, { rejectWithValue, getState }) => {
    try {
      const response = await apiClient.post("/employee/update-profile", {
        name: profileData.fullName,
        email: profileData.email,
      });

      if (response.data.status === "success") {
        const updatedUser = response.data.data || response.data.user;
        
        // Get current user from state
        const currentUser = getState().auth.user;
        
        // Merge the updated data
        const newUserData = {
          ...currentUser,
          ...updatedUser,
          name: updatedUser.name || updatedUser.employee?.name || profileData.fullName,
          email: updatedUser.email || profileData.email,
        };
        
        // Update localStorage with complete user data
        localStorage.setItem("user-data", JSON.stringify(newUserData));
        
        // Update role-specific storage
        const userType = localStorage.getItem("user-type");
        if (userType === "admin") {
          localStorage.setItem("hr-user", JSON.stringify(newUserData));
        } else if (userType === "employee") {
          localStorage.setItem("employee-user", JSON.stringify(newUserData));
        }
        
        return newUserData;
      } else {
        return rejectWithValue(response.data.message || "Profile update failed");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to update profile"
      );
    }
  }
);

// Fetch current user data (to sync after refresh)
export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/employee/profile");
      
      if (response.data.status === "success") {
        const userData = response.data.data || response.data.user;
        
        // Update localStorage
        localStorage.setItem("user-data", JSON.stringify(userData));
        
        // Update role-specific storage
        const userType = localStorage.getItem("user-type");
        if (userType === "admin") {
          localStorage.setItem("hr-user", JSON.stringify(userData));
        } else if (userType === "employee") {
          localStorage.setItem("employee-user", JSON.stringify(userData));
        }
        
        return userData;
      }
      return rejectWithValue("Failed to fetch user data");
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch user");
    }
  }
);


const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setRememberMe: (state, action) => {
      if (action.payload) {
        localStorage.setItem("remember-me", "true");
      } else {
        localStorage.removeItem("remember-me");
        localStorage.removeItem("remembered-email");
      }
    },
    clearProfileUpdateError: (state) => {
      state.profileUpdateError = null;
    },
    updateUserState: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem("user-data", JSON.stringify(state.user));
      
      // Update role-specific storage
      const userType = localStorage.getItem("user-type");
      if (userType === "admin") {
        localStorage.setItem("hr-user", JSON.stringify(state.user));
      } else if (userType === "employee") {
        localStorage.setItem("employee-user", JSON.stringify(state.user));
      }
    },
     updateUser: (state, action) => {
      const updatedUser = action.payload;
      state.user = {
        ...state.user,
        ...updatedUser,
        name: updatedUser.name || updatedUser.employee?.name || state.user?.name,
        email: updatedUser.email || state.user?.email,
        username: updatedUser.username || state.user?.username,
      };
      // Update localStorage
      localStorage.setItem("user-data", JSON.stringify(state.user));
      
      // Update role-specific storage
      const userType = localStorage.getItem("user-type");
      if (userType === "admin") {
        localStorage.setItem("hr-user", JSON.stringify(state.user));
      } else if (userType === "employee") {
        localStorage.setItem("employee-user", JSON.stringify(state.user));
      }
    },
    clearResetState: (state) => {
      state.resetSuccess = false;
      state.resetError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.access_token;
        state.userType = action.payload.user.type;
        state.user = {
          ...action.payload.user,
          name: action.payload.user.employee?.name || action.payload.user.username,
        };
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.userType = action.payload.user?.type;
        state.user = {
          ...action.payload.user,
          name: action.payload.user?.employee?.name || action.payload.user?.username,
        };
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.userType = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.userType = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
        state.profileUpdateLoading = false;
        state.profileUpdateError = null;
      })
      // Update Profile
      .addCase(updateUserProfile.pending, (state) => {
        state.profileUpdateLoading = true;
        state.profileUpdateError = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.profileUpdateLoading = false;
        state.user = action.payload;
        // Update localStorage to ensure consistency
        localStorage.setItem("user-data", JSON.stringify(action.payload));
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.profileUpdateLoading = false;
        state.profileUpdateError = action.payload;
      })
      // Fetch current user
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false;
      })
     .addCase(requestPasswordReset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state, action) => {
        state.loading = false;
        state.resetSuccess = true;
        state.resetMessage = action.payload.message;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.resetSuccess = false;
      })
      
    // ─── Reset Password with Code ────────────────────────────────────────────
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.resetSuccess = true;
        state.resetMessage = action.payload.message;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.resetSuccess = false;
      });
  },
});

export const { 
  clearError, 
  setRememberMe, 
  clearProfileUpdateError, 
  updateUserState ,
  updateUser,
  clearResetState 
} = authSlice.actions;

export default authSlice.reducer;