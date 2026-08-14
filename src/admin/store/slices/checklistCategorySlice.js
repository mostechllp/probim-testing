import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

// Fetch all checklist categories - GET /api/admin/checklist-categories
export const fetchChecklistCategories = createAsyncThunk(
  "checklistCategory/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/checklist-categories");
      
      // Handle both response formats
      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      if (response.data && response.data.success === true) {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to fetch checklist categories");
    } catch (error) {
      console.error("Fetch checklist categories error:", error.response?.data);
      return rejectWithValue(error.response?.data?.message || "Failed to fetch checklist categories");
    }
  }
);

// Create checklist category - POST /api/admin/checklist-categories
export const createChecklistCategory = createAsyncThunk(
  "checklistCategory/create",
  async (categoryData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/admin/checklist-categories", categoryData);
      
      // Handle both response formats
      if (response.data && (response.data.status === "success" || response.data.success === true)) {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to create checklist category");
    } catch (error) {
      console.error("Create checklist category error:", error.response?.data);
      return rejectWithValue(error.response?.data?.message || "Failed to create checklist category");
    }
  }
);

// Fetch checklist category by ID - GET /api/admin/checklist-categories/{id}
export const fetchChecklistCategoryById = createAsyncThunk(
  "checklistCategory/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/admin/checklist-categories/${id}`);
      
      if (response.data && (response.data.status === "success" || response.data.success === true)) {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to fetch checklist category");
    } catch (error) {
      console.error("Fetch checklist category error:", error.response?.data);
      return rejectWithValue(error.response?.data?.message || "Failed to fetch checklist category");
    }
  }
);

// Update checklist category - PUT /api/admin/checklist-categories/{id}
export const updateChecklistCategory = createAsyncThunk(
  "checklistCategory/update",
  async ({ id, categoryData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/admin/checklist-categories/${id}`, categoryData);
      
      // Handle both response formats - check for status === "success" OR success === true
      if (response.data && (response.data.status === "success" || response.data.success === true)) {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to update checklist category");
    } catch (error) {
      console.error("Update checklist category error:", error.response?.data);
      return rejectWithValue(error.response?.data?.message || "Failed to update checklist category");
    }
  }
);

// Delete checklist category - DELETE /api/admin/checklist-categories/{id}
export const deleteChecklistCategory = createAsyncThunk(
  "checklistCategory/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/admin/checklist-categories/${id}`);
      
      if (response.data && (response.data.status === "success" || response.data.success === true)) {
        return { id, message: response.data.message };
      }
      return rejectWithValue(response.data?.message || "Failed to delete checklist category");
    } catch (error) {
      console.error("Delete checklist category error:", error.response?.data);
      return rejectWithValue(error.response?.data?.message || "Failed to delete checklist category");
    }
  }
);

// Toggle checklist category status - PATCH /api/admin/checklist-categories/{id}/toggle
export const toggleChecklistCategoryStatus = createAsyncThunk(
  "checklistCategory/toggle",
  async ({ id, is_active }, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/admin/checklist-categories/${id}/toggle`, { is_active });
      
      if (response.data && (response.data.status === "success" || response.data.success === true)) {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to toggle checklist category");
    } catch (error) {
      console.error("Toggle checklist category error:", error.response?.data);
      return rejectWithValue(error.response?.data?.message || "Failed to toggle checklist category");
    }
  }
);

const initialState = {
  categories: [],
  currentCategory: null,
  loading: false,
  error: null,
  totalCount: 0,
};

const checklistCategorySlice = createSlice({
  name: "checklistCategory",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentCategory: (state) => {
      state.currentCategory = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Categories
      .addCase(fetchChecklistCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChecklistCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload || [];
        state.totalCount = state.categories.length;
      })
      .addCase(fetchChecklistCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create Category
      .addCase(createChecklistCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createChecklistCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories.push(action.payload);
        state.totalCount += 1;
      })
      .addCase(createChecklistCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Category By ID
      .addCase(fetchChecklistCategoryById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChecklistCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCategory = action.payload;
      })
      .addCase(fetchChecklistCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Category
      .addCase(updateChecklistCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateChecklistCategory.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.categories.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
        if (state.currentCategory?.id === action.payload.id) {
          state.currentCategory = action.payload;
        }
      })
      .addCase(updateChecklistCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete Category
      .addCase(deleteChecklistCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteChecklistCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = state.categories.filter(c => c.id !== action.payload.id);
        state.totalCount -= 1;
      })
      .addCase(deleteChecklistCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Toggle Category Status
      .addCase(toggleChecklistCategoryStatus.fulfilled, (state, action) => {
        const index = state.categories.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
      });
  },
});

export const { clearError, clearCurrentCategory } = checklistCategorySlice.actions;
export default checklistCategorySlice.reducer;