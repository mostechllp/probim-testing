// src/admin/store/slices/payrollSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

// ─── Fetch Payroll List ────────────────────────────────────────────────
export const fetchPayrolls = createAsyncThunk(
  "payroll/fetchPayrolls",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/payroll", { params });
      console.log("Fetch payrolls response:", response.data);

      const responseData = response.data;

      if (responseData?.data && Array.isArray(responseData.data)) {
        return {
          payrolls: responseData.data,
          total: responseData.total || responseData.data.length,
          current_page: responseData.current_page || 1,
          last_page: responseData.last_page || 1,
          per_page: responseData.per_page || 15,
          stats: responseData.stats || null,
        };
      }

      if (Array.isArray(responseData)) {
        return {
          payrolls: responseData,
          total: responseData.length,
          current_page: 1,
          last_page: 1,
          per_page: 15,
          stats: null,
        };
      }

      return {
        payrolls: responseData?.data || [],
        total: responseData?.total || 0,
        current_page: responseData?.current_page || 1,
        last_page: responseData?.last_page || 1,
        per_page: responseData?.per_page || 15,
        stats: responseData?.stats || null,
      };
    } catch (error) {
      console.error("Fetch payrolls error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch payrolls",
      );
    }
  },
);

// ─── Delete Payroll ────────────────────────────────────────────────────
export const deletePayroll = createAsyncThunk(
  "payroll/deletePayroll",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/admin/payroll/${id}`);
      console.log("Delete payroll response:", response.data);

      if (response.data?.success === true) {
        return id;
      }
      return rejectWithValue(
        response.data?.message || "Failed to delete payroll",
      );
    } catch (error) {
      console.error("Delete payroll error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete payroll",
      );
    }
  },
);

// ─── Generate Payslip ──────────────────────────────────────────────────
// ─── Generate Payslip ──────────────────────────────────────────────────
import { saveAs } from 'file-saver';

export const generatePayslip = createAsyncThunk(
  "payroll/generatePayslip",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        `/admin/payroll/${id}/download`,
        {
          responseType: "blob",
        }
      );

      console.log("Generate payslip response:", response);

      const blob = response.data;

      // Get filename from backend Content-Disposition header
      const contentDisposition = response.headers["content-disposition"];
      let filename = "payslip.pdf";

      if (contentDisposition) {
        const match = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );

        if (match?.[1]) {
          filename = match[1].replace(/['"]/g, "");
        }
      }

      console.log("Backend filename:", filename);

      // Download using backend filename
      saveAs(blob, filename);

      return {
        success: true,
        filename,
      };
    } catch (error) {
      console.error("Generate payslip error:", error);

      // Extract error message from the response
      let errorMessage = "Failed to generate payslip";

      if (error.response) {
        // If the error response is a blob (PDF error page)
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            // Try to parse as JSON
            try {
              const parsed = JSON.parse(text);
              errorMessage = parsed.message || parsed.error || text;
            } catch {
              // If not JSON, use the text directly
              errorMessage = text || errorMessage;
            }
          } catch {
            errorMessage = "Failed to generate payslip";
          }
        } else if (error.response.data) {
          // If it's a regular JSON response
          if (typeof error.response.data === 'object') {
            errorMessage = error.response.data.message || 
                          error.response.data.error || 
                          errorMessage;
          } else {
            errorMessage = error.response.data || errorMessage;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Fetch Payroll by ID ──────────────────────────────────────────────
// ─── Fetch Payroll by ID ──────────────────────────────────────────────
export const fetchPayrollById = createAsyncThunk(
  "payroll/fetchPayrollById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/admin/payroll/${id}`);
      console.log("Fetch payroll by ID response:", response.data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Fetch payroll by ID error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch payroll",
      );
    }
  },
);

// ─── Fetch Draft Payroll ──────────────────────────────────────────────
export const fetchDraftPayroll = createAsyncThunk(
  "payroll/fetchDraft",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/admin/payroll/draft/${userId}`);
      console.log("Fetch draft payroll response:", response.data);

      if (response.data?.success === true) {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to fetch draft payroll",
      );
    } catch (error) {
      console.error("Fetch draft payroll error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch draft payroll",
      );
    }
  },
);

// ─── Save Payroll Step ────────────────────────────────────────────────
export const savePayrollStep = createAsyncThunk(
  "payroll/saveStep",
  async ({ userId, step, stepData }, { rejectWithValue }) => {
    try {
      console.log("API CALL savePayrollStep payload:", {
        userId,
        step,
        stepData,
      });
      const response = await apiClient.post("/admin/payroll/save-step", {
        user_id: userId,
        step: step,
        step_data: stepData,
      });
      console.log("Save payroll step response:", response.data);

      if (response.data?.success === true) {
        return {
          step,
          stepData,
          message: response.data.message,
          data: response.data.data,
        };
      }
      return rejectWithValue(
        response.data?.message || "Failed to save step data",
      );
    } catch (error) {
      console.error("Save payroll step error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to save step data",
      );
    }
  },
);

// ─── Submit Payroll ────────────────────────────────────────────────────
// ─── Submit Payroll ────────────────────────────────────────────────────
export const submitPayroll = createAsyncThunk(
  "payroll/submit",
  async (payload, { rejectWithValue }) => {
    try {
      // Validate required fields before sending
      const requiredFields = [
        "user_id",
        "pay_period_month",
        "pay_period_year",
        "gross_salary",
        "overtime",
        "deductions",
        "net_pay",
        "currency",
      ];

      const missingFields = requiredFields.filter(
        (field) =>
          payload[field] === undefined ||
          payload[field] === null ||
          payload[field] === "",
      );

      if (missingFields.length > 0) {
        return rejectWithValue(
          `Missing required fields: ${missingFields.join(", ")}`,
        );
      }

      // Ensure numeric values are properly formatted
      const formattedPayload = {
        ...payload,
        gross_salary: parseFloat(payload.gross_salary) || 0,
        overtime: parseFloat(payload.overtime) || 0,
        deductions: parseFloat(payload.deductions) || 0,
        net_pay: parseFloat(payload.net_pay) || 0,
        pay_period_month: parseInt(payload.pay_period_month),
        pay_period_year: parseInt(payload.pay_period_year),
        user_id: parseInt(payload.user_id),
      };

      console.log(
        "Submitting payroll with formatted payload:",
        formattedPayload,
      );

      const response = await apiClient.post(
        "/admin/payroll/submit",
        formattedPayload,
      );
      console.log("Submit payroll response:", response.data);

      if (response.data?.success === true) {
        return response.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to submit payroll",
      );
    } catch (error) {
      console.error("Submit payroll error:", error);
      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors)
          .flat()
          .join(", ");
        return rejectWithValue(errorMessages);
      }
      return rejectWithValue(
        error.response?.data?.message || "Failed to submit payroll",
      );
    }
  },
);

// ─── Convert Salary (Currency Conversion) ─────────────────────────────
export const convertSalary = createAsyncThunk(
  "payroll/convertSalary",
  async (
    { userId, payPeriodMonth, payPeriodYear, targetCurrency, conversionRates },
    { rejectWithValue },
  ) => {
    try {
      // Validate input
      if (!userId) {
        return rejectWithValue("User ID is required");
      }
      if (!payPeriodMonth || !payPeriodYear) {
        return rejectWithValue("Pay period month and year are required");
      }
      if (!targetCurrency) {
        return rejectWithValue("Target currency is required");
      }
      if (!conversionRates || conversionRates.length === 0) {
        return rejectWithValue("At least one conversion rate is required");
      }

      const payload = {
        user_id: parseInt(userId),
        pay_period_month: parseInt(payPeriodMonth),
        pay_period_year: parseInt(payPeriodYear),
        target_currency: targetCurrency,
        conversion_rates: conversionRates.map((rate) => ({
          from_currency: rate.currency,
          rate: parseFloat(rate.rate) || 1,
        })),
      };

      console.log("Convert salary payload:", payload);

      const response = await apiClient.post(
        "/admin/payroll/convert-salary",
        payload,
      );
      console.log("Convert salary response:", response.data);

      if (response.data?.success) {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to convert salary",
      );
    } catch (error) {
      console.error("Convert salary error:", error);
      if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors)
          .flat()
          .join(", ");
        return rejectWithValue(errorMessages);
      }
      return rejectWithValue(
        error.response?.data?.message || "Failed to convert salary",
      );
    }
  },
);

// ─── Fetch Payroll History ────────────────────────────────────────────
export const fetchPayrollHistory = createAsyncThunk(
  "payroll/fetchHistory",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/payroll/history", {
        params,
      });
      console.log("Fetch payroll history response:", response.data);

      if (response.data?.success === true) {
        return response.data.data || [];
      }
      return rejectWithValue(
        response.data?.message || "Failed to fetch payroll history",
      );
    } catch (error) {
      console.error("Fetch payroll history error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch payroll history",
      );
    }
  },
);

export const fetchWorkingDays = createAsyncThunk(
  "payroll/fetchWorkingDays",
  async ({ employeeId, month }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/payroll/working-days", {
        params: {
          employee_id: employeeId,
          month: month,
        },
      });
      console.log("Fetch working days response:", response.data);

      if (response.data?.success) {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to fetch working days",
      );
    } catch (error) {
      console.error("Fetch working days error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch working days",
      );
    }
  },
);

// ─── Save Draft Payroll ────────────────────────────────────────────────
export const saveDraftPayroll = createAsyncThunk(
  "payroll/saveDraft",
  async (payrollData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        "/admin/payroll/draft",
        payrollData,
      );
      console.log("Save draft payroll response:", response.data);

      if (response.data?.success === true) {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to save draft");
    } catch (error) {
      console.error("Save draft payroll error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to save draft",
      );
    }
  },
);

// ─── Get Payroll Stats ────────────────────────────────────────────────
export const fetchPayrollStats = createAsyncThunk(
  "payroll/fetchStats",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/payroll/stats", { params });
      console.log("Fetch payroll stats response:", response.data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Fetch payroll stats error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch payroll stats",
      );
    }
  },
);

// ─── Update Payroll Status ─────────────────────────────────────────────
export const updatePayrollStatus = createAsyncThunk(
  "payroll/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/admin/payrolls/${id}/status`, {
        status,
      });
      console.log("Update payroll status response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Update payroll status error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to update payroll status",
      );
    }
  },
);

// ─── Export Payroll Data ───────────────────────────────────────────────
export const exportPayrolls = createAsyncThunk(
  "payroll/export",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/payrolls/export", {
        params,
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      console.error("Export payrolls error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to export payrolls",
      );
    }
  },
);

// ─── Calculate Salary Split (Step 2) ────────────────────────────────
export const calculateSalarySplit = createAsyncThunk(
  "payroll/calculateSalarySplit",
  async ({ employeeId, userId, month }, { rejectWithValue }) => {
    try {
      const payload = {
        employee_id: employeeId || userId,
        month: month,
      };

      const response = await apiClient.post(
        "/admin/payroll/calculate",
        payload,
      );
      console.log("Calculate salary split response:", response.data);

      if (response.data?.success) {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to calculate salary split",
      );
    } catch (error) {
      console.error("Calculate salary split error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to calculate salary split",
      );
    }
  },
);

// ─── Fetch Overtime Data (Step 3) ───────────────────────────────────
// ─── Fetch Overtime Data (Step 3) ───────────────────────────────────
export const fetchOvertimeData = createAsyncThunk(
  "payroll/fetchOvertimeData",
  async ({ employeeId, userId, month }, { rejectWithValue }) => {
    try {
      const payload = {
        employee_id: employeeId || userId,
        month: month,
      };

      const response = await apiClient.post("/admin/payroll/overtime", payload);
      console.log("Fetch overtime data response:", response.data);

      if (response.data?.success) {
        // The API returns data directly as an array
        return response.data.data || [];
      }
      return rejectWithValue(
        response.data?.message || "Failed to fetch overtime data",
      );
    } catch (error) {
      console.error("Fetch overtime data error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch overtime data",
      );
    }
  },
);

// ─── Fetch Summary (Step 5) ──────────────────────────────────────────
export const fetchPayrollSummary = createAsyncThunk(
  "payroll/fetchSummary",
  async ({ userId, payPeriodMonth, payPeriodYear }, { rejectWithValue }) => {
    try {
      const payload = {
        user_id: userId,
        pay_period_month: payPeriodMonth,
        pay_period_year: payPeriodYear,
      };

      const response = await apiClient.post("/admin/payroll/summary", payload);
      console.log("Fetch summary response:", response.data);

      if (response.data?.success) {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to fetch summary",
      );
    } catch (error) {
      console.error("Fetch summary error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch summary",
      );
    }
  },
);

// ─── Send Payslip via Email ─────────────────────────────────────────────
export const sendPayslip = createAsyncThunk(
  "payroll/sendPayslip",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        `/admin/payroll/${id}/send-payslip`,
      );
      console.log("Send payslip response:", response.data);

      if (response.data?.success === true) {
        return response.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to send payslip",
      );
    } catch (error) {
      console.error("Send payslip error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to send payslip",
      );
    }
  },
);

// ─── Fetch Employee Salary Packages ──────────────────────────────────
// In payrollSlice.js - update the fetchEmployeeSalaryPackages
export const fetchEmployeeSalaryPackages = createAsyncThunk(
  "payroll/fetchEmployeeSalaryPackages",
  async (employeeId, { rejectWithValue }) => {
    try {
      console.log("Fetching salary packages for employee:", employeeId);
      const response = await apiClient.get(
        `/admin/employees/salary-packages/${employeeId}`,
      );
      console.log("Fetch employee salary packages response:", response.data);

      // The response might be nested differently
      let packagesData = [];
      if (response.data?.data?.data) {
        packagesData = response.data.data.data;
      } else if (response.data?.data) {
        packagesData = response.data.data;
      } else if (Array.isArray(response.data)) {
        packagesData = response.data;
      } else if (response.data?.success !== false) {
        packagesData = response.data?.data || response.data || [];
      }

      console.log("Extracted packages data:", packagesData);

      return {
        data: packagesData,
      };
    } catch (error) {
      console.error("Fetch employee salary packages error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch salary packages",
      );
    }
  },
);

// ─── Payroll State ─────────────────────────────────────────────────────
const initialState = {
  // List state
  payrolls: [],
  totalCount: 0,
  currentPage: 1,
  lastPage: 1,
  perPage: 15,

  // Stats
  stats: {
    totalPayrolls: 0,
    totalAmount: 0,
    paidCount: 0,
    pendingCount: 0,
    draftCount: 0,
    failedCount: 0,
  },

  // Draft payroll data
  draftData: null,

  // Step data storage
  stepData: {
    1: {}, // Basic Info
    2: {}, // Country Split
    3: {}, // Overtime
    4: {}, // Deductions
    5: {}, // Summary
  },
  currentStep: 1,
  isStepSaving: false,

  // Submission state
  isSubmitting: false,
  submittedPayroll: null,

  // History
  history: [],
  historyLoading: false,
  historyPagination: {
    currentPage: 1,
    perPage: 10,
    total: 0,
  },
  historyFilters: {
    search: "",
    fromDate: "",
    toDate: "",
    status: "all",
  },

  // Current payroll being viewed/edited
  currentPayroll: null,

  // Step-specific data from API
  calculatedCountries: null,
  overtimeData: null,
  summaryData: null,
  countriesLoading: false,
  overtimeLoading: false,
  summaryLoading: false,

  // Employee salary packages
  employeePackages: [],
  packagesLoading: false,

  // Loading & error states
  loading: false,
  actionLoading: false,
  saving: false,
  error: null,

  // Success messages
  successMessage: null,

  // Track which steps have been completed/saved
  completedSteps: [],
};

const payrollSlice = createSlice({
  name: "payroll",
  initialState,
  reducers: {
    // Set current step
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
    },

    // Update step data locally
    updateStepData: (state, action) => {
      const { step, data } = action.payload;
      state.stepData[step] = { ...state.stepData[step], ...data };
    },

    // Mark step as completed
    markStepCompleted: (state, action) => {
      const step = action.payload;
      if (!state.completedSteps.includes(step)) {
        state.completedSteps.push(step);
      }
    },

    // Clear step data
    clearStepData: (state) => {
      state.stepData = {
        1: {},
        2: {},
        3: {},
        4: {},
        5: {},
      };
      state.completedSteps = [];
    },

    // Set draft data
    setDraftData: (state, action) => {
      state.draftData = action.payload;
    },

    // Set history filters
    setHistoryFilters: (state, action) => {
      state.historyFilters = { ...state.historyFilters, ...action.payload };
      state.historyPagination.currentPage = 1;
    },

    // Set history pagination
    setHistoryPagination: (state, action) => {
      state.historyPagination = {
        ...state.historyPagination,
        ...action.payload,
      };
    },

    // Clear errors
    clearPayrollError: (state) => {
      state.error = null;
    },

    // Clear success message
    clearPayrollSuccess: (state) => {
      state.successMessage = null;
    },

    // Reset payroll state
    resetPayrollState: (state) => {
      state.draftData = null;
      state.currentPayroll = null;
      state.submittedPayroll = null;
      state.error = null;
      state.successMessage = null;
      state.isSubmitting = false;
      state.stepData = {
        1: {},
        2: {},
        3: {},
        4: {},
        5: {},
      };
      state.completedSteps = [];
      state.currentStep = 1;
      state.calculatedCountries = null;
      state.overtimeData = null;
      state.summaryData = null;
      state.employeePackages = [];
    },

    // Set current payroll
    setCurrentPayroll: (state, action) => {
      state.currentPayroll = action.payload;
    },

    // Clear payroll list
    clearPayrollList: (state) => {
      state.payrolls = [];
      state.totalCount = 0;
    },

    // Clear step data
    clearCalculatedCountries: (state) => {
      state.calculatedCountries = null;
    },
    clearOvertimeData: (state) => {
      state.overtimeData = null;
    },
    clearSummaryData: (state) => {
      state.summaryData = null;
    },
    clearEmployeePackages: (state) => {
      state.employeePackages = [];
    },
    clearSubmissionState: (state) => {
      state.isSubmitting = false;
      state.submittedPayroll = null;
      state.error = null;
      state.successMessage = null;
    },
    resetCurrentPayroll: (state) => {
      state.currentPayroll = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // ─── Fetch Payrolls ────────────────────────────────────────────────
      .addCase(fetchPayrolls.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayrolls.fulfilled, (state, action) => {
        state.loading = false;
        const data = action.payload || {};
        state.payrolls = data.payrolls || data.data || [];
        state.totalCount = data.total || state.payrolls.length;
        state.currentPage = data.current_page || 1;
        state.lastPage = data.last_page || 1;
        state.perPage = data.per_page || 15;
        if (data.stats) {
          state.stats = data.stats;
        }
      })
      .addCase(fetchPayrolls.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ─── Delete Payroll ────────────────────────────────────────────────
      .addCase(deletePayroll.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deletePayroll.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.payrolls = state.payrolls.filter((p) => p.id !== action.payload);
        state.totalCount = state.payrolls.length;
        state.successMessage = "Payroll deleted successfully";
      })
      .addCase(deletePayroll.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // ─── Generate Payslip ──────────────────────────────────────────────
      .addCase(generatePayslip.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(generatePayslip.fulfilled, (state) => {
        state.actionLoading = false;
        state.successMessage = "Payslip downloaded successfully";
      })
      .addCase(generatePayslip.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // ─── Fetch Payroll Stats ───────────────────────────────────────────
      .addCase(fetchPayrollStats.fulfilled, (state, action) => {
        state.stats = action.payload || state.stats;
      })

      // ─── Update Payroll Status ─────────────────────────────────────────
      .addCase(updatePayrollStatus.fulfilled, (state, action) => {
        const updated = action.payload?.data || action.payload;
        if (updated?.id) {
          const index = state.payrolls.findIndex((p) => p.id === updated.id);
          if (index !== -1) {
            state.payrolls[index] = { ...state.payrolls[index], ...updated };
          }
        }
      })

      // ─── Fetch Draft Payroll ───────────────────────────────────────────
      .addCase(fetchDraftPayroll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDraftPayroll.fulfilled, (state, action) => {
        state.loading = false;
        state.draftData = action.payload;
        if (action.payload?.step_data) {
          state.stepData = action.payload.step_data;
        }
      })
      .addCase(fetchDraftPayroll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ─── Save Step ─────────────────────────────────────────────────────
      .addCase(savePayrollStep.pending, (state) => {
        state.isStepSaving = true;
        state.error = null;
      })
      .addCase(savePayrollStep.fulfilled, (state, action) => {
        state.isStepSaving = false;
        const { step, stepData, message } = action.payload;
        state.stepData[step] = { ...state.stepData[step], ...stepData };
        if (!state.completedSteps.includes(step)) {
          state.completedSteps.push(step);
        }
        state.successMessage = message;
      })
      .addCase(savePayrollStep.rejected, (state, action) => {
        state.isStepSaving = false;
        state.error = action.payload;
      })

      // ─── Submit Payroll ────────────────────────────────────────────────
      // ─── Submit Payroll ────────────────────────────────────────────────
      .addCase(submitPayroll.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(submitPayroll.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.submittedPayroll = action.payload;
        state.successMessage =
          action.payload?.message ||
          "Payroll submitted successfully! Payslip has been generated and emailed.";
        // Reset step data after successful submission
        state.stepData = {
          1: {},
          2: {},
          3: {},
          4: {},
          5: {},
        };
        state.completedSteps = [];
        state.currentStep = 1;
        // Clear calculated data
        state.calculatedCountries = null;
        state.overtimeData = null;
        state.summaryData = null;
      })
      .addCase(submitPayroll.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload || "Failed to submit payroll";
        state.successMessage = null;
      })
      // ─── Fetch History ──────────────────────────────────────────────────
      .addCase(fetchPayrollHistory.pending, (state) => {
        state.historyLoading = true;
        state.error = null;
      })
      .addCase(fetchPayrollHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        const data = action.payload?.data || action.payload || [];
        state.history = data.history || data || [];
        if (data.pagination) {
          state.historyPagination.total = data.pagination.total;
          state.historyPagination.currentPage = data.pagination.current_page;
          state.historyPagination.perPage = data.pagination.per_page;
        }
      })
      .addCase(fetchPayrollHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.error = action.payload;
      })

      // ─── Fetch Payroll by ID ───────────────────────────────────────────
      // ─── Fetch Payroll by ID ───────────────────────────────────────────
      .addCase(fetchPayrollById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentPayroll = null; // Clear old data when fetching
      })
      .addCase(fetchPayrollById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPayroll = action.payload;
      })
      .addCase(fetchPayrollById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.currentPayroll = null;
      })

      // ─── Save Draft ────────────────────────────────────────────────────
      .addCase(saveDraftPayroll.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveDraftPayroll.fulfilled, (state, action) => {
        state.saving = false;
        state.draftData = action.payload;
        state.successMessage = "Draft saved successfully";
      })
      .addCase(saveDraftPayroll.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      // ─── Calculate Salary Split ───────────────────────────────────────
      .addCase(calculateSalarySplit.pending, (state) => {
        state.countriesLoading = true;
        state.error = null;
      })
      .addCase(calculateSalarySplit.fulfilled, (state, action) => {
        state.countriesLoading = false;
        state.calculatedCountries = action.payload;
      })
      .addCase(calculateSalarySplit.rejected, (state, action) => {
        state.countriesLoading = false;
        state.error = action.payload;
      })

      // ─── Fetch Overtime Data ──────────────────────────────────────────
      .addCase(fetchOvertimeData.pending, (state) => {
        state.overtimeLoading = true;
        state.error = null;
      })
      .addCase(fetchOvertimeData.fulfilled, (state, action) => {
        state.overtimeLoading = false;
        state.overtimeData = action.payload;
      })
      .addCase(fetchOvertimeData.rejected, (state, action) => {
        state.overtimeLoading = false;
        state.error = action.payload;
      })

      // ─── Fetch Summary ─────────────────────────────────────────────────
      .addCase(fetchPayrollSummary.pending, (state) => {
        state.summaryLoading = true;
        state.error = null;
      })
      .addCase(fetchPayrollSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summaryData = action.payload;
      })
      .addCase(fetchPayrollSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.error = action.payload;
      })

      // ─── Fetch Employee Salary Packages ───────────────────────────────
      .addCase(fetchEmployeeSalaryPackages.pending, (state) => {
        state.packagesLoading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeSalaryPackages.fulfilled, (state, action) => {
        state.packagesLoading = false;
        state.employeePackages = action.payload?.data || [];
        state.successMessage = action.payload?.message;
      })
      .addCase(fetchEmployeeSalaryPackages.rejected, (state, action) => {
        state.packagesLoading = false;
        state.error = action.payload;
      });
  },
});

// ─── Export Actions ──────────────────────────────────────────────────
export const {
  setCurrentStep,
  updateStepData,
  markStepCompleted,
  clearStepData,
  setDraftData,
  setHistoryFilters,
  setHistoryPagination,
  clearPayrollError,
  clearPayrollSuccess,
  resetPayrollState,
  setCurrentPayroll,
  clearPayrollList,
  clearCalculatedCountries,
  clearOvertimeData,
  clearSummaryData,
  clearEmployeePackages,
  clearSubmissionState,
  resetCurrentPayroll,
} = payrollSlice.actions;

// ─── Export Selectors ────────────────────────────────────────────────
export const selectPayrollState = (state) => state.payroll;
export const selectPayrolls = (state) => state.payroll.payrolls;
export const selectPayrollStats = (state) => state.payroll.stats;
export const selectPayrollLoading = (state) => state.payroll.loading;
export const selectPayrollActionLoading = (state) =>
  state.payroll.actionLoading;
export const selectPayrollTotalCount = (state) => state.payroll.totalCount;
export const selectPayrollCurrentPage = (state) => state.payroll.currentPage;
export const selectPayrollLastPage = (state) => state.payroll.lastPage;
export const selectPayrollPerPage = (state) => state.payroll.perPage;
export const selectPayrollError = (state) => state.payroll.error;
export const selectPayrollSuccess = (state) => state.payroll.successMessage;

// Step selectors
export const selectCurrentStep = (state) => state.payroll.currentStep;
export const selectStepData = (state) => state.payroll.stepData;
export const selectStepDataByStep = (step) => (state) =>
  state.payroll.stepData[step];
export const selectCompletedSteps = (state) => state.payroll.completedSteps;
export const selectIsStepCompleted = (step) => (state) =>
  state.payroll.completedSteps.includes(step);

// Draft selectors
export const selectDraftData = (state) => state.payroll.draftData;
export const selectPayrollSaving = (state) => state.payroll.saving;
export const selectPayrollIsSubmitting = (state) => state.payroll.isSubmitting;

// History selectors
export const selectPayrollHistory = (state) => state.payroll.history;
export const selectPayrollHistoryLoading = (state) =>
  state.payroll.historyLoading;
export const selectPayrollHistoryPagination = (state) =>
  state.payroll.historyPagination;
export const selectPayrollHistoryFilters = (state) =>
  state.payroll.historyFilters;

// Current payroll selectors
export const selectCurrentPayroll = (state) => state.payroll.currentPayroll;
export const selectSubmittedPayroll = (state) => state.payroll.submittedPayroll;

// Step data selectors
export const selectCalculatedCountries = (state) =>
  state.payroll.calculatedCountries;
export const selectCountriesLoading = (state) => state.payroll.countriesLoading;
export const selectOvertimeData = (state) => state.payroll.overtimeData;
export const selectOvertimeLoading = (state) => state.payroll.overtimeLoading;
export const selectSummaryData = (state) => state.payroll.summaryData;
export const selectSummaryLoading = (state) => state.payroll.summaryLoading;

// Employee packages selectors
export const selectEmployeePackages = (state) => state.payroll.employeePackages;
export const selectPackagesLoading = (state) => state.payroll.packagesLoading;
export const selectPayrollSubmissionState = (state) => ({
  isSubmitting: state.payroll.isSubmitting,
  submittedPayroll: state.payroll.submittedPayroll,
  error: state.payroll.error,
  successMessage: state.payroll.successMessage,
});
export default payrollSlice.reducer;
