import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

const handleApiError = (error) => {
  if (error.response) {
    return (
      error.response.data?.message || `Server error: ${error.response.status}`
    );
  }
  if (error.request) return "Network error: Unable to connect to server";
  return error.message || "An unexpected error occurred";
};

const isValidPunch = (value) => value && value !== "-" && value.trim() !== "";

// FIXED: Improved extractAttendanceRecords function - PRESERVES EXACT STATUS
const extractAttendanceRecords = (response) => {
  try {

    let attendanceData = [];
    let meta = {};

    // Handle different response structures
    if (response?.data?.data?.data && Array.isArray(response.data.data.data)) {
      attendanceData = response.data.data.data;
      meta = response.data.data.meta || {};
    } else if (response?.data?.data && Array.isArray(response.data.data)) {
      attendanceData = response.data.data;
      meta = response.data.meta || {};
    } else if (response?.data && Array.isArray(response.data)) {
      attendanceData = response.data;
    } else if (Array.isArray(response)) {
      attendanceData = response;
    } else {
      attendanceData = [];
    }

    // Map the records - PRESERVE EXACT STATUS FROM API
    const records = attendanceData.map((record, idx) => {
      const employeeName =
        record.name ||
        record.employee_name ||
        record.employeeName ||
        record.user?.username ||
        `Employee ${record.userid || record.employee_id || record.id || idx}`;

      const department =
        record.department ||
        record.user?.department?.name ||
        record.user?.department_id ||
        "-";

      const designation =
        record.designation || record.user?.designation?.name || "-";

      const company = record.company || record.user?.company?.name || "N/A";

      const punchIn =
        record.punch_in && record.punch_in !== "-" ? record.punch_in : "--";
      const punchOut =
        record.punch_out && record.punch_out !== "-" ? record.punch_out : "--";

      // ✅ PRESERVE THE EXACT STATUS FROM API - DO NOT TRANSFORM
      // The API returns: "Presentt", "Absent", "Weekly Off", "Half Day", "Full Day"
      let status = record.status || record.attendance_status || "Absent";

      // ✅ Keep the exact status as returned by the API
      // Only set a default if status is empty or null
      if (!status || status === "") {
        if (punchIn && punchIn !== "--" && punchIn !== "-") {
          status = "Present";
        } else {
          status = "Absent";
        }
      }

      const workedHours =
        record.worked_hours !== undefined ? record.worked_hours : 0;
      const standardHours = record.standard_hours || 9;
      const overtime = record.overtime || "-";

      let date =
        record.date || record.log_date || record.attendance_date || "-";
      if (date && date.includes("-") && date !== "-") {
        const parts = date.split("-");
        if (parts.length === 3) {
          date = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }

      return {
        id: record.employee_id || record.userid || record.id || idx,
        employee_id: record.employee_id || record.userid || record.id || idx,
        user_id: record.userid || record.user_id || record.user?.id || null,
        employeeName: employeeName,
        name: employeeName,
        employee_name: employeeName,
        department: department,
        designation: designation,
        company: company,
        date: date,
        log_date: date,
        attendance_date: date,
        punch_in: punchIn,
        punch_out: punchOut,
        punchIn: punchIn,
        punchOut: punchOut,
        worked_hours: workedHours,
        working_hours: workedHours,
        workingHours: workedHours,
        standard_hours: standardHours,
        overtime: overtime,
        // ✅ Preserve the exact status from API
        status: status,
        // Keep the original status for reference
        raw_status: record.status || record.attendance_status,
        isLate: status === "Late" || status === "late",
        hasPunchOut: punchOut !== "--",
        raw: record,
      };
    });

    const total = meta.total || records.length;
    const currentPage = meta.current_page || 1;
    const lastPage = meta.last_page || 1;
    const perPage = meta.per_page || 1000;

    return {
      records,
      total,
      currentPage,
      lastPage,
      perPage,
    };
  } catch (error) {
    console.error("Error extracting attendance records:", error);
    return { records: [], total: 0 };
  }
};

// Async thunks
export const fetchAttendanceRecords = createAsyncThunk(
  "attendance/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/admin/attendance`, { params });
      const result = extractAttendanceRecords(response);
      return result;
    } catch (error) {
      console.error("Fetch attendance error:", error);
      return rejectWithValue(handleApiError(error));
    }
  },
);
export const uploadAttendanceFile = createAsyncThunk(
  "attendance/upload",
  async ({ file }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post(
        `/admin/attendance/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const uploadId = response.data?.data?.id || null;
      const rawStatus = response.data?.data?.status || "pending";
      const processingStatus = [
        "completed",
        "done",
        "success",
        "processed",
      ].includes(rawStatus)
        ? "completed"
        : "processing";

      return {
        id: uploadId,
        status: processingStatus,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Upload error:", error.response?.data);
      if (error.response?.data?.errors) {
        const msgs = Object.values(error.response.data.errors).flat();
        return rejectWithValue(msgs.join(", "));
      }
      return rejectWithValue(
        error.response?.data?.message || "Failed to upload attendance file",
      );
    }
  },
);

export const fetchUploadStatus = createAsyncThunk(
  "attendance/fetchUploadStatus",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        `/admin/attendance/upload-status/${id}`,
      );
      const processingStatus = response.data?.data?.status || "pending";

      let normalizedStatus;
      if (["completed", "done", "processed"].includes(processingStatus)) {
        normalizedStatus = "completed";
      } else if (processingStatus === "failed") {
        normalizedStatus = "failed";
      } else {
        normalizedStatus = "processing";
      }

      return { id, status: normalizedStatus };
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  },
);

// These thunks now use the fixed extractData function
export const fetchPunchInToday = createAsyncThunk(
  "attendance/fetchPunchInToday",
  async () => {
    try {
      return extractData(
        await apiClient.get(`/admin/attendance/punch-in-today`),
      );
    } catch {
      return [];
    }
  },
);

export const fetchPunchInYesterday = createAsyncThunk(
  "attendance/fetchPunchInYesterday",
  async () => {
    try {
      return extractData(
        await apiClient.get(`/admin/attendance/punch-in-yesterday`),
      );
    } catch {
      return [];
    }
  },
);

export const fetchPunchOutToday = createAsyncThunk(
  "attendance/fetchPunchOutToday",
  async () => {
    try {
      return extractData(
        await apiClient.get(`/admin/attendance/punch-out-today`),
      );
    } catch {
      return [];
    }
  },
);

export const fetchLateComers = createAsyncThunk(
  "attendance/fetchLateComers",
  async () => {
    try {
      const response = await apiClient.get(`/admin/attendance/late-comers`);
      return extractData(response);
    } catch (error) {
      console.error("Error fetching late comers:", error);
      return [];
    }
  },
);

export const fetchAbsentees = createAsyncThunk(
  "attendance/fetchAbsentees",
  async () => {
    try {
      const response = await apiClient.get(`/admin/attendance/absentees`);
      return extractData(response);
    } catch (error) {
      console.error("Error fetching absentees:", error);
      return [];
    }
  },
);

// ==================== ATTENDANCE STATS THUNK ====================
export const fetchAttendanceStats = createAsyncThunk(
  "attendance/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/admin/attendance/stats`);

      // Extract data from response
      const data = response.data?.data || response.data;

      // Map the stats from the API response
      return {
        total: {
          count: data.total?.count || 0,
          employees: data.total?.employees || [],
        },
        punched_in: {
          count: data.punched_in?.count || 0,
          employees: data.punched_in?.employees || [],
        },
        punched_out: {
          count: data.punched_out?.count || 0,
          employees: data.punched_out?.employees || [],
        },
        absent: {
          count: data.absent?.count || 0,
          employees: data.absent?.employees || [],
        },
        late: {
          count: data.late?.count || 0,
          employees: data.late?.employees || [],
        },
      };
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
      return rejectWithValue(handleApiError(error));
    }
  },
);

const attendanceSlice = createSlice({
  name: "attendance",
  initialState: {
    records: [],
    stats: {
      totalActiveEmployees: 0,
      total_active_employees: 0,
      totalEmployees: 0,
      total_employees: 0,
      totalEmployeesList: [],
      presentToday: 0,
      present_today: 0,
      punchedInToday: 0,
      punched_in_today: 0,
      punchedInEmployees: [],
      absentToday: 0,
      absent_today: 0,
      absentEmployees: [],
      punchedLate: 0,
      punched_late: 0,
      lateToday: 0,
      late_today: 0,
      lateEmployees: [],
      punchedOutToday: 0,
      punched_out_today: 0,
      punchedOutEmployees: [],
      punchedInOnTime: 0,
      punched_in_on_time: 0,
    },
    uploadStatus: null,
    uploadStatusId: null,
    uploads: [],
    punchInToday: [],
    punchInYesterday: [],
    punchOutToday: [],
    lateComers: [],
    absentees: [],
    loading: false,
    uploadLoading: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
  },
  reducers: {
    clearUploadStatus: (state) => {
      state.uploadStatus = null;
      state.uploadStatusId = null;
    },
    clearErrors: (state) => {
      state.error = null;
    },
    updateUploadStatus: (state, action) => {
      const { id, status } = action.payload;
      const upload = state.uploads.find((u) => u.id === id);
      if (upload) {
        upload.status = status;
        upload.updatedAt = new Date().toISOString();
      }
      if (state.uploadStatusId === id) state.uploadStatus = status;
    },
    removeUpload: (state, action) => {
      state.uploads = state.uploads.filter((u) => u.id !== action.payload);
      if (state.uploadStatusId === action.payload) {
        state.uploadStatus = null;
        state.uploadStatusId = null;
      }
    },
    clearCompletedUploads: (state) => {
      state.uploads = state.uploads.filter((u) => u.status === "processing");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendanceRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload.records;
        state.totalCount = action.payload.total;
        state.currentPage = action.payload.currentPage || 1;
        state.lastPage = action.payload.lastPage || 1;
        state.perPage = action.payload.perPage || 15;
      })
      .addCase(fetchAttendanceRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.records = [];
        state.totalCount = 0;
      })

      .addCase(uploadAttendanceFile.pending, (state) => {
        state.uploadLoading = true;
        state.error = null;
        state.uploadStatus = null;
      })
      .addCase(uploadAttendanceFile.fulfilled, (state, action) => {
        state.uploadLoading = false;
        state.uploadStatus = action.payload.status;
        state.uploadStatusId = action.payload.id;
        state.uploads.push({
          id: action.payload.id,
          status: action.payload.status,
          fileName: action.payload.fileName,
          uploadedAt: action.payload.uploadedAt,
        });
      })
      .addCase(uploadAttendanceFile.rejected, (state, action) => {
        state.uploadLoading = false;
        state.error = action.payload;
        state.uploadStatus = "failed";
      })

      .addCase(fetchUploadStatus.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        const upload = state.uploads.find((u) => u.id === id);
        if (upload) upload.status = status;
        if (state.uploadStatusId === id) state.uploadStatus = status;
      })
      .addCase(fetchUploadStatus.rejected, (state, action) => {
        state.error = action.payload;
      })

      .addCase(fetchPunchInToday.fulfilled, (state, action) => {
        state.punchInToday = action.payload;
      })
      .addCase(fetchPunchInToday.rejected, (state) => {
        state.punchInToday = [];
      })
      .addCase(fetchPunchInYesterday.fulfilled, (state, action) => {
        state.punchInYesterday = action.payload;
      })
      .addCase(fetchPunchInYesterday.rejected, (state) => {
        state.punchInYesterday = [];
      })
      .addCase(fetchPunchOutToday.fulfilled, (state, action) => {
        state.punchOutToday = action.payload;
      })
      .addCase(fetchPunchOutToday.rejected, (state) => {
        state.punchOutToday = [];
      })
      .addCase(fetchLateComers.fulfilled, (state, action) => {
        state.lateComers = action.payload;
      })
      .addCase(fetchLateComers.rejected, (state) => {
        state.lateComers = [];
      })
      .addCase(fetchAbsentees.fulfilled, (state, action) => {
        state.absentees = action.payload;
      })
      .addCase(fetchAbsentees.rejected, (state) => {
        state.absentees = [];
      })
      // In the extraReducers section
      .addCase(fetchAttendanceStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceStats.fulfilled, (state, action) => {
        state.loading = false;
        const statsData = action.payload;

        // Map the stats from the API response
        state.stats = {
          // Total employees
          totalActiveEmployees: statsData.total?.count || 0,
          total_active_employees: statsData.total?.count || 0,
          totalEmployees: statsData.total?.count || 0,
          total_employees: statsData.total?.count || 0,

          // Punched In (Present)
          presentToday: statsData.punched_in?.count || 0,
          present_today: statsData.punched_in?.count || 0,
          punchedInToday: statsData.punched_in?.count || 0,
          punched_in_today: statsData.punched_in?.count || 0,

          // Punched In employees list
          punchedInEmployees: statsData.punched_in?.employees || [],

          // Punched Out
          punchedOutToday: statsData.punched_out?.count || 0,
          punched_out_today: statsData.punched_out?.count || 0,

          // Punched Out employees list
          punchedOutEmployees: statsData.punched_out?.employees || [],

          // Absent
          absentToday: statsData.absent?.count || 0,
          absent_today: statsData.absent?.count || 0,

          // Absent employees list
          absentEmployees: statsData.absent?.employees || [],

          // Late
          punchedLate: statsData.late?.count || 0,
          punched_late: statsData.late?.count || 0,
          lateToday: statsData.late?.count || 0,
          late_today: statsData.late?.count || 0,

          // Late employees list
          lateEmployees: statsData.late?.employees || [],

          // Total employees list
          totalEmployeesList: statsData.total?.employees || [],
        };
      })
      .addCase(fetchAttendanceStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearUploadStatus,
  clearErrors,
  updateUploadStatus,
  removeUpload,
  clearCompletedUploads,
} = attendanceSlice.actions;
export default attendanceSlice.reducer;
