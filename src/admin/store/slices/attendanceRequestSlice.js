// src/admin/store/slices/adminAttendanceSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

const handleApiError = (error) => {
  if (error.response) {
    return error.response.data?.message || `Server error: ${error.response.status}`;
  }
  if (error.request) return "Network error: Unable to connect to server";
  return error.message || "An unexpected error occurred";
};

// Fetch all attendance requests (Admin)
export const fetchAttendanceRequests = createAsyncThunk(
  "adminAttendance/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/admin/attendance-requests`, { params });
      
      let requests = [];
      let total = 0;
      
      if (response.data?.data?.data) {
        requests = response.data.data.data;
        total = response.data.data.total || requests.length;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        requests = response.data.data;
        total = requests.length;
      } else if (Array.isArray(response.data)) {
        requests = response.data;
        total = requests.length;
      }

      return {
        requests,
        total,
        currentPage: response.data?.data?.current_page || 1,
        lastPage: response.data?.data?.last_page || 1,
        perPage: response.data?.data?.per_page || 10,
      };
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Update attendance request status (Admin)
export const updateAttendanceStatus = createAsyncThunk(
  "adminAttendance/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/admin/attendance-requests/${id}/status`, { status });
      return response.data?.data || { id, status };
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Update attendance request (Admin)
export const updateAttendanceRequest = createAsyncThunk(
  "adminAttendance/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/admin/attendance-requests/${id}`, data);
      return response.data?.data || { id, ...data };
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Delete attendance request (Admin)
export const deleteAttendanceRequest = createAsyncThunk(
  "adminAttendance/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/admin/attendance-requests/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Fetch single attendance request details (Admin)
export const fetchAttendanceRequestDetails = createAsyncThunk(
  "adminAttendance/fetchDetails",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/admin/attendance-requests/${id}`);
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

const initialState = {
  requests: [],
  selectedRequest: null,
  loading: false,
  actionLoading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  lastPage: 1,
  perPage: 10,
  filter: {
    status: "all",
    type: "all",
    search: "",
  },
};

const adminAttendanceSlice = createSlice({
  name: "adminAttendance",
  initialState,
  reducers: {
    clearAdminAttendanceError: (state) => {
      state.error = null;
    },
    setAdminAttendanceFilter: (state, action) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    resetAdminAttendanceFilter: (state) => {
      state.filter = initialState.filter;
    },
    clearSelectedRequest: (state) => {
      state.selectedRequest = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all requests
      .addCase(fetchAttendanceRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload.requests;
        state.totalCount = action.payload.total;
        state.currentPage = action.payload.currentPage || 1;
        state.lastPage = action.payload.lastPage || 1;
        state.perPage = action.payload.perPage || 10;
      })
      .addCase(fetchAttendanceRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.requests = [];
        state.totalCount = 0;
      })

      // Fetch single request details
      .addCase(fetchAttendanceRequestDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceRequestDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedRequest = action.payload;
      })
      .addCase(fetchAttendanceRequestDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.selectedRequest = null;
      })

      // Update status
      .addCase(updateAttendanceStatus.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateAttendanceStatus.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updated = action.payload;
        state.requests = state.requests.map((req) =>
          req.id === updated.id ? { ...req, status: updated.status } : req
        );
        if (state.selectedRequest?.id === updated.id) {
          state.selectedRequest = { ...state.selectedRequest, status: updated.status };
        }
      })
      .addCase(updateAttendanceStatus.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // Update request
      .addCase(updateAttendanceRequest.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateAttendanceRequest.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updated = action.payload;
        state.requests = state.requests.map((req) =>
          req.id === updated.id ? { ...req, ...updated } : req
        );
        if (state.selectedRequest?.id === updated.id) {
          state.selectedRequest = { ...state.selectedRequest, ...updated };
        }
      })
      .addCase(updateAttendanceRequest.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // Delete request
      .addCase(deleteAttendanceRequest.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteAttendanceRequest.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.requests = state.requests.filter((req) => req.id !== action.payload);
        state.totalCount = Math.max(0, state.totalCount - 1);
        if (state.selectedRequest?.id === action.payload) {
          state.selectedRequest = null;
        }
      })
      .addCase(deleteAttendanceRequest.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearAdminAttendanceError,
  setAdminAttendanceFilter,
  resetAdminAttendanceFilter,
  clearSelectedRequest,
} = adminAttendanceSlice.actions;

export default adminAttendanceSlice.reducer;