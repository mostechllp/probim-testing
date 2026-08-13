import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

export const fetchMyPayrollHistory = createAsyncThunk(
  "myPayroll/fetchMyPayrollHistory",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/employee/payroll/history", { params });
      const responseData = response.data;
      if (responseData?.data && Array.isArray(responseData.data)) {
        return {
          history: responseData.data,
          total: responseData.total || responseData.data.length,
          per_page: responseData.per_page || 10,
        };
      }
      return {
        history: Array.isArray(responseData) ? responseData : responseData?.data || [],
        total: responseData?.total || (Array.isArray(responseData) ? responseData.length : 0),
        per_page: responseData?.per_page || 10,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch payroll history"
      );
    }
  }
);

export const fetchMyPayrollSummary = createAsyncThunk(
  "myPayroll/fetchMyPayrollSummary",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/employee/payroll/summary", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch payroll summary"
      );
    }
  }
);

export const downloadMyPayslip = createAsyncThunk(
  "myPayroll/downloadMyPayslip",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/employee/payroll/${id}/download`, {
        responseType: "blob",
      });

      console.log("Download my payslip response:", response);

      const blob = response.data;

      // Get filename from backend Content-Disposition header
      const contentDisposition = response.headers["content-disposition"];
      let filename = `payslip_${id}.pdf`;

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
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        filename,
      };
    } catch (error) {
      console.error("Download my payslip error:", error);

      // Extract error message from the response
      let errorMessage = "Failed to download payslip";

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
            errorMessage = "Failed to download payslip";
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

const initialState = {
  history: [],
  summary: null,
  totalCount: 0,
  perPage: 10,
  loading: false,
  error: null,
};

const myPayrollSlice = createSlice({
  name: "myPayroll",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // History
      .addCase(fetchMyPayrollHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyPayrollHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload.history;
        state.totalCount = action.payload.total;
        state.perPage = action.payload.per_page;
      })
      .addCase(fetchMyPayrollHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Summary
      .addCase(fetchMyPayrollSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyPayrollSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload?.data || action.payload || null;
      })
      .addCase(fetchMyPayrollSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default myPayrollSlice.reducer;
