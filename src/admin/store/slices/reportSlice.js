// store/slices/reportSlice.js
import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

// ==================== Reports Count ====================
export const fetchReportCounts = createAsyncThunk(
  "reports/fetchCounts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/reports/counts");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch report counts",
      );
    }
  },
);

// ==================== Attendance Report ====================
export const fetchAttendanceReport = createAsyncThunk(
  "attendance/fetchReport",
  async (params) => {
    const apiParams = {
      page: params.page || 1,
      per_page: params.per_page || 10,
      date_range: "custom",
      from_date: params.start_date,
      to_date: params.end_date,
    };

    // Add employee_id filter if present
    if (params.employee_id) {
      apiParams.employee_id = params.employee_id;
    }

    // Add company filter if present
    if (params.company && params.company !== "all") {
      apiParams.company = params.company;
    }

    // Add search filter if present
    if (params.search) {
      apiParams.search = params.search;
    }


    const response = await apiClient.get("/admin/reports/attendance", {
      params: apiParams,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Expires: "0",
      },
    });


    // Access the nested data structure
    const apiData = response.data?.data?.data || [];
    const meta = response.data?.data?.meta || {};

    return {
      data: apiData.map((emp) => ({
        id: emp.employee_id,
        user_id: emp.user_id,
        name: emp.name,
        employeeName: emp.name, // for compatibility
        department: emp.department,
        designation: emp.designation,
        company: emp.company,
        attendance: emp.attendance || []
      })),
      total: meta.total || 0,
      current_page: meta.current_page || 1,
      per_page: meta.per_page || 10,
      last_page: meta.last_page || 1,
    };
  },
);

export const fetchAllAttendanceReport = createAsyncThunk(
  "attendance/fetchAllReport",
  async (params) => {
    // Build the params object
    const apiParams = {
      date_range: "custom",
      from_date: params.start_date,
      to_date: params.end_date,
      per_page: 1000, // Request a large page size to get all data
    };

    if (params.company && params.company !== "all") {
      apiParams.company = params.company;
    }
    if (params.search) {
      apiParams.search = params.search;
    }

    const response = await apiClient.get("/admin/reports/attendance", {
      params: apiParams,
    });

    // Get the first page with a large per_page
    const apiData = response.data?.data?.data || [];
    const total = response.data?.data?.meta?.total || 0;
    const perPage = response.data?.data?.meta?.per_page || 1000;

    // If total is greater than what we got, fetch remaining pages
    let allData = [...apiData];

    if (total > perPage) {
      const totalPages = Math.ceil(total / perPage);
      const promises = [];

      for (let page = 2; page <= totalPages; page++) {
        promises.push(
          apiClient.get("/admin/reports/attendance", {
            params: { ...apiParams, page },
          }),
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach((res) => {
        const pageData = res.data?.data?.data || [];
        allData = [...allData, ...pageData];
      });
    }

    return {
      data: allData.map((emp) => ({
        id: emp.employee_id,
        user_id: emp.user_id,
        name: emp.name,
        employeeName: emp.name,
        department: emp.department,
        designation: emp.designation,
        company: emp.company,
        attendance: emp.attendance || []
      })),
      total: allData.length,
    };
  },
);

// ==================== Export Report ====================
// ==================== Export Report ====================
export const exportReport = createAsyncThunk(
  "reports/exportReport",
  async (
    { reportType = "attendance", format = "pdf", filters = {} },
    { rejectWithValue },
  ) => {
    try {
      // Prepare request body with exact format expected by API
      const requestBody = {
        report_type: reportType,
        format: format, // "pdf" or "xlsx"
        date_range: "custom",
        from_date: filters.start_date,
        to_date: filters.end_date,
      };

      // Add optional filters if they exist
      if (filters.employee_id && filters.employee_id !== "all") {
        requestBody.employee_id =
          parseInt(filters.employee_id) || filters.employee_id;
      }

      if (filters.company && filters.company !== "all") {
        requestBody.company = filters.company;
      }

      if (filters.search) {
        requestBody.search = filters.search;
      }

      // For "all" export, you might want to add a flag or remove pagination
      if (filters.export_all) {
        requestBody.export_all = true;
      }


      const response = await apiClient.post(
        "/admin/reports/export",
        requestBody,
        {
          responseType: "blob",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      // Create a download link and trigger download
      const contentDisposition = response.headers["content-disposition"];
      let filename = `attendance_report_${filters.start_date}_to_${filters.end_date}.${format === "xlsx" ? "xlsx" : format}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
        );
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, "");
        }
      }

      // Determine content type based on format
      let contentType = "application/pdf";
      if (format === "xlsx") {
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      }

      // Create blob URL and download
      const blob = new Blob([response.data], {
        type: contentType,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error) {
      console.error("Export error:", error);
      // For error responses, try to parse as JSON
      if (error.response && error.response.data) {
        try {
          // Try to parse as JSON for error message
          const errorText = await new Response(error.response.data).text();
          const errorJson = JSON.parse(errorText);
          return rejectWithValue(
            errorJson.message || "Failed to export report",
          );
        } catch (e) {
          return rejectWithValue("Failed to export report");
        }
      }
      return rejectWithValue(error.message || "Failed to export report");
    }
  },
);

// ==================== Fetch Employees for Filter ====================
export const fetchEmployeesForFilter = createAsyncThunk(
  "reports/fetchEmployeesForFilter",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/employees", {
        params: {
          per_page: 1000,
          status: "active",
        },
      });

      const employees = response.data?.data?.data || response.data?.data || [];


      return employees.map((emp) => ({
        // Use user_id (which is the actual user ID) for filtering
        id: emp.user_id || emp.id,
        name:
          `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
          emp.name ||
          emp.employee_id,
        employee_id: emp.employee_id,
        user_id: emp.user_id || emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
      }));
    } catch (error) {
      console.error("Error fetching employees:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employees",
      );
    }
  },
);

// ==================== Employee Attendance for Calendar ====================
// reportSlice.js - Fix fetchEmployeeAttendanceForCalendar

export const fetchEmployeeAttendanceForCalendar = createAsyncThunk(
  "reports/fetchEmployeeAttendanceCalendar",
  async ({ employeeId, year, month }, { rejectWithValue }) => {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const params = {
        page: 1,
        per_page: 31,
        date_range: "custom",
        from_date: startDate.toISOString().split("T")[0],
        to_date: endDate.toISOString().split("T")[0],
      };

      if (employeeId) {
        params.employee_id = employeeId;
      }

      const response = await apiClient.get("/admin/reports/attendance", {
        params,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      // Extract data from the nested structure
      const apiData = response.data?.data?.data || [];
      const meta = response.data?.data?.meta || {};

      let attendanceRecords = [];
      if (apiData.length > 0) {
         attendanceRecords = apiData[0].attendance || [];
      }

      // Map the data to include all necessary fields
      const mappedData = attendanceRecords.map((record) => ({
        ...record,
        employeeName: apiData[0]?.name,
        punchIn: record.punch_in,
        punchOut: record.punch_out,
        workedHours: record.worked_hours,
        attendance_status: record.status,
        // Keep original fields for compatibility
        id: apiData[0]?.employee_id,
        name: apiData[0]?.name,
        department: apiData[0]?.department,
        company: apiData[0]?.company,
        date: record.date,
        punch_in: record.punch_in,
        punch_out: record.punch_out,
        working_hours: record.worked_hours,
        status: record.status,
      }));

      return {
        employeeId,
        year,
        month,
        data: mappedData,
        total: meta.total || 0,
      };
    } catch (error) {
      console.error("❌ Error fetching employee calendar:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employee attendance",
      );
    }
  },
);

// ==================== Employee Daily Attendance ====================
export const fetchEmployeeDailyAttendance = createAsyncThunk(
  "reports/fetchEmployeeDailyAttendance",
  async ({ employeeId, date }, { rejectWithValue }) => {
    try {
      const params = {
        page: 1,
        per_page: 1,
        date_range: "custom",
        from_date: date,
        to_date: date,
      };

      // ✅ Use the numeric employee ID
      if (employeeId) {
        params.employee_id = employeeId;
      }


      const response = await apiClient.get("/admin/reports/attendance", {
        params,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      const apiData = response.data?.data?.data || [];
      const employeeData = apiData.length > 0 ? apiData[0] : null;

      if (!employeeData || !employeeData.attendance || employeeData.attendance.length === 0) {
        return {
          employeeId,
          date,
          data: null,
        };
      }
      
      const record = employeeData.attendance[0];

      const mappedRecord = {
        ...record,
        employeeName: employeeData.name,
        punchIn: record.punch_in,
        punchOut: record.punch_out,
        workedHours: record.worked_hours,
        attendance_status: record.status,
        id: employeeData.employee_id,
        name: employeeData.name,
        department: employeeData.department,
        date: record.date,
        punch_in: record.punch_in,
        punch_out: record.punch_out,
        working_hours: record.worked_hours,
        status: record.status,
      };

      return {
        employeeId,
        date,
        data: mappedRecord,
      };
    } catch (error) {
      console.error("Error fetching daily attendance:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch daily attendance",
      );
    }
  },
);
export const fetchEmployeeMonthlyProjectHours = createAsyncThunk(
  "reports/fetchEmployeeMonthlyProjectHours",
  async ({ employeeId, month, year }, { rejectWithValue }) => {
    try {
      const params = {
        month: month,
        year: year,
        employee_id: employeeId,
      };


      const response = await apiClient.get(
        "/admin/project-assignments/monthly-hours",
        {
          params,
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      );

      // The API returns data in the format:
      // { status: "success", message: "Success", data: { employees: [...] } }
      const apiData = response.data?.data || response.data;

      return {
        employeeId,
        month,
        year,
        data: apiData,
      };
    } catch (error) {
      console.error("❌ Error fetching monthly project hours:", error);
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch monthly project hours",
      );
    }
  },
);

// ==================== Employee Daily Project Hours ====================
export const fetchEmployeeDailyProjectHours = createAsyncThunk(
  "reports/fetchEmployeeDailyProjectHours",
  async ({ employeeId, date, year, month }, { rejectWithValue }) => {
    try {
      const params = {
        date: date, // e.g., "2026-09-01"
        year: year,
        employee_id: employeeId,
      };

      const response = await apiClient.get(
        "/admin/project-assignments/monthly-hours",
        {
          params,
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      );

      const apiData = response.data?.data || response.data;

      return {
        employeeId,
        date,
        year,
        month,
        data: apiData,
      };
    } catch (error) {
      console.error("❌ Error fetching daily project hours:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch daily project hours",
      );
    }
  },
);

// ==================== Leaves Report ====================
export const fetchLeavesReport = createAsyncThunk(
  "reports/fetchLeaves",
  async (params, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/reports/leaves", {
        params: {
          page: params.page || 1,
          per_page: params.per_page || 10,
          status: params.status,
          leave_type: params.leave_type,
          start_date: params.start_date,
          end_date: params.end_date,
          search: params.search,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch leaves report",
      );
    }
  },
);

// ==================== Project Report ====================
export const fetchProjectReport = createAsyncThunk(
  "reports/fetchProjectReport",
  async (params, { rejectWithValue }) => {
    try {
      const apiParams = {
        page: params.page || 1,
        per_page: params.per_page || 10,
        date_range: params.date_range || (params.start_date ? "custom" : "all"),
        from_date: params.start_date || params.from_date,
        to_date: params.end_date || params.to_date,
        search: params.search,
        status: params.status !== "all" ? params.status : undefined,
      };

      const response = await apiClient.get("/admin/reports/projects", {
        params: apiParams,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch project report",
      );
    }
  },
);

// ==================== Employees Basic Report ====================
export const fetchEmployeesReport = createAsyncThunk(
  "reports/fetchEmployees",
  async (params, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/reports/employees", {
        params: {
          page: params.page || 1,
          per_page: params.per_page || 10,
          company: params.company,
          department: params.department,
          status: params.status,
          search: params.search,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employees report",
      );
    }
  },
);

// ==================== Employee Details Report ====================
export const fetchEmployeeDetailsReport = createAsyncThunk(
  "reports/fetchEmployeeDetails",
  async (params, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/reports/employees", {
        params: {
          page: params.page || 1,
          per_page: params.per_page || 10,
          company: params.company,
          department: params.department,
          status: params.status,
          search: params.search,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch employee details report",
      );
    }
  },
);

// ==================== Employee Nearest Expiry Report ====================
export const fetchEmployeeNearestExpiryReport = createAsyncThunk(
  "reports/fetchEmployeeNearestExpiry",
  async (params, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        "/admin/reports/employee-nearest-expiry",
        {
          params: {
            page: params.page || 1,
            per_page: params.per_page || 10,
            expiry_days: params.expiry_days || 30,
            company: params.company,
            department: params.department,
            search: params.search,
          },
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch employee nearest expiry report",
      );
    }
  },
);

// ==================== Employee Upcoming Renewals Report ====================
export const fetchEmployeeUpcomingRenewalsReport = createAsyncThunk(
  "reports/fetchEmployeeUpcomingRenewals",
  async (params, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        "/admin/reports/employee-upcoming-renewals",
        {
          params: {
            page: params.page || 1,
            per_page: params.per_page || 10,
            min_days: params.min_days || 31,
            max_days: params.max_days || 90,
            company: params.company,
            department: params.department,
            search: params.search,
          },
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch employee upcoming renewals report",
      );
    }
  },
);

// ==================== Company Nearest Expiry Report ====================
export const fetchCompanyNearestExpiryReport = createAsyncThunk(
  "reports/fetchCompanyNearestExpiry",
  async (params, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        "/admin/reports/company-nearest-expiry",
        {
          params: {
            page: params.page || 1,
            per_page: params.per_page || 10,
            expiry_days: params.expiry_days || 30,
            search: params.search,
          },
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch company nearest expiry report",
      );
    }
  },
);

// ==================== Company Upcoming Renewals Report ====================
export const fetchCompanyUpcomingRenewalsReport = createAsyncThunk(
  "reports/fetchCompanyUpcomingRenewals",
  async (params, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        "/admin/reports/company-upcoming-renewals",
        {
          params: {
            page: params.page || 1,
            per_page: params.per_page || 10,
            min_days: params.min_days || 31,
            max_days: params.max_days || 90,
            search: params.search,
          },
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch company upcoming renewals report",
      );
    }
  },
);

// ==================== Pending Leaves Report ====================
export const fetchPendingLeavesReport = createAsyncThunk(
  "reports/fetchPendingLeaves",
  async (params, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/reports/pending-leaves", {
        params: {
          page: params.page || 1,
          per_page: params.per_page || 10,
          leave_type: params.leave_type,
          start_date: params.start_date,
          end_date: params.end_date,
          search: params.search,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch pending leaves report",
      );
    }
  },
);

// ==================== Update Leave Status (for pending leaves) ====================
export const updateLeaveStatusFromReport = createAsyncThunk(
  "reports/updateLeaveStatus",
  async (
    { id, status, processedBy, rejection_reason },
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.post(
        `/admin/reports/leaves/${id}/update-status`,
        {
          status,
          processed_by: processedBy,
          rejection_reason,
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update leave status",
      );
    }
  },
);

// ==================== Initial State ====================
const initialState = {
  // Attendance Report
  attendanceRecords: [],
  attendanceLoading: false,
  attendanceError: null,
  attendanceTotalCount: 0,
  attendanceCurrentPage: 1,
  attendancePerPage: 10,
  attendanceLastPage: 1,

  employeeAttendanceCalendar: null,
  employeeAttendanceCalendarLoading: false,
  employeeAttendanceCalendarError: null,
  employeeDailyAttendance: null,
  employeeDailyAttendanceLoading: false,
  employeeDailyAttendanceError: null,

  employeeMonthlyProjectHours: null,
  employeeMonthlyProjectHoursLoading: false,
  employeeMonthlyProjectHoursError: null,

  employeeDailyProjectHours: null,
  employeeDailyProjectHoursLoading: false,
  employeeDailyProjectHoursError: null,

  // Employees for filter
  employeesList: [],
  employeesLoading: false,
  employeesError: null,

  // Export state
  exportLoading: false,
  exportError: null,
  exportSuccess: false,

  // Leaves Report
  leaveRecords: [],
  leavesLoading: false,
  leavesError: null,
  leavesTotalCount: 0,
  leavesCurrentPage: 1,
  leavesPerPage: 10,
  leavesLastPage: 1,

  // Reports Counts
  counts: null,
  countsLoading: false,
  countsError: null,

  // Project Report
  projectReportRecords: [],
  projectReportLoading: false,
  projectReportError: null,
  projectReportTotalCount: 0,
  projectReportCurrentPage: 1,
  projectReportPerPage: 10,
  projectReportLastPage: 1,

  // Employees Basic Report
  basicEmployees: [],
  basicEmployeesLoading: false,
  basicEmployeesError: null,
  basicEmployeesTotalCount: 0,
  basicEmployeesCurrentPage: 1,
  basicEmployeesPerPage: 10,
  basicEmployeesLastPage: 1,

  // Employee Details Report
  employeeDetails: [],
  employeeDetailsLoading: false,
  employeeDetailsError: null,
  employeeDetailsTotalCount: 0,
  employeeDetailsCurrentPage: 1,
  employeeDetailsPerPage: 10,
  employeeDetailsLastPage: 1,

  // Employee Nearest Expiry Report
  employeeNearestExpiry: [],
  employeeNearestExpiryLoading: false,
  employeeNearestExpiryError: null,
  employeeNearestExpiryTotalCount: 0,
  employeeNearestExpiryCurrentPage: 1,
  employeeNearestExpiryPerPage: 10,
  employeeNearestExpiryLastPage: 1,

  // Employee Upcoming Renewals Report
  employeeUpcomingRenewals: [],
  employeeUpcomingRenewalsLoading: false,
  employeeUpcomingRenewalsError: null,
  employeeUpcomingRenewalsTotalCount: 0,
  employeeUpcomingRenewalsCurrentPage: 1,
  employeeUpcomingRenewalsPerPage: 10,
  employeeUpcomingRenewalsLastPage: 1,

  // Company Nearest Expiry Report
  companyNearestExpiry: [],
  companyNearestExpiryLoading: false,
  companyNearestExpiryError: null,
  companyNearestExpiryTotalCount: 0,
  companyNearestExpiryCurrentPage: 1,
  companyNearestExpiryPerPage: 10,
  companyNearestExpiryLastPage: 1,

  // Company Upcoming Renewals Report
  companyUpcomingRenewals: [],
  companyUpcomingRenewalsLoading: false,
  companyUpcomingRenewalsError: null,
  companyUpcomingRenewalsTotalCount: 0,
  companyUpcomingRenewalsCurrentPage: 1,
  companyUpcomingRenewalsPerPage: 10,
  companyUpcomingRenewalsLastPage: 1,

  // Pending Leaves Report
  pendingLeaves: [],
  pendingLeavesLoading: false,
  pendingLeavesError: null,
  pendingLeavesTotalCount: 0,
  pendingLeavesCurrentPage: 1,
  pendingLeavesPerPage: 10,
  pendingLeavesLastPage: 1,
};

// ==================== Slice ====================
const reportSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    clearAttendanceError: (state) => {
      state.attendanceError = null;
    },
    clearLeavesError: (state) => {
      state.leavesError = null;
    },
    clearBasicEmployeesError: (state) => {
      state.basicEmployeesError = null;
    },
    clearEmployeeDetailsError: (state) => {
      state.employeeDetailsError = null;
    },
    clearEmployeeNearestExpiryError: (state) => {
      state.employeeNearestExpiryError = null;
    },
    clearEmployeeUpcomingRenewalsError: (state) => {
      state.employeeUpcomingRenewalsError = null;
    },
    clearCompanyNearestExpiryError: (state) => {
      state.companyNearestExpiryError = null;
    },
    clearCompanyUpcomingRenewalsError: (state) => {
      state.companyUpcomingRenewalsError = null;
    },
    clearPendingLeavesError: (state) => {
      state.pendingLeavesError = null;
    },
    resetAllReports: () => {
      return initialState;
    },
    clearAttendanceRecords: (state) => {
      state.attendanceRecords = [];
      state.attendanceTotalCount = 0;
      state.attendanceLastPage = 1;
      state.attendanceCurrentPage = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // ==================== Attendance Report ====================
      // In the extraReducers for fetchAttendanceReport
      .addCase(fetchAttendanceReport.pending, (state) => {
        state.attendanceLoading = true;
        state.attendanceError = null;
        // Clear records when loading to prevent showing stale data
        state.attendanceRecords = [];
        state.attendanceTotalCount = 0;
      })
      .addCase(fetchAttendanceReport.fulfilled, (state, action) => {
        state.attendanceLoading = false;
        const payload = action.payload;
        state.attendanceRecords = payload.data || [];
        state.attendanceTotalCount = payload.total || 0;
        state.attendanceCurrentPage = payload.current_page || 1;
        state.attendancePerPage = payload.per_page || 10;
        state.attendanceLastPage = payload.last_page || 1;
      })
      .addCase(fetchAttendanceReport.rejected, (state, action) => {
        state.attendanceLoading = false;
        state.attendanceError = action.payload;
        state.attendanceRecords = []; // Clear on error too
        state.attendanceTotalCount = 0;
      })

      // Reports Counts
      .addCase(fetchReportCounts.pending, (state) => {
        state.countsLoading = true;
        state.countsError = null;
      })
      .addCase(fetchReportCounts.fulfilled, (state, action) => {
        state.countsLoading = false;
        
        const payload = action.payload;
        let countsList = null;
        
        // Find if there is an array in payload
        if (Array.isArray(payload)) {
          countsList = payload;
        } else if (Array.isArray(payload?.data)) {
          countsList = payload.data;
        } else if (Array.isArray(payload?.counts)) {
          countsList = payload.counts;
        } else if (Array.isArray(payload?.data?.counts)) {
          countsList = payload.data.counts;
        }
        
        if (countsList) {
          const countsObj = {};
          countsList.forEach((item) => {
            const k = item?.key || item?.id;
            if (k !== undefined) {
              countsObj[k] = item.count !== undefined ? item.count : 0;
            }
          });
          state.counts = countsObj;
        } else {
          // If it is not an array, it is a direct object
          const rawObj = payload?.data || payload;
          const countsObj = {};
          
          if (rawObj && typeof rawObj === "object") {
            const innerObj = rawObj.counts || rawObj;
            Object.keys(innerObj).forEach((key) => {
              const val = innerObj[key];
              if (val !== null && typeof val === "object" && val.count !== undefined) {
                countsObj[key] = val.count;
              } else {
                countsObj[key] = val;
              }
            });
            state.counts = countsObj;
          } else {
            state.counts = {};
          }
        }
      })
      .addCase(fetchReportCounts.rejected, (state, action) => {
        state.countsLoading = false;
        state.countsError = action.payload;
      })

      // ==================== Export Report ====================
      .addCase(exportReport.pending, (state) => {
        state.exportLoading = true;
        state.exportError = null;
        state.exportSuccess = false;
      })
      .addCase(exportReport.fulfilled, (state, action) => {
        state.exportLoading = false;
        state.exportSuccess = true;
        state.exportError = null;
      })
      .addCase(exportReport.rejected, (state, action) => {
        state.exportLoading = false;
        state.exportError = action.payload || "Export failed";
        state.exportSuccess = false;
      })

      // ==================== Fetch Employees for Filter ====================
      .addCase(fetchEmployeesForFilter.pending, (state) => {
        state.employeesLoading = true;
        state.employeesError = null;
      })
      .addCase(fetchEmployeesForFilter.fulfilled, (state, action) => {
        state.employeesLoading = false;
        state.employeesList = action.payload || [];
      })
      .addCase(fetchEmployeesForFilter.rejected, (state, action) => {
        state.employeesLoading = false;
        state.employeesError = action.payload;
      })

      .addCase(fetchEmployeeAttendanceForCalendar.pending, (state) => {
        state.employeeAttendanceCalendarLoading = true;
        state.employeeAttendanceCalendarError = null;
      })
      .addCase(
        fetchEmployeeAttendanceForCalendar.fulfilled,
        (state, action) => {
          state.employeeAttendanceCalendarLoading = false;
          state.employeeAttendanceCalendar = action.payload;
        },
      )
      .addCase(fetchEmployeeAttendanceForCalendar.rejected, (state, action) => {
        state.employeeAttendanceCalendarLoading = false;
        state.employeeAttendanceCalendarError = action.payload;
      })

      // Employee Daily Attendance
      .addCase(fetchEmployeeDailyAttendance.pending, (state) => {
        state.employeeDailyAttendanceLoading = true;
        state.employeeDailyAttendanceError = null;
      })
      .addCase(fetchEmployeeDailyAttendance.fulfilled, (state, action) => {
        state.employeeDailyAttendanceLoading = false;
        state.employeeDailyAttendance = action.payload;
      })
      .addCase(fetchEmployeeDailyAttendance.rejected, (state, action) => {
        state.employeeDailyAttendanceLoading = false;
        state.employeeDailyAttendanceError = action.payload;
      })

      // Monthly Project Hours
      .addCase(fetchEmployeeMonthlyProjectHours.pending, (state) => {
        state.employeeMonthlyProjectHoursLoading = true;
        state.employeeMonthlyProjectHoursError = null;
      })
      .addCase(fetchEmployeeMonthlyProjectHours.fulfilled, (state, action) => {
        state.employeeMonthlyProjectHoursLoading = false;
        state.employeeMonthlyProjectHours = action.payload;
      })
      .addCase(fetchEmployeeMonthlyProjectHours.rejected, (state, action) => {
        state.employeeMonthlyProjectHoursLoading = false;
        state.employeeMonthlyProjectHoursError = action.payload;
      })

      // Daily Project Hours
      .addCase(fetchEmployeeDailyProjectHours.pending, (state) => {
        state.employeeDailyProjectHoursLoading = true;
        state.employeeDailyProjectHoursError = null;
      })
      .addCase(fetchEmployeeDailyProjectHours.fulfilled, (state, action) => {
        state.employeeDailyProjectHoursLoading = false;
        state.employeeDailyProjectHours = action.payload;
      })
      .addCase(fetchEmployeeDailyProjectHours.rejected, (state, action) => {
        state.employeeDailyProjectHoursLoading = false;
        state.employeeDailyProjectHoursError = action.payload;
      })

      // ==================== Leaves Report ====================
      .addCase(fetchLeavesReport.pending, (state) => {
        state.leavesLoading = true;
        state.leavesError = null;
      })
      .addCase(fetchLeavesReport.fulfilled, (state, action) => {
        state.leavesLoading = false;
        const responseData = action.payload?.data || action.payload;
        state.leaveRecords = responseData?.data || responseData || [];
        state.leavesTotalCount = responseData?.total || 0;
        state.leavesCurrentPage = responseData?.current_page || 1;
        state.leavesPerPage = responseData?.per_page || 10;
        state.leavesLastPage = responseData?.last_page || 1;
      })
      .addCase(fetchLeavesReport.rejected, (state, action) => {
        state.leavesLoading = false;
        state.leavesError = action.payload;
      })

      // ==================== Project Report ====================
      .addCase(fetchProjectReport.pending, (state) => {
        state.projectReportLoading = true;
        state.projectReportError = null;
      })
      .addCase(fetchProjectReport.fulfilled, (state, action) => {
        state.projectReportLoading = false;
        const responseData = action.payload?.data || action.payload;
        state.projectReportRecords = responseData?.data || responseData || [];
        state.projectReportTotalCount = responseData?.total || 0;
        state.projectReportCurrentPage = responseData?.current_page || 1;
        state.projectReportPerPage = responseData?.per_page || 10;
        state.projectReportLastPage = responseData?.last_page || 1;
      })
      .addCase(fetchProjectReport.rejected, (state, action) => {
        state.projectReportLoading = false;
        state.projectReportError = action.payload;
      })

      // ==================== Employees Basic Report ====================
      .addCase(fetchEmployeesReport.pending, (state) => {
        state.basicEmployeesLoading = true;
        state.basicEmployeesError = null;
      })
      .addCase(fetchEmployeesReport.fulfilled, (state, action) => {
        state.basicEmployeesLoading = false;
        const responseData = action.payload?.data || action.payload;
        state.basicEmployees = responseData?.data || responseData || [];
        state.basicEmployeesTotalCount = responseData?.total || 0;
        state.basicEmployeesCurrentPage = responseData?.current_page || 1;
        state.basicEmployeesPerPage = responseData?.per_page || 10;
        state.basicEmployeesLastPage = responseData?.last_page || 1;
      })
      .addCase(fetchEmployeesReport.rejected, (state, action) => {
        state.basicEmployeesLoading = false;
        state.basicEmployeesError = action.payload;
      })

      // ==================== Employee Details Report ====================
      .addCase(fetchEmployeeDetailsReport.pending, (state) => {
        state.employeeDetailsLoading = true;
        state.employeeDetailsError = null;
      })
      .addCase(fetchEmployeeDetailsReport.fulfilled, (state, action) => {
        state.employeeDetailsLoading = false;
        
        
        const responseData = action.payload?.data || action.payload;
        
        let finalData = [];
        if (responseData?.employees && Array.isArray(responseData.employees)) {
          finalData = responseData.employees;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          finalData = responseData.data;
        } else if (Array.isArray(responseData)) {
          finalData = responseData;
        } else if (typeof responseData === 'object' && responseData !== null) {
           const arrayProp = Object.values(responseData).find((val) => Array.isArray(val));
           if (arrayProp) finalData = arrayProp;
           else finalData = Object.values(responseData).filter(v => v && typeof v === 'object');
        }
        
        state.employeeDetails = finalData;
        state.employeeDetailsTotalCount = responseData?.total || finalData.length;
        state.employeeDetailsCurrentPage = responseData?.current_page || 1;
        state.employeeDetailsPerPage = responseData?.per_page || 10;
        state.employeeDetailsLastPage = responseData?.last_page || 1;
      })
      .addCase(fetchEmployeeDetailsReport.rejected, (state, action) => {
        state.employeeDetailsLoading = false;
        state.employeeDetailsError = action.payload;
      })

      // ==================== Employee Nearest Expiry Report ====================
      .addCase(fetchEmployeeNearestExpiryReport.pending, (state) => {
        state.employeeNearestExpiryLoading = true;
        state.employeeNearestExpiryError = null;
      })
      .addCase(fetchEmployeeNearestExpiryReport.fulfilled, (state, action) => {
        state.employeeNearestExpiryLoading = false;
        
        
        const responseData = action.payload?.data || action.payload;
        
        let finalData = [];
        if (responseData?.employees && Array.isArray(responseData.employees)) {
          finalData = responseData.employees;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          finalData = responseData.data;
        } else if (Array.isArray(responseData)) {
          finalData = responseData;
        } else if (typeof responseData === 'object' && responseData !== null) {
           const arrayProp = Object.values(responseData).find((val) => Array.isArray(val));
           if (arrayProp) finalData = arrayProp;
           else finalData = Object.values(responseData).filter(v => v && typeof v === 'object');
        }
        
        state.employeeNearestExpiry = finalData;
        state.employeeNearestExpiryTotalCount = responseData?.total || finalData.length;
        state.employeeNearestExpiryCurrentPage =
          responseData?.current_page || 1;
        state.employeeNearestExpiryPerPage = responseData?.per_page || 10;
        state.employeeNearestExpiryLastPage = responseData?.last_page || 1;
      })
      .addCase(fetchEmployeeNearestExpiryReport.rejected, (state, action) => {
        state.employeeNearestExpiryLoading = false;
        state.employeeNearestExpiryError = action.payload;
      })

      // ==================== Employee Upcoming Renewals Report ====================
      .addCase(fetchEmployeeUpcomingRenewalsReport.pending, (state) => {
        state.employeeUpcomingRenewalsLoading = true;
        state.employeeUpcomingRenewalsError = null;
      })
      .addCase(
        fetchEmployeeUpcomingRenewalsReport.fulfilled,
        (state, action) => {
          state.employeeUpcomingRenewalsLoading = false;
          const responseData = action.payload?.data || action.payload;
          
          let finalData = [];
          if (responseData?.employees && Array.isArray(responseData.employees)) {
            finalData = responseData.employees;
          } else if (responseData?.data && Array.isArray(responseData.data)) {
            finalData = responseData.data;
          } else if (Array.isArray(responseData)) {
            finalData = responseData;
          } else if (typeof responseData === 'object' && responseData !== null) {
             const arrayProp = Object.values(responseData).find((val) => Array.isArray(val));
             if (arrayProp) finalData = arrayProp;
             else finalData = Object.values(responseData).filter(v => v && typeof v === 'object');
          }
          
          state.employeeUpcomingRenewals = finalData;
          state.employeeUpcomingRenewalsTotalCount = responseData?.total || finalData.length;
          state.employeeUpcomingRenewalsCurrentPage =
            responseData?.current_page || 1;
          state.employeeUpcomingRenewalsPerPage = responseData?.per_page || 10;
          state.employeeUpcomingRenewalsLastPage = responseData?.last_page || 1;
        },
      )
      .addCase(
        fetchEmployeeUpcomingRenewalsReport.rejected,
        (state, action) => {
          state.employeeUpcomingRenewalsLoading = false;
          state.employeeUpcomingRenewalsError = action.payload;
        },
      )

      // ==================== Company Nearest Expiry Report ====================
      .addCase(fetchCompanyNearestExpiryReport.pending, (state) => {
        state.companyNearestExpiryLoading = true;
        state.companyNearestExpiryError = null;
      })
      .addCase(fetchCompanyNearestExpiryReport.fulfilled, (state, action) => {
        state.companyNearestExpiryLoading = false;
        const responseData = action.payload?.data || action.payload;
        
        let finalData = [];
        if (responseData?.companies && Array.isArray(responseData.companies)) {
          finalData = responseData.companies;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          finalData = responseData.data;
        } else if (Array.isArray(responseData)) {
          finalData = responseData;
        } else if (typeof responseData === 'object' && responseData !== null) {
           const arrayProp = Object.values(responseData).find((val) => Array.isArray(val));
           if (arrayProp) finalData = arrayProp;
           else finalData = Object.values(responseData).filter(v => v && typeof v === 'object');
        }
        
        state.companyNearestExpiry = finalData;
        state.companyNearestExpiryTotalCount = responseData?.total || finalData.length;
        state.companyNearestExpiryCurrentPage = responseData?.current_page || 1;
        state.companyNearestExpiryPerPage = responseData?.per_page || 10;
        state.companyNearestExpiryLastPage = responseData?.last_page || 1;
      })
      .addCase(fetchCompanyNearestExpiryReport.rejected, (state, action) => {
        state.companyNearestExpiryLoading = false;
        state.companyNearestExpiryError = action.payload;
      })

      // ==================== Company Upcoming Renewals Report ====================
      .addCase(fetchCompanyUpcomingRenewalsReport.pending, (state) => {
        state.companyUpcomingRenewalsLoading = true;
        state.companyUpcomingRenewalsError = null;
      })
      .addCase(
        fetchCompanyUpcomingRenewalsReport.fulfilled,
        (state, action) => {
          state.companyUpcomingRenewalsLoading = false;
          const responseData = action.payload?.data || action.payload;
          
          let finalData = [];
          if (responseData?.companies && Array.isArray(responseData.companies)) {
            finalData = responseData.companies;
          } else if (responseData?.data && Array.isArray(responseData.data)) {
            finalData = responseData.data;
          } else if (Array.isArray(responseData)) {
            finalData = responseData;
          } else if (typeof responseData === 'object' && responseData !== null) {
             const arrayProp = Object.values(responseData).find((val) => Array.isArray(val));
             if (arrayProp) finalData = arrayProp;
             else finalData = Object.values(responseData).filter(v => v && typeof v === 'object');
          }
          
          state.companyUpcomingRenewals = finalData;
          state.companyUpcomingRenewalsTotalCount = responseData?.total || finalData.length;
          state.companyUpcomingRenewalsCurrentPage =
            responseData?.current_page || 1;
          state.companyUpcomingRenewalsPerPage = responseData?.per_page || 10;
          state.companyUpcomingRenewalsLastPage = responseData?.last_page || 1;
        },
      )
      .addCase(fetchCompanyUpcomingRenewalsReport.rejected, (state, action) => {
        state.companyUpcomingRenewalsLoading = false;
        state.companyUpcomingRenewalsError = action.payload;
      })

      // ==================== Pending Leaves Report ====================
      .addCase(fetchPendingLeavesReport.pending, (state) => {
        state.pendingLeavesLoading = true;
        state.pendingLeavesError = null;
      })
      .addCase(fetchPendingLeavesReport.fulfilled, (state, action) => {
        state.pendingLeavesLoading = false;
        
        const payload = action.payload;
        let leavesList = [];
        let total = 0;
        let currentPage = 1;
        let perPage = 10;
        let lastPage = 1;
        
        const dataObj = payload?.data || payload;
        
        if (dataObj) {
          if (Array.isArray(dataObj.leaves)) {
            leavesList = dataObj.leaves;
            total = dataObj.total || leavesList.length;
            currentPage = dataObj.current_page || 1;
            perPage = dataObj.per_page || 10;
            lastPage = dataObj.last_page || 1;
          } else if (Array.isArray(dataObj.data)) {
            leavesList = dataObj.data;
            total = dataObj.total || leavesList.length;
            currentPage = dataObj.current_page || 1;
            perPage = dataObj.per_page || 10;
            lastPage = dataObj.last_page || 1;
          } else if (Array.isArray(dataObj)) {
            leavesList = dataObj;
            total = leavesList.length;
          } else if (typeof dataObj === "object") {
            // Check if there is a leaves property that is an object (associative array)
            if (dataObj.leaves && typeof dataObj.leaves === "object" && !Array.isArray(dataObj.leaves)) {
              leavesList = Object.values(dataObj.leaves);
              total = dataObj.total || leavesList.length;
              currentPage = dataObj.current_page || 1;
              perPage = dataObj.per_page || 10;
              lastPage = dataObj.last_page || 1;
            } else {
              const arrayProp = Object.values(dataObj).find((val) => Array.isArray(val));
              if (arrayProp) {
                leavesList = arrayProp;
                total = dataObj.total || leavesList.length;
              } else {
                leavesList = Object.values(dataObj).filter(
                  (val) => val && typeof val === "object"
                );
                total = leavesList.length;
              }
            }
          }
        }
        
        state.pendingLeaves = leavesList;
        state.pendingLeavesTotalCount = total;
        state.pendingLeavesCurrentPage = currentPage;
        state.pendingLeavesPerPage = perPage;
        state.pendingLeavesLastPage = lastPage;
      })
      .addCase(fetchPendingLeavesReport.rejected, (state, action) => {
        state.pendingLeavesLoading = false;
        state.pendingLeavesError = action.payload;
      })

      // ==================== Update Leave Status ====================
      .addCase(updateLeaveStatusFromReport.fulfilled, (state, action) => {
        // Remove the updated leave from pending leaves list
        const updatedLeaveId = action.meta.arg.id;
        state.pendingLeaves = state.pendingLeaves.filter(
          (leave) => leave.id !== updatedLeaveId,
        );
        state.pendingLeavesTotalCount = Math.max(
          0,
          state.pendingLeavesTotalCount - 1,
        );
      });
  },
});

// ==================== Export Actions ====================
export const {
  clearAttendanceError,
  clearLeavesError,
  clearBasicEmployeesError,
  clearEmployeeDetailsError,
  clearEmployeeNearestExpiryError,
  clearEmployeeUpcomingRenewalsError,
  clearCompanyNearestExpiryError,
  clearCompanyUpcomingRenewalsError,
  clearPendingLeavesError,
  resetAllReports,
} = reportSlice.actions;

// ==================== Export Selectors ====================
// Attendance Selectors
export const selectAttendanceRecords = (state) =>
  state.reports.attendanceRecords;
export const selectAttendanceLoading = (state) =>
  state.reports.attendanceLoading;
export const selectAttendanceError = (state) => state.reports.attendanceError;
export const selectAttendancePagination = createSelector(
  [(state) => state.reports.attendanceTotalCount,
   (state) => state.reports.attendanceCurrentPage,
   (state) => state.reports.attendancePerPage,
   (state) => state.reports.attendanceLastPage],
  (total, currentPage, perPage, lastPage) => ({ total, currentPage, perPage, lastPage })
);

// Leaves Report Selectors
export const selectLeaveRecords = (state) => state.reports.leaveRecords;
export const selectLeavesLoading = (state) => state.reports.leavesLoading;
export const selectLeavesError = (state) => state.reports.leavesError;
export const selectLeavesPagination = createSelector(
  [(state) => state.reports.leavesTotalCount,
   (state) => state.reports.leavesCurrentPage,
   (state) => state.reports.leavesPerPage,
   (state) => state.reports.leavesLastPage],
  (total, currentPage, perPage, lastPage) => ({ total, currentPage, perPage, lastPage })
);

// Project Report Selectors
export const selectProjectReportRecords = (state) => state.reports.projectReportRecords;
export const selectProjectReportLoading = (state) => state.reports.projectReportLoading;
export const selectProjectReportError = (state) => state.reports.projectReportError;
export const selectProjectReportPagination = createSelector(
  [(state) => state.reports.projectReportTotalCount,
   (state) => state.reports.projectReportCurrentPage,
   (state) => state.reports.projectReportPerPage,
   (state) => state.reports.projectReportLastPage],
  (total, currentPage, perPage, lastPage) => ({ total, currentPage, perPage, lastPage })
);

// Employee Details Selectors
export const selectEmployeeDetails = (state) => state.reports.employeeDetails;
export const selectEmployeeDetailsLoading = (state) =>
  state.reports.employeeDetailsLoading;
export const selectEmployeeDetailsError = (state) =>
  state.reports.employeeDetailsError;
export const selectEmployeeDetailsPagination = createSelector(
  [(state) => state.reports.employeeDetailsTotalCount,
   (state) => state.reports.employeeDetailsCurrentPage,
   (state) => state.reports.employeeDetailsPerPage,
   (state) => state.reports.employeeDetailsLastPage],
  (total, currentPage, perPage, lastPage) => ({ total, currentPage, perPage, lastPage })
);

// Employee Nearest Expiry Selectors
export const selectEmployeeNearestExpiry = (state) =>
  state.reports.employeeNearestExpiry;
export const selectEmployeeNearestExpiryLoading = (state) =>
  state.reports.employeeNearestExpiryLoading;
export const selectEmployeeNearestExpiryError = (state) =>
  state.reports.employeeNearestExpiryError;
export const selectEmployeeNearestExpiryPagination = createSelector(
  [(state) => state.reports.employeeNearestExpiryTotalCount,
   (state) => state.reports.employeeNearestExpiryCurrentPage,
   (state) => state.reports.employeeNearestExpiryPerPage,
   (state) => state.reports.employeeNearestExpiryLastPage],
  (total, currentPage, perPage, lastPage) => ({ total, currentPage, perPage, lastPage })
);

// Employee Upcoming Renewals Selectors
export const selectEmployeeUpcomingRenewals = (state) =>
  state.reports.employeeUpcomingRenewals;
export const selectEmployeeUpcomingRenewalsLoading = (state) =>
  state.reports.employeeUpcomingRenewalsLoading;
export const selectEmployeeUpcomingRenewalsError = (state) =>
  state.reports.employeeUpcomingRenewalsError;
export const selectEmployeeUpcomingRenewalsPagination = createSelector(
  [(state) => state.reports.employeeUpcomingRenewalsTotalCount,
   (state) => state.reports.employeeUpcomingRenewalsCurrentPage,
   (state) => state.reports.employeeUpcomingRenewalsPerPage,
   (state) => state.reports.employeeUpcomingRenewalsLastPage],
  (total, currentPage, perPage, lastPage) => ({ total, currentPage, perPage, lastPage })
);

// Company Nearest Expiry Selectors
export const selectCompanyNearestExpiry = (state) =>
  state.reports.companyNearestExpiry;
export const selectCompanyNearestExpiryLoading = (state) =>
  state.reports.companyNearestExpiryLoading;
export const selectCompanyNearestExpiryError = (state) =>
  state.reports.companyNearestExpiryError;
export const selectCompanyNearestExpiryPagination = createSelector(
  [(state) => state.reports.companyNearestExpiryTotalCount,
   (state) => state.reports.companyNearestExpiryCurrentPage,
   (state) => state.reports.companyNearestExpiryPerPage,
   (state) => state.reports.companyNearestExpiryLastPage],
  (total, currentPage, perPage, lastPage) => ({ total, currentPage, perPage, lastPage })
);

// Company Upcoming Renewals Selectors
export const selectCompanyUpcomingRenewals = (state) =>
  state.reports.companyUpcomingRenewals;
export const selectCompanyUpcomingRenewalsLoading = (state) =>
  state.reports.companyUpcomingRenewalsLoading;
export const selectCompanyUpcomingRenewalsError = (state) =>
  state.reports.companyUpcomingRenewalsError;
export const selectCompanyUpcomingRenewalsPagination = createSelector(
  [(state) => state.reports.companyUpcomingRenewalsTotalCount,
   (state) => state.reports.companyUpcomingRenewalsCurrentPage,
   (state) => state.reports.companyUpcomingRenewalsPerPage,
   (state) => state.reports.companyUpcomingRenewalsLastPage],
  (total, currentPage, perPage, lastPage) => ({ total, currentPage, perPage, lastPage })
);

// Pending Leaves Selectors
export const selectPendingLeaves = (state) => state.reports.pendingLeaves;
export const selectPendingLeavesLoading = (state) =>
  state.reports.pendingLeavesLoading;
export const selectPendingLeavesError = (state) =>
  state.reports.pendingLeavesError;
export const selectPendingLeavesPagination = createSelector(
  [(state) => state.reports.pendingLeavesTotalCount,
   (state) => state.reports.pendingLeavesCurrentPage,
   (state) => state.reports.pendingLeavesPerPage,
   (state) => state.reports.pendingLeavesLastPage],
  (total, currentPage, perPage, lastPage) => ({ total, currentPage, perPage, lastPage })
);

// Report Counts Selectors
export const selectReportCounts = (state) => state.reports.counts;
export const selectReportCountsLoading = (state) => state.reports.countsLoading;
export const selectReportCountsError = (state) => state.reports.countsError;

// Export Selectors
export const selectExportLoading = (state) => state.reports.exportLoading;
export const selectExportError = (state) => state.reports.exportError;
export const selectExportSuccess = (state) => state.reports.exportSuccess;

export default reportSlice.reducer;
