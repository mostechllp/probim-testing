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

// Fetch missed punch in records (attendance records without punch in)
export const fetchMissedPunchIns = createAsyncThunk(
  "attendance/fetchMissedPunchIns",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/employee/missed-punch-ins");
      if (response.data?.status === "success") {
        return response.data.data || [];
      }
      return rejectWithValue(response.data?.message || "Failed to fetch missed punch ins");
    } catch (error) {
      console.error("Fetch missed punch ins error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch missed punch ins"
      );
    }
  }
);

// Submit missed punch in request with time
export const submitMissedPunchIn = createAsyncThunk(
  "attendance/submitMissedPunchIn",
  async ({ attendance_id, punch_in_time, reason }, { rejectWithValue }) => {
    try {
      const payload = {
        attendance_id,
        punch_in_time,
        reason,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const response = await apiClient.post("/employee/missed-punch-in-request", payload);

      if (response.data?.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to submit missed punch in request");
    } catch (error) {
      console.error("Submit missed punch in error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to submit missed punch in request"
      );
    }
  }
);

// Submit leave request for missed punch in
export const submitLeaveForMissedPunch = createAsyncThunk(
  "attendance/submitLeaveForMissedPunch",
  async ({ attendance_id, reason, leave_type }, { rejectWithValue }) => {
    try {
      const payload = {
        attendance_id,
        reason,
        leave_type: leave_type || "casual",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const response = await apiClient.post("/employee/missed-punch-leave-request", payload);

      if (response.data?.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to submit leave request");
    } catch (error) {
      console.error("Submit leave for missed punch error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to submit leave request"
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
      const formData = new FormData();
      formData.append('_method', 'PUT');
      
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
  missedPunchIns: [],
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
    clearMissedPunchIns: (state) => {
      state.missedPunchIns = [];
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
        state.requests.unshift(action.payload);
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

      // Fetch Missed Punch Ins
      .addCase(fetchMissedPunchIns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMissedPunchIns.fulfilled, (state, action) => {
        state.loading = false;
        state.missedPunchIns = action.payload;
      })
      .addCase(fetchMissedPunchIns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Submit Missed Punch In
      .addCase(submitMissedPunchIn.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitMissedPunchIn.fulfilled, (state, action) => {
        state.submitting = false;
        // Remove the missed punch in from the list
        state.missedPunchIns = state.missedPunchIns.filter(
          item => item.id !== action.payload.attendance_id
        );
      })
      .addCase(submitMissedPunchIn.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })

      // Submit Leave for Missed Punch
      .addCase(submitLeaveForMissedPunch.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitLeaveForMissedPunch.fulfilled, (state, action) => {
        state.submitting = false;
        // Remove the missed punch in from the list
        state.missedPunchIns = state.missedPunchIns.filter(
          item => item.id !== action.payload.attendance_id
        );
      })
      .addCase(submitLeaveForMissedPunch.rejected, (state, action) => {
        state.submitting = false;
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
  clearAttendanceRequests,
  clearMissedPunchIns
} = attendanceTypeSlice.actions;

export default attendanceTypeSlice.reducer;