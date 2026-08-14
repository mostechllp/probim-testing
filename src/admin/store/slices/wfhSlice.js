// src/admin/store/slices/wfhSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

// Fetch all WFH requests (Admin)
export const fetchAdminWFHRequests = createAsyncThunk(
  "adminWfh/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/wfh-requests", { params });
      
      if (response.data?.status === "success") {
        return response.data.data?.data || [];
      }
      return rejectWithValue(response.data?.message || "Failed to fetch WFH requests");
    } catch (error) {
      console.error("Fetch admin WFH error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch WFH requests"
      );
    }
  }
);

// Fetch single WFH request
export const fetchWFHRequestById = createAsyncThunk(
  "adminWfh/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/admin/wfh-requests/${id}`);
      
      if (response.data?.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to fetch WFH request");
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch WFH request"
      );
    }
  }
);

// Update WFH request status - FIXED: Send proper case
export const updateWFHRequestStatus = createAsyncThunk(
  "adminWfh/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      // Map status to the format expected by backend (capitalized)
      const statusMap = {
        approved: "Approved",
        rejected: "Rejected",
        pending: "Pending",
      };
      
      // Get the properly formatted status
      const formattedStatus = statusMap[status.toLowerCase()] || status;
      
      const response = await apiClient.post(`/admin/wfh-requests/${id}/status`, { 
        status: formattedStatus 
      });
      
      if (response.data?.status === "success") {
        // Return the original status (lowercase) for consistent state management
        return { id, status: status.toLowerCase() };
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
  requests: [],
  currentRequest: null,
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
  totalCount: 0,
};

const adminWFHSlice = createSlice({
  name: 'adminWfh',
  initialState,
  reducers: {
    setAdminWfhFilter: (state, action) => {
      state.filter.status = action.payload.status;
      state.filter.search = action.payload.search || '';
      state.pagination.currentPage = 1;
    },
    setAdminWfhPagination: (state, action) => {
      state.pagination.currentPage = action.payload.currentPage;
      state.pagination.perPage = action.payload.perPage;
    },
    clearAdminWfhError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all requests
      .addCase(fetchAdminWFHRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminWFHRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
        state.totalCount = action.payload.length;
      })
      .addCase(fetchAdminWFHRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch by ID
      .addCase(fetchWFHRequestById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWFHRequestById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRequest = action.payload;
      })
      .addCase(fetchWFHRequestById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update status
      .addCase(updateWFHRequestStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateWFHRequestStatus.fulfilled, (state, action) => {
        state.loading = false;
        const { id, status } = action.payload;
        const index = state.requests.findIndex(r => r.id === id);
        if (index !== -1) {
          state.requests[index].status = status;
        }
      })
      .addCase(updateWFHRequestStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setAdminWfhFilter, setAdminWfhPagination, clearAdminWfhError } = adminWFHSlice.actions;
export default adminWFHSlice.reducer;