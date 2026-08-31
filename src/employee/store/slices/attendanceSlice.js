// attendanceSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

// Fetch Dashboard Data
export const fetchDashboardData = createAsyncThunk(
  "attendance/fetchDashboardData",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/employee/dashboard");

      if (response.data && response.data.status === "success") {
        return response.data.data;
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to fetch dashboard data",
        );
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch dashboard data",
      );
    }
  },
);

// Punch In with location and timezone
// Punch In with location and timezone
export const punchIn = createAsyncThunk(
  "attendance/punchIn",
  async (data, { rejectWithValue }) => {
    try {
      const payload = {};

      if (data?.location) {
        payload.punch_in_latitude = data.location.latitude;
        payload.punch_in_longitude = data.location.longitude;
        payload.punch_in_address = data.location.address;

        // Add work_location (country)
        if (data.location.work_location) {
          payload.work_location = data.location.work_location;
        }

        // Timezone
        if (data.location.timezone) {
          payload.timezone = data.location.timezone;
        }

        // Timezone offset in minutes
        if (data.location.timezone_offset_minutes) {
          payload.timezone_offset_minutes =
            data.location.timezone_offset_minutes;
        }

        // ✅ Add punch_in_time with timezone
        const now = new Date();
        // Get the timezone from location data
        const tz = data.location.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Format time in the user's timezone
        const nowInTz = new Date().toLocaleString("en-US", { timeZone: tz });
        const tzDate = new Date(nowInTz);
        const year = tzDate.getFullYear();
        const month = String(tzDate.getMonth() + 1).padStart(2, '0');
        const day = String(tzDate.getDate()).padStart(2, '0');
        const hours = String(tzDate.getHours()).padStart(2, '0');
        const minutes = String(tzDate.getMinutes()).padStart(2, '0');
        const seconds = String(tzDate.getSeconds()).padStart(2, '0');
        
        // Get timezone offset
        const tzOffsetMinutes = data.location.timezone_offset_minutes || -new Date().getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(tzOffsetMinutes) / 60);
        const offsetMins = Math.abs(tzOffsetMinutes) % 60;
        const offsetSign = tzOffsetMinutes >= 0 ? '+' : '-';
        const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
        
        payload.punch_in_time = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetStr}`;
        
        console.log("📤 Adding punch_in_time to payload:", payload.punch_in_time);
      }

      const response = await apiClient.post("/employee/punch-in", payload);

      if (response.data && response.data.status === "success") {
        localStorage.setItem("attendance-punched-in", "true");
        localStorage.setItem(
          "attendance-punch-in-time",
          response.data.data.punch_in,
        );
        if (data?.location) {
          localStorage.setItem(
            "attendance-punch-location",
            JSON.stringify(data.location),
          );
        }
        return response.data.data;
      } else {
        return rejectWithValue(response.data?.message || "Punch in failed");
      }
    } catch (error) {
      console.error("Punch in error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Punch in failed",
      );
    }
  },
);

// attendanceSlice.js - Update submitLateAttendanceRequest

export const submitLateAttendanceRequest = createAsyncThunk(
  "lateAttendance/submitRequest",
  async (data, { rejectWithValue }) => {
    try {
      const payload = {
        employee_id: data.employee_id,
        type: data.type || 'late_check_in',
        request_date: data.request_date,
        request_time: data.request_time,
        reason: data.reason,
        status: data.status || 'pending',
        timezone: data.timezone,
        created_by: data.created_by || 'admin',
        location: data.location,
        work_location: data.work_location || data.location?.work_location || 'Unknown' // ✅ Add work_location
      };

      console.log("📤 Submitting late attendance request with payload:", payload);

      const response = await apiClient.post("/employee/late-check-in-block", payload);
      
      if (response.data && response.data.status === "success") {
        return response.data.data;
      } else {
        return rejectWithValue(response.data?.message || "Failed to submit request");
      }
    } catch (error) {
      console.error("Late attendance request error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to submit request"
      );
    }
  }
);

// Punch Out with location and timezone
// Punch Out with location and timezone
export const punchOut = createAsyncThunk(
  "attendance/punchOut",
  async (data, { rejectWithValue }) => {
    try {
      // ✅ Add debug logging
      console.log("📤 Punch Out - Full data received:", data);
      console.log("📤 Punch Out - Location:", data.location);
      console.log("📤 Punch Out - Timezone:", data.location?.timezone);
      console.log("📤 Punch Out - Timezone offset:", data.location?.timezone_offset_minutes);
      console.log("📤 Punch Out - punch_out_time:", data.punch_out_time);

      const formattedProjectTimes = Object.entries(data.project_times || {}).map(
  ([projectId, time]) => ({
    project_id: parseInt(projectId),
    time_minutes: parseInt(time, 10), 
  }),
);

      const payload = {
        project_times: formattedProjectTimes,
        total_hours: data.total_hours,
      };

      // Add punch_out_time to payload
      if (data.punch_out_time) {
        payload.punch_out_time = data.punch_out_time;
        console.log("✅ Adding punch_out_time:", data.punch_out_time);
      } else {
        console.warn("⚠️ No punch_out_time provided!");
      }

      if (data.punch_out_date) {
        payload.punch_out_date = data.punch_out_date;
      }
      if (data.no_projects) {
        payload.no_projects = data.no_projects;
      }
      if (data.task_report) {
        payload.task_report = data.task_report;
      }

      const location = data.location;
      if (location) {
        payload.punch_out_latitude = location.latitude;
        payload.punch_out_longitude = location.longitude;
        payload.punch_out_address = location.address;

        // Add work_location for punch out as well
        if (location.work_location) {
          payload.work_location = location.work_location;
        }

        if (location.timezone) {
          payload.timezone = location.timezone;
          console.log("✅ Adding timezone:", location.timezone);
        } else {
          console.warn("⚠️ No timezone provided in location!");
        }
        
        if (location.timezone_offset_minutes) {
          payload.timezone_offset_minutes = location.timezone_offset_minutes;
          console.log("✅ Adding timezone_offset_minutes:", location.timezone_offset_minutes);
        }
      } else {
        console.warn("⚠️ No location data provided!");
      }

      console.log("📤 Final payload being sent:", payload);

      const response = await apiClient.post("/employee/punch-out", payload);

      if (response.data && response.data.status === "success") {
        const data = response.data.data;
        localStorage.removeItem("attendance-punched-in");
        localStorage.removeItem("attendance-punch-in-time");
        localStorage.removeItem("attendance-punch-location");
        return {
          punch_out: data.punch_out,
          log_date: data.log_date,
          log_status: data.log_status,
          id: data.id,
        };
      } else {
        return rejectWithValue(response.data?.message || "Punch out failed");
      }
    } catch (error) {
      console.error("❌ Punch out error:", error);
      console.error(
        "❌ Validation errors:",
        JSON.stringify(error.response?.data, null, 2),
      );
      return rejectWithValue(
        error.response?.data?.message || "Punch out failed",
      );
    }
  },
);

// In attendanceSlice.js - Add debug logs

export const fetchPunchData = createAsyncThunk(
  "attendance/fetchPunchData",
  async ({ userId, date }, { rejectWithValue }) => {
    console.log("fetchPunchData called with:", { userId, date });
    try {
      const response = await apiClient.get(`/employee/attendance/punch-data`, {
        params: { user_id: userId, date },
      });
      console.log("fetchPunchData response:", response.data);

      if (response.data?.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to fetch punch data",
      );
    } catch (error) {
      console.error("Fetch punch data error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch punch data",
      );
    }
  },
);
const initialState = {
  isPunchedIn: localStorage.getItem("attendance-punched-in") === "true",
  punchInTime: localStorage.getItem("attendance-punch-in-time") || null,
  punchOutTime: null,
  loading: false,
  error: null,
  dashboardData: null,
  punchData: null,
  success: false,
  data: null
};

const attendanceSlice = createSlice({
  name: "attendance",
  initialState,
  reducers: {
    clearAttendanceState: (state) => {
      state.isPunchedIn = false;
      state.punchInTime = null;
      state.punchOutTime = null;
      state.error = null;
      localStorage.removeItem("attendance-punched-in");
      localStorage.removeItem("attendance-punch-in-time");
    },
    clearLateAttendanceState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.data = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Dashboard Data
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardData = action.payload;
        if (action.payload.today_attendance) {
          state.isPunchedIn =
            action.payload.today_attendance.punched_in || false;
          state.punchInTime =
            action.payload.today_attendance.punch_in_time || null;
        }
        state.error = null;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Punch In
      .addCase(punchIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(punchIn.fulfilled, (state, action) => {
        state.loading = false;
        state.isPunchedIn = true;
        state.punchInTime = action.payload.punch_in;
        state.error = null;
      })
      .addCase(punchIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Punch Out
      .addCase(punchOut.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(punchOut.fulfilled, (state, action) => {
        state.loading = false;
        state.isPunchedIn = false;
        state.punchOutTime = action.payload.punch_out;
        state.punchInTime = null;
        state.error = null;
      })
      .addCase(punchOut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchPunchData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPunchData.fulfilled, (state, action) => {
        state.loading = false;
        state.punchData = action.payload;
      })
      .addCase(fetchPunchData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
       .addCase(submitLateAttendanceRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(submitLateAttendanceRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(submitLateAttendanceRequest.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload;
      });
  },
});

export const { clearAttendanceState, clearLateAttendanceState } = attendanceSlice.actions;
export default attendanceSlice.reducer;
