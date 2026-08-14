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
        return rejectWithValue(response.data?.message || "Failed to fetch dashboard data");
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch dashboard data"
      );
    }
  }
);

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
          payload.timezone_offset_minutes = data.location.timezone_offset_minutes;
        }
      }

      const response = await apiClient.post("/employee/punch-in", payload);

      if (response.data && response.data.status === "success") {
        localStorage.setItem("attendance-punched-in", "true");
        localStorage.setItem("attendance-punch-in-time", response.data.data.punch_in);
        if (data?.location) {
          localStorage.setItem("attendance-punch-location", JSON.stringify(data.location));
        }
        return response.data.data;
      } else {
        return rejectWithValue(response.data?.message || "Punch in failed");
      }
    } catch (error) {
      console.error("Punch in error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Punch in failed"
      );
    }
  }
);

// Punch Out with location and timezone
export const punchOut = createAsyncThunk(
  "attendance/punchOut",
  async (data, { rejectWithValue }) => {
    try {
      const formattedProjectTimes = Object.entries(data.project_times || {}).map(
        ([projectId, time]) => ({
          project_id: parseInt(projectId),
          time_minutes: Math.round(parseFloat(time) * 60),
        })
      );


      const payload = {
        project_times: formattedProjectTimes,
        total_hours: data.total_hours,
      };

      // Add punch_out_time to payload
      if (data.punch_out_time) {
        payload.punch_out_time = data.punch_out_time;
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
        }
        if (location.timezone_offset_minutes) {
          payload.timezone_offset_minutes = location.timezone_offset_minutes;
        }
      }

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
          id: data.id
        };
      } else {
        return rejectWithValue(response.data?.message || "Punch out failed");
      }
    } catch (error) {
      console.error("Punch out error:", error);
      console.error("Validation errors:", JSON.stringify(error.response?.data, null, 2));
      return rejectWithValue(
        error.response?.data?.message || "Punch out failed"
      );
    }
  }
);

const initialState = {
  isPunchedIn: localStorage.getItem("attendance-punched-in") === "true",
  punchInTime: localStorage.getItem("attendance-punch-in-time") || null,
  punchOutTime: null,
  loading: false,
  error: null,
  dashboardData: null,
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
          state.isPunchedIn = action.payload.today_attendance.punched_in || false;
          state.punchInTime = action.payload.today_attendance.punch_in_time || null;
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
      });
  },
});

export const { clearAttendanceState } = attendanceSlice.actions;
export default attendanceSlice.reducer;