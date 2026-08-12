import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

// Fetch all checklists for offboarding - GET /admin/checklists/{offboardingId}
export const fetchChecklists = createAsyncThunk(
  "checklist/fetchAll",
  async (offboardingId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/admin/checklists/${offboardingId}`);
      console.log("All checklists fetched:", response.data);
      
      // Check if response has data array
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      // Check if response has success and data
      if (response.data && response.data.success === true && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to fetch checklists");
    } catch (error) {
      console.error("Fetch checklists error:", error.response?.data);
      return rejectWithValue(error.response?.data?.message || "Failed to fetch checklists");
    }
  }
);

// Fetch visa status and checklists for offboarding - GET /api/offboarding/{id}/visa-status
export const fetchVisaStatus = createAsyncThunk(
  "checklist/fetchVisaStatus",
  async (offboardingId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/admin/offboarding/${offboardingId}/visa-status`);
      console.log("Visa status fetched:", response.data);
      
      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to fetch visa status");
    } catch (error) {
      console.error("Fetch visa status error:", error.response?.data);
      return rejectWithValue(error.response?.data?.message || "Failed to fetch visa status");
    }
  }
);

// Create a new checklist item - POST /admin/checklists/{offboardingId}
export const createChecklist = createAsyncThunk(
  "checklist/create",
  async ({ offboardingId, checklistData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        `/admin/checklists/${offboardingId}`,
        checklistData,
      );
      console.log("Checklist created:", response.data);

      if (response.data && (response.data.success === true || response.data.id)) {
        return response.data.data || response.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to create checklist",
      );
    } catch (error) {
      console.error("Create checklist error:", error.response?.data);
      return rejectWithValue(
        error.response?.data?.message || "Failed to create checklist",
      );
    }
  },
);

// Update checklist item - PUT /admin/checklists/{checklistId}
export const updateChecklist = createAsyncThunk(
  "checklist/update",
  async ({ checklistId, checklistData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(
        `/admin/checklists/${checklistId}`,
        checklistData,
      );
      console.log("Checklist updated:", response.data);

      if (response.data && (response.data.success === true || response.data.id)) {
        return response.data.data || response.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to update checklist",
      );
    } catch (error) {
      console.error("Update checklist error:", error.response?.data);
      return rejectWithValue(
        error.response?.data?.message || "Failed to update checklist",
      );
    }
  },
);

// Delete checklist item - DELETE /admin/checklists/{checklistId}
export const deleteChecklist = createAsyncThunk(
  "checklist/delete",
  async (checklistId, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(
        `/admin/checklists/${checklistId}`,
      );
      console.log("Checklist deleted:", response.data);

      if (response.data && (response.data.success === true || response.data.message)) {
        return { id: checklistId };
      }
      return rejectWithValue(
        response.data?.message || "Failed to delete checklist",
      );
    } catch (error) {
      console.error("Delete checklist error:", error.response?.data);
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete checklist",
      );
    }
  },
);

// Update checklist status - PATCH /admin/checklists/{checklistId}/status
export const updateChecklistStatus = createAsyncThunk(
  "checklist/updateStatus",
  async ({ checklistId, status }, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(
        `/admin/checklists/item/${checklistId}/status`,
        { status },
      );
      console.log("Checklist status updated:", response.data);

      if (response.data && (response.data.success === true || response.data.id)) {
        return response.data.data || response.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to update checklist status",
      );
    } catch (error) {
      console.error("Update checklist status error:", error.response?.data);
      return rejectWithValue(
        error.response?.data?.message || "Failed to update checklist status",
      );
    }
  },
);

const initialState = {
  checklists: [],
  visaStatus: null,
  loading: false,
  error: null,
  totalCount: 0,
};

const checklistSlice = createSlice({
  name: "checklist",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Checklists
      .addCase(fetchChecklists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChecklists.fulfilled, (state, action) => {
        state.loading = false;
        state.checklists = action.payload || [];
        state.totalCount = state.checklists.length;
      })
      .addCase(fetchChecklists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Visa Status
      .addCase(fetchVisaStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVisaStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.visaStatus = action.payload;
        state.checklists = action.payload?.tasks || [];
        state.totalCount = state.checklists.length;
      })
      .addCase(fetchVisaStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create Checklist
      .addCase(createChecklist.fulfilled, (state, action) => {
        state.checklists.push(action.payload);
        state.totalCount += 1;
      })

      // Update Checklist
      .addCase(updateChecklist.fulfilled, (state, action) => {
        const index = state.checklists.findIndex(
          (c) => c.id === action.payload.id,
        );
        if (index !== -1) {
          state.checklists[index] = action.payload;
        }
      })

      // Delete Checklist
      .addCase(deleteChecklist.fulfilled, (state, action) => {
        state.checklists = state.checklists.filter(
          (c) => c.id !== action.payload.id,
        );
        state.totalCount -= 1;
      })

      // Update Checklist Status
      .addCase(updateChecklistStatus.fulfilled, (state, action) => {
        const index = state.checklists.findIndex(
          (c) => c.id === action.payload.id,
        );
        if (index !== -1) {
          state.checklists[index] = action.payload;
        }
      });
  },
});

export const { clearError } = checklistSlice.actions;
export default checklistSlice.reducer;