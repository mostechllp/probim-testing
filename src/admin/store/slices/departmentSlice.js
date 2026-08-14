import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

// Fetch all departments
export const fetchDepartments = createAsyncThunk(
  "departments/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/departments");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch departments",
      );
    }
  },
);

// Add department
export const addDepartment = createAsyncThunk(
  "departments/add",
  async (departmentData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/admin/departments", departmentData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to add department",
      );
    }
  },
);

// Update department
export const updateDepartment = createAsyncThunk(
  "departments/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/admin/departments/${id}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update department",
      );
    }
  },
);

// Delete department
export const deleteDepartment = createAsyncThunk(
  "departments/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/admin/departments/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Delete failed");
    }
  },
);

const departmentSlice = createSlice({
  name: "departments",
  initialState: {
    departments: [],
    loading: false,
    error: null,
    totalCount: 0,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Departments
      .addCase(fetchDepartments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.loading = false;
        const apiData = action.payload || [];
        state.departments = apiData.map((dept) => ({
          id: dept.id,
          name: dept.name,
          createdAt: dept.created_at
            ? new Date(dept.created_at).toLocaleDateString()
            : "-",
          updatedAt: dept.updated_at
            ? new Date(dept.updated_at).toLocaleDateString()
            : "-",
          raw: dept,
        }));
        state.totalCount = apiData.length || 0;
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      // Add Department
      .addCase(addDepartment.pending, (state) => {
        state.error = null;
      })
      .addCase(addDepartment.fulfilled, (state, action) => {
        const newDepartment = {
          id: action.payload.id,
          name: action.payload.name,
          createdAt: action.payload.created_at
            ? new Date(action.payload.created_at).toLocaleDateString()
            : new Date().toLocaleDateString(),
          updatedAt: action.payload.updated_at
            ? new Date(action.payload.updated_at).toLocaleDateString()
            : new Date().toLocaleDateString(),
          raw: action.payload,
        };
        state.departments.unshift(newDepartment);
        state.totalCount += 1;
      })
      .addCase(addDepartment.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      // Update Department
      .addCase(updateDepartment.pending, (state) => {
        state.error = null;
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        const index = state.departments.findIndex(
          (dept) => dept.id === action.payload.id,
        );
        if (index !== -1) {
          state.departments[index] = {
            ...state.departments[index],
            name: action.payload.name,
            updatedAt: action.payload.updated_at
              ? new Date(action.payload.updated_at).toLocaleDateString()
              : new Date().toLocaleDateString(),
            raw: action.payload,
          };
        }
      })
      .addCase(updateDepartment.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      // Delete Department
      .addCase(deleteDepartment.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.departments = state.departments.filter(
          (dept) => dept.id !== action.payload,
        );
        state.totalCount -= 1;
      })
      .addCase(deleteDepartment.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearError } = departmentSlice.actions;
export default departmentSlice.reducer;
