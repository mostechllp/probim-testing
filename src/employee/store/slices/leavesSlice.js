import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

// Fetch Employee Leaves
export const fetchEmployeeLeaves = createAsyncThunk(
  "leaves/fetchEmployeeLeaves",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/employee/leaves");

      if (response.data && response.data.status === "success") {
        // The leaves array is inside data.leaves
        const leavesData = response.data.data?.leaves || [];
        return leavesData;
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to fetch leaves",
        );
      }
    } catch (error) {
      console.error("Fetch leaves error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch leaves",
      );
    }
  },
);

export const fetchLeaveById = createAsyncThunk(
  "leaves/fetchLeaveById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/employee/leaves/${id}`);

      if (response.data && response.data.status === "success") {
        const leaveData = response.data.data || response.data;
        return leaveData;
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to fetch leave details",
        );
      }
    } catch (error) {
      console.error("Fetch leave by ID error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch leave details",
      );
    }
  },
);

// Fetch all employees (for HR to request leave on behalf)
// Fetch all employees (for HR to request leave on behalf)
export const fetchEmployeesForLeave = createAsyncThunk(
  "leaves/fetchEmployeesForLeave",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/employees");

      if (response.data && response.data.status === "success") {
        // The employees array is inside data.data
        const employeesData = response.data.data?.data || [];
        return employeesData;
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to fetch employees",
        );
      }
    } catch (error) {
      console.error("Fetch employees error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employees",
      );
    }
  },
);

// Store Leave Request for Employee (HR can request on behalf)
export const addLeaveRequestForEmployee = createAsyncThunk(
  "leaves/addLeaveRequestForEmployee",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/employee/leaves", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data && response.data.status === "success") {
        return response.data.data;
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to submit leave request",
        );
      }
    } catch (error) {
      console.error("Add leave for employee error:", error);
      if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors)
          .flat()
          .join(", ");
        return rejectWithValue(errorMessages);
      }
      return rejectWithValue(
        error.response?.data?.message || "Failed to submit leave request",
      );
    }
  },
);

// Fetch Leave Types
export const fetchLeaveTypes = createAsyncThunk(
  "leaves/fetchLeaveTypes",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/employee/leave-types");

      if (response.data && response.data.status === "success") {
        // The API might return leave types in different formats
        // Try to extract the data properly
        let leaveTypes = [];

        if (Array.isArray(response.data.data)) {
          leaveTypes = response.data.data;
        } else if (
          response.data.data?.data &&
          Array.isArray(response.data.data.data)
        ) {
          leaveTypes = response.data.data.data;
        } else if (Array.isArray(response.data)) {
          leaveTypes = response.data;
        } else {
          leaveTypes = response.data.data || [];
        }

        return leaveTypes;
      }
      return [];
    } catch (error) {
      console.error("Fetch leave types error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch leave types",
      );
    }
  },
);

// Fetch Leave Balance for a specific employee
export const fetchLeaveBalance = createAsyncThunk(
  "leaves/fetchLeaveBalance",
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState();

      let employeeId = null;

      // 1. Try from auth.user.employee.id (most reliable)
      if (state.auth?.user?.employee?.id) {
        employeeId = state.auth.user.employee.id;
      }

      // 2. Try from auth.user.employee_id (if exists)
      if (!employeeId && state.auth?.user?.employee_id) {
        employeeId = state.auth.user.employee_id;
      }

      // 3. Try from employee slice
      if (!employeeId && state.employee?.currentEmployee?.employee_id) {
        employeeId = state.employee.currentEmployee.employee_id;
      }

      if (!employeeId) {
        console.warn("No employee ID found for fetching leave balance");
        return {};
      }


      const response = await apiClient.get(
        `/employee/leave-allocations/${employeeId}`,
      );

      if (response.data && response.data.status === "success") {
        const data = response.data.data;
        return transformLeaveBalanceData(data);
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to fetch leave balance",
        );
      }
    } catch (error) {
      console.error("Fetch leave balance error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch leave balance",
      );
    }
  },
);

// Updated transformLeaveBalanceData function for new API structure
const transformLeaveBalanceData = (data) => {
  const leaveBalances = {};


  // Get leave types balance from the response
  const leaveTypesBalance = data.leaveTypesBalance || [];

  // Get total stats from top level
  const totalAllocated = parseFloat(data.leaves_allocated) || 0;
  const totalLeavesTaken = parseFloat(data.leaves_taken) || 0;
  const totalLeaveBalance = parseFloat(data.leave_balance) || 0;

  // Process each leave type from leaveTypesBalance
  leaveTypesBalance.forEach((item) => {
    const leaveTypeId = item.leave_type_id;
    const leaveTypeName = item.leave_type;
    const allocated = parseFloat(item.allocated) || 0;
    const taken = parseFloat(item.taken) || 0;
    const balance = parseFloat(item.balance) || 0;

    leaveBalances[leaveTypeName] = {
      id: leaveTypeId,
      allocated: allocated,
      taken: taken,
      pending: 0, // API doesn't provide pending, but we can keep it for UI consistency
      remaining: balance,
      name: leaveTypeName,
      allocated_days: allocated,
      used: taken,
    };
  });

  // Add total balance using the actual totals from the API
  leaveBalances.total = {
    allocated: totalAllocated,
    taken: totalLeavesTaken,
    pending: 0,
    remaining: totalLeaveBalance,
  };

  return leaveBalances;
};

// Store New Leave Request
export const addLeaveRequest = createAsyncThunk(
  "leaves/storeLeaveRequest",
  async (formData, { rejectWithValue, dispatch, getState }) => {
    try {
      const state = getState();

      // Get employee ID from auth state
      let employeeId =
        state.auth?.user?.employee?.id ||
        state.auth?.user?.employee_id ||
        state.employee?.currentEmployee?.employee_id;

      if (!employeeId) {
        return rejectWithValue("Employee ID not found");
      }

      // Extract data from FormData
      const leaveTypeId = formData.get("leave_type_id");
      const startDate = formData.get("start_date");
      const endDate = formData.get("end_date");
      const reason = formData.get("reason");
      const claimSalary = formData.get("claim_salary") === "1";
      const session1 = formData.get("session1") || "morning"; // morning or afternoon
      const session2 = formData.get("session2") || "afternoon"; // morning or afternoon
      const year = formData.get("year") || new Date().getFullYear();

      // Check if we have a document
      const document = formData.get("document");

      // Prepare the payload
      let payload;
      let headers = {};

      // Only add document if it exists
      if (document && document.size > 0) {
        // If there's a document, we need to use FormData
        const formDataWithDoc = new FormData();
        formDataWithDoc.append("employee_id", employeeId);
        formDataWithDoc.append("leave_type_id", leaveTypeId);
        formDataWithDoc.append("start_date", startDate);
        formDataWithDoc.append("end_date", endDate);
        formDataWithDoc.append("reason", reason);
        formDataWithDoc.append("claim_salary", claimSalary ? "1" : "0");
        formDataWithDoc.append("session1", session1);
        formDataWithDoc.append("session2", session2);
        formDataWithDoc.append("year", year);
        formDataWithDoc.append("document", document);

        payload = formDataWithDoc;
        headers = { "Content-Type": "multipart/form-data" };
      } else {
        // If no document, send as JSON with ALL fields
        payload = {
          employee_id: parseInt(employeeId),
          leave_type_id: parseInt(leaveTypeId),
          start_date: startDate,
          end_date: endDate,
          reason: reason,
          claim_salary: claimSalary,
          session1: session1, // morning or afternoon
          session2: session2, // morning or afternoon
          year: parseInt(year),
        };
        headers = { "Content-Type": "application/json" };
      }


      const response = await apiClient.post("/employee/leaves", payload, {
        headers,
      });

      if (response.data && response.data.status === "success") {
        // Refresh balance after successful submission
        await dispatch(fetchLeaveBalance());
        await dispatch(fetchEmployeeLeaves());
        return response.data.data;
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to submit leave request",
        );
      }
    } catch (error) {
      console.error("Store leave error:", error);
      // Handle validation errors
      if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors)
          .flat()
          .join(", ");
        return rejectWithValue(errorMessages);
      }
      return rejectWithValue(
        error.response?.data?.message || "Failed to submit leave request",
      );
    }
  },
);

// Calculate leave balances
export const calculateLeaveBalances = createAsyncThunk(
  "leaves/calculateLeaveBalances",
  async (_, { getState }) => {
    const state = getState();
    return state.leaves.leaveBalances;
  },
);

// Update Leave Request
export const updateLeaveRequest = createAsyncThunk(
  "leaves/updateLeaveRequest",
  async ({ id, formData }, { rejectWithValue, dispatch }) => {
    try {
      // Check if formData is FormData or plain object
      let payload;
      let headers = {};

      if (formData instanceof FormData) {
        payload = formData;
        headers = { "Content-Type": "multipart/form-data" };
      } else {
        payload = formData;
        headers = { "Content-Type": "application/json" };
      }


      const response = await apiClient.post(`/employee/leaves/${id}`, payload, {
        headers,
      });

      if (response.data && response.data.status === "success") {
        // Refresh balance and leaves after successful update
        await dispatch(fetchLeaveBalance());
        await dispatch(fetchEmployeeLeaves());
        return response.data.data;
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to update leave request",
        );
      }
    } catch (error) {
      console.error("Update leave error:", error);
      if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors)
          .flat()
          .join(", ");
        return rejectWithValue(errorMessages);
      }
      return rejectWithValue(
        error.response?.data?.message || "Failed to update leave request",
      );
    }
  },
);

// Delete Leave Request
export const deleteLeaveRequest = createAsyncThunk(
  "leaves/deleteLeaveRequest",
  async (id, { rejectWithValue, dispatch }) => {
    try {

      const response = await apiClient.delete(`/employee/leaves/${id}`);

      if (response.data && response.data.status === "success") {
        // Refresh balance and leaves after successful deletion
        await dispatch(fetchLeaveBalance());
        await dispatch(fetchEmployeeLeaves());
        return id;
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to delete leave request",
        );
      }
    } catch (error) {
      console.error("Delete leave error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete leave request",
      );
    }
  },
);

const initialState = {
  leaves: [],
  leaveTypes: [],
  employeesList: [],
  editingLeave: null,
  leaveBalances: {
    total: {
      allocated: 0,
      taken: 0,
      pending: 0,
      remaining: 0,
    },
  },
  filter: {
    status: "all",
    search: "",
  },
  pagination: {
    currentPage: 1,
    perPage: 10,
  },
  loading: false,
  error: null,
  submitting: false,
};

const leavesSlice = createSlice({
  name: "leaves",
  initialState,
  reducers: {
    setLeaveFilter: (state, action) => {
      state.filter.status = action.payload.status;
      state.filter.search = action.payload.search || "";
      state.pagination.currentPage = 1;
    },
    setLeavePagination: (state, action) => {
      state.pagination.currentPage = action.payload.currentPage;
      state.pagination.perPage = action.payload.perPage;
    },
    clearLeaveError: (state) => {
      state.error = null;
    },
    updateLeaveBalance: (state, action) => {
      state.leaveBalances = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Employee Leaves
      .addCase(fetchEmployeeLeaves.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeLeaves.fulfilled, (state, action) => {
        state.loading = false;
        state.leaves = action.payload;
        state.error = null;
      })
      .addCase(fetchEmployeeLeaves.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Leave Types
      .addCase(fetchLeaveTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeaveTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.leaveTypes = action.payload;
        state.error = null;
      })
      .addCase(fetchLeaveTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Leave Balance
      .addCase(fetchLeaveBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeaveBalance.fulfilled, (state, action) => {
        state.loading = false;
        state.leaveBalances = action.payload;
        state.error = null;
      })
      .addCase(fetchLeaveBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Store Leave Request
      .addCase(addLeaveRequest.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(addLeaveRequest.fulfilled, (state, action) => {
        state.submitting = false;
        state.leaves.unshift(action.payload);
        state.error = null;
      })
      .addCase(addLeaveRequest.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })

      .addCase(fetchEmployeesForLeave.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeesForLeave.fulfilled, (state, action) => {
        state.loading = false;
        state.employeesList = action.payload; // Now this will be an array
        state.error = null;
      })
      .addCase(fetchEmployeesForLeave.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Calculate Leave Balances
      .addCase(calculateLeaveBalances.pending, (state) => {
        state.loading = true;
      })
      .addCase(calculateLeaveBalances.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(calculateLeaveBalances.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Leave Request
      .addCase(updateLeaveRequest.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateLeaveRequest.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.leaves.findIndex(
          (leave) => leave.id === action.payload.id,
        );
        if (index !== -1) {
          state.leaves[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateLeaveRequest.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })

      // Delete Leave Request
      .addCase(deleteLeaveRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLeaveRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.leaves = state.leaves.filter(
          (leave) => leave.id !== action.payload,
        );
        state.error = null;
      })
      .addCase(deleteLeaveRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLeaveById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeaveById.fulfilled, (state, action) => {
        state.loading = false;
        state.editingLeave = action.payload;
        state.error = null;
      })
      .addCase(fetchLeaveById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setLeaveFilter,
  setLeavePagination,
  clearLeaveError,
  updateLeaveBalance,
} = leavesSlice.actions;
export default leavesSlice.reducer;
