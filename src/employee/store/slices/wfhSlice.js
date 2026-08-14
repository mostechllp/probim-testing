import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

// Fetch WFH requests
export const fetchWFHRequests = createAsyncThunk(
  "wfh/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/employee/wfh-requests");
      
      if (response.data?.status === "success") {
        return response.data.data || [];
      }
      return rejectWithValue(response.data?.message || "Failed to fetch WFH requests");
    } catch (error) {
      console.error("Fetch WFH error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch WFH requests"
      );
    }
  }
);

// Store WFH request
export const addWFHRequest = createAsyncThunk(
  "wfh/add",
  async (formData, { rejectWithValue }) => {
    try {
      const payload = {
        date: formData.date,
        reason: formData.reason,
      };
      
      // Only add notes if it has a value
      if (formData.notes && formData.notes.trim()) {
        payload.notes = formData.notes.trim();
      }
      
      const response = await apiClient.post("/employee/wfh-requests", payload);
      
      if (response.data?.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to submit WFH request");
    } catch (error) {
      console.error("Add WFH error:", error);
      console.error("Error response:", error.response?.data);
      
      // Extract validation errors
      if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors).flat();
        return rejectWithValue(errorMessages.join(", "));
      }
      
      return rejectWithValue(
        error.response?.data?.message || "Failed to submit WFH request"
      );
    }
  }
);

// Update WFH status (for admin)
export const updateWFHStatus = createAsyncThunk(
  "wfh/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/admin/wfh-requests/${id}/status`, { status });
      
      if (response.data?.status === "success") {
        return { id, status };
      }
      return rejectWithValue(response.data?.message || "Failed to update status");
    } catch (error) {
      console.error("Update WFH status error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to update status"
      );
    }
  }
);

const initialState = {
  wfhRequests: [],
  filter: {
    status: 'all',
    search: '',
  },
  pagination: {
    currentPage: 1,
    perPage: 10,
  },
  loading: false,
  error: null,
  submitting: false,
};

const wfhSlice = createSlice({
  name: 'wfh',
  initialState,
  reducers: {
    setWFHFilter: (state, action) => {
      state.filter.status = action.payload.status;
      state.filter.search = action.payload.search || '';
      state.pagination.currentPage = 1;
    },
    setWFHPagination: (state, action) => {
      state.pagination.currentPage = action.payload.currentPage;
      state.pagination.perPage = action.payload.perPage;
    },
    clearWFHError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch WFH Requests
      .addCase(fetchWFHRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWFHRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.wfhRequests = action.payload;
        state.requests = action.payload;
      })
      .addCase(fetchWFHRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Add WFH Request
      .addCase(addWFHRequest.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(addWFHRequest.fulfilled, (state, action) => {
        state.submitting = false;
        state.wfhRequests.unshift(action.payload);
        state.requests.unshift(action.payload);
      })
      .addCase(addWFHRequest.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      
      // Update WFH Status
      .addCase(updateWFHStatus.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        const index = state.wfhRequests.findIndex(r => r.id === id);
        if (index !== -1) {
          state.wfhRequests[index].status = status;
        }
      });
  },
});

export const { setWFHFilter, setWFHPagination, clearWFHError } = wfhSlice.actions;
export default wfhSlice.reducer;