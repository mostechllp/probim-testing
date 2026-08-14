// store/slices/authSlice.js - COMPLETELY FIXED VERSION

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/auth/login", {
        username: email,
        password,
      });

      const data = response.data.data;
      const user = data.user;

      // Create a consistent user object structure
      const userData = {
        id: user.id,
        name: user.employee?.first_name && user.employee?.last_name 
          ? `${user.employee.first_name} ${user.employee.last_name}`
          : user.employee?.name || user.username,
        first_name: user.employee?.first_name || "",
        last_name: user.employee?.last_name || "",
        username: user.username,
        email: user.email,
        status: user.status,
        avatar: user.avatar,
        role: user.role,
        permissions: user.permissions,
        employee: user.employee,
        type: user.type,
      };

      localStorage.setItem("hr-token", data.access_token);
      localStorage.setItem("hr-user", JSON.stringify(userData));

      return {
        ...data,
        user: userData,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  },
);

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  localStorage.removeItem("hr-token");
  localStorage.removeItem("hr-user");
  return null;
});

// Update user profile
export const updateUserProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData, { rejectWithValue, getState }) => {
    try {
      
      // Split full name into first and last name
      const nameParts = profileData.fullName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      const requestData = {
        first_name: firstName,
        last_name: lastName,
        email: profileData.email,
      };
      
      
      const response = await apiClient.post("/employee/update-profile", requestData);


      if (response.data.status === "success") {
        // Get current user from state
        const currentUser = getState().auth.user;
        
        // Create updated user data
        const newUserData = {
          ...currentUser,
          name: profileData.fullName,
          first_name: firstName,
          last_name: lastName,
          email: profileData.email,
          employee: {
            ...currentUser?.employee,
            first_name: firstName,
            last_name: lastName,
            name: profileData.fullName,
          }
        };
        
        
        // Update localStorage
        localStorage.setItem("hr-user", JSON.stringify(newUserData));
        
        
        return newUserData;
      } else {
        return rejectWithValue(response.data.message || "Profile update failed");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to update profile"
      );
    }
  }
);

// Fetch current user data
export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/auth/me");
      
      if (response.data.status === "success") {
        const user = response.data.data || response.data.user;
        
        const userData = {
          id: user.id,
          name: user.employee?.first_name && user.employee?.last_name 
            ? `${user.employee.first_name} ${user.employee.last_name}`
            : user.employee?.name || user.username,
          first_name: user.employee?.first_name || "",
          last_name: user.employee?.last_name || "",
          username: user.username,
          email: user.email,
          status: user.status,
          avatar: user.avatar,
          role: user.role,
          permissions: user.permissions,
          employee: user.employee,
          type: user.type,
        };
        
        localStorage.setItem("hr-user", JSON.stringify(userData));
        
        return userData;
      }
      return rejectWithValue("Failed to fetch user data");
    } catch (error) {
      const storedUser = localStorage.getItem("hr-user");
      if (storedUser) {
        return JSON.parse(storedUser);
      }
      return rejectWithValue(error.response?.data?.message || "Failed to fetch user");
    }
  }
);

const initialState = {
  user: JSON.parse(localStorage.getItem("hr-user")) || null,
  token: localStorage.getItem("hr-token") || null,
  isAuthenticated: !!localStorage.getItem("hr-token"),
  loading: false,
  error: null,
  profileUpdateLoading: false,
  profileUpdateError: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearProfileUpdateError: (state) => {
      state.profileUpdateError = null;
    },
    updateUserState: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem("hr-user", JSON.stringify(state.user));
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
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      // Update Profile
      .addCase(updateUserProfile.pending, (state) => {
        state.profileUpdateLoading = true;
        state.profileUpdateError = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.profileUpdateLoading = false;
        state.user = action.payload;
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
      });
  },
});

export const { clearError, clearProfileUpdateError, updateUserState } = authSlice.actions;
export default authSlice.reducer;