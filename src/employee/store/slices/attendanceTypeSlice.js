import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

// Submit attendance request (early check-in, late check-in, missed punch in/out)
export const submitAttendanceRequest = createAsyncThunk(
  "attendance/submitRequest",
  async ({ type, request_date, request_time, reason }, { rejectWithValue }) => {
    try {
      const payload = {
        type, // 'early_check_in', 'late_check_in', 'missed_punch_in', 'missed_punch_out'
        request_date,
        request_time,
        reason,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const response = await apiClient.post("/employee/attendance-requests", payload);

      if (response.data?.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to submit attendance request");
    } catch (error) {
      console.error("Submit attendance request error:", error);
      console.error("Error response:", error.response?.data);

      // Extract validation errors
      if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors).flat();
        return rejectWithValue(errorMessages.join(", "));
      }

      return rejectWithValue(
        error.response?.data?.message || "Failed to submit attendance request"
      );
    }
  }
);

// Fetch user's attendance requests history
export const fetchAttendanceRequests = createAsyncThunk(
  "attendance/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/employee/attendance-requests");

      if (response.data?.status === "success") {
        return response.data.data || [];
      }
      return rejectWithValue(response.data?.message || "Failed to fetch attendance requests");
    } catch (error) {
      console.error("Fetch attendance requests error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch attendance requests"
      );
    }
  }
);

// Fetch single attendance request details
export const fetchAttendanceRequestDetails = createAsyncThunk(
  "attendance/fetchDetails",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/employee/attendance-requests/${id}`);
      return response.data?.data || null;
    } catch (error) {
      console.error("Fetch attendance request details error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch details"
      );
    }
  }
);

// Update attendance request
export const updateAttendanceRequest = createAsyncThunk(
  "attendance/updateRequest",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      // Use FormData with POST and _method=PUT. 
      // This is the absolute most reliable way to send updates to a Laravel backend 
      // because it bypasses both Hostinger's 405 PUT blocks AND PHP's inability to parse JSON for PUT requests natively in some configs.
      const formData = new FormData();
      formData.append('_method', 'PUT');
      
      // Append all fields explicitly
      Object.keys(payload).forEach(key => {
        if (payload[key] !== undefined && payload[key] !== null) {
          formData.append(key, payload[key]);
        }
      });
      
      const response = await apiClient.post(`/employee/attendance-requests/${id}`, formData);
      if (response.data?.status === "success" || response.data?.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to update attendance request");
    } catch (error) {
      console.error("Update attendance request error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to update attendance request"
      );
    }
  }
);

// Delete attendance request
export const deleteAttendanceRequest = createAsyncThunk(
  "attendance/deleteRequest",
  async (id, { rejectWithValue }) => {
    try {
      // Use POST with _method spoofing to bypass 405 errors on some hosting providers
      const response = await apiClient.post(`/employee/attendance-requests/${id}`, {
        _method: 'DELETE'
      });
      if (response.data?.status === "success" || response.data?.success) {
        return id;
      }
      return rejectWithValue(response.data?.message || "Failed to delete attendance request");
    } catch (error) {
      console.error("Delete attendance request error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete attendance request"
      );
    }
  }
);

// Update attendance request status (for admin)
export const updateAttendanceRequestStatus = createAsyncThunk(
  "attendance/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/admin/attendance-requests/${id}/status`, { status });


      if (response.data?.status === "success") {
        return { id, status };
      }
      return rejectWithValue(response.data?.message || "Failed to update status");
    } catch (error) {
      console.error("Update attendance request status error:", error);
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
    type: 'all', // 'all', 'early_check_in', 'late_check_in', 'missed_punch_in', 'missed_punch_out'
    status: 'all', // 'all', 'pending', 'approved', 'rejected'
    search: '',
  },
  pagination: {
    currentPage: 1,
    perPage: 10,
  },
  loading: false,
  submitting: false,
  error: null,
  totalCount: 0,
};

const attendanceTypeSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setAttendanceFilter: (state, action) => {
      state.filter = { ...state.filter, ...action.payload };
      state.pagination.currentPage = 1;
    },
    setAttendancePagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearAttendanceError: (state) => {
      state.error = null;
    },
    clearAttendanceRequests: (state) => {
      state.requests = [];
      state.currentRequest = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Submit Attendance Request
      .addCase(submitAttendanceRequest.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitAttendanceRequest.fulfilled, (state, action) => {
        state.submitting = false;
        state.currentRequest = action.payload;
        state.requests.unshift(action.payload); // Add to beginning of list
      })
      .addCase(submitAttendanceRequest.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })

      // Fetch Attendance Requests
      .addCase(fetchAttendanceRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
        state.totalCount = action.payload.length;
      })
      .addCase(fetchAttendanceRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Attendance Request Status
      .addCase(updateAttendanceRequestStatus.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        const index = state.requests.findIndex(r => r.id === id);
        if (index !== -1) {
          state.requests[index].status = status;
        }
        if (state.currentRequest?.id === id) {
          state.currentRequest.status = status;
        }
      })

      // Update Attendance Request
      .addCase(updateAttendanceRequest.fulfilled, (state, action) => {
        if (action.payload && action.payload.id) {
          const index = state.requests.findIndex(r => r.id === action.payload.id);
          if (index !== -1) {
            state.requests[index] = action.payload;
          }
        }
      })

      // Delete Attendance Request
      .addCase(deleteAttendanceRequest.fulfilled, (state, action) => {
        state.requests = state.requests.filter(r => r.id !== action.payload);
        state.totalCount = state.requests.length;
      });
  },
});

export const {
  setAttendanceFilter,
  setAttendancePagination,
  clearAttendanceError,
  clearAttendanceRequests
} = attendanceTypeSlice.actions;

export default attendanceTypeSlice.reducer;