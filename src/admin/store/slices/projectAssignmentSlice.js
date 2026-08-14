// src/admin/store/slices/projectAssignmentSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import projectService from "../../services/projectService";

// src/admin/store/slices/projectAssignmentSlice.js

// projectAssignmentSlice.js
// projectAssignmentSlice.js
const mapAssignmentFromApi = (
  apiAssign,
  fallbackEmployeeId = null,
  includeEmpty = false,
) => {
  if (!apiAssign) return null;

  // IMPORTANT: Use apiAssign.id as the primary employee ID
  let employeeId = null;

  // Primary: Use the employee record ID (apiAssign.id)
  if (apiAssign.id) {
    employeeId = Number(apiAssign.id);
  }
  // Fallback: If no id, try user_id
  else if (apiAssign.user_id) {
    employeeId = Number(apiAssign.user_id);
  }
  // Fallback: Use provided fallback
  else if (fallbackEmployeeId) {
    employeeId = Number(fallbackEmployeeId);
  }

  if (!employeeId || isNaN(employeeId)) {
    return null;
  }

  // Get project IDs from the projects array
  let projectIds = [];
  if (apiAssign.projects && Array.isArray(apiAssign.projects)) {
    projectIds = apiAssign.projects.map((p) => String(p.id));
  }

  // If includeEmpty is false, filter out empty assignments
  if (!includeEmpty && projectIds.length === 0) {
    return null;
  }

  return {
    employeeId: employeeId, // This is the employee record ID from apiAssign.id
    userId: apiAssign.user_id ? Number(apiAssign.user_id) : null,
    employeeCode: apiAssign.employee_id || `EMP-${employeeId}`,
    firstName: apiAssign.first_name || null,
    lastName: apiAssign.last_name || null,
    projectIds: projectIds.map(String),
    lastUpdated: apiAssign.updated_at
      ? apiAssign.updated_at.split("T")[0]
      : apiAssign.lastUpdated || new Date().toISOString().split("T")[0],
    raw: apiAssign,
  };
};

// Update fetchAssignments to include empty assignments if needed
export const fetchAssignments = createAsyncThunk(
  "projectAssignments/fetchAssignments",
  async (_, { rejectWithValue }) => {
    try {
      const response = await projectService.getProjectAssignments();

      let list = [];
      if (Array.isArray(response)) {
        list = response;
      } else if (Array.isArray(response?.data)) {
        list = response.data;
      } else if (Array.isArray(response?.data?.data)) {
        list = response.data.data;
      } else if (response?.data && typeof response.data === "object") {
        list = [response.data];
      } else {
        list = [];
      }

      const mapped = list
        .map((item) => mapAssignmentFromApi(item, null, true)) // Pass true to include empty assignments
        .filter((a) => a !== null && !isNaN(a.employeeId));

      // Only keep assignments that have at least one project, or keep all if we want to show empty ones
      // For now, filter out empty ones for the main list
      return mapped.filter((a) => a.projectIds.length > 0);
    } catch (error) {
      console.error("[API ERROR] fetchAssignments:", error);
      return rejectWithValue(
        error.message || "Failed to load project assignments",
      );
    }
  },
);

// projectAssignmentSlice.js
export const saveAssignment = createAsyncThunk(
  "projectAssignments/saveAssignment",
  async (
    { employeeId, projectIds },
    { rejectWithValue, dispatch, getState },
  ) => {
    try {
      const ids = projectIds.map(Number);
      const response = await projectService.assignProjectsToEmployee(
        employeeId,
        ids,
      );


      // Get the updated projects from the response
      let updatedProjectIds = [];
      let userId = null;
      let employeeRecordId = Number(employeeId); // Use the passed employeeId as the primary

      if (response?.data) {
        const data = response.data;
        userId = data.user_id ? Number(data.user_id) : null;

        if (data.projects && Array.isArray(data.projects)) {
          updatedProjectIds = data.projects.map((p) => String(p.id));
        }

        // Only use data.id if it exists and is a number
        // DO NOT use data.employee_id as it's a string code
        if (data.id && !isNaN(Number(data.id))) {
          employeeRecordId = Number(data.id);
        }
      }

      // Create the updated assignment object
      const updatedAssignment = {
        employeeId: employeeRecordId,
        userId: userId,
        projectIds: updatedProjectIds,
        lastUpdated: new Date().toISOString().split("T")[0],
        raw: response?.data || response,
      };

      // If there are no projects, we need to remove the assignment from the list
      if (updatedProjectIds.length === 0) {
        return {
          ...updatedAssignment,
          projectIds: [],
          _remove: true,
        };
      }

      return updatedAssignment;
    } catch (error) {
      console.error("[API ERROR] saveAssignment:", error);
      return rejectWithValue(
        error.message || "Failed to save project assignment",
      );
    }
  },
);

export const fetchEmployeeProjects = createAsyncThunk(
  "projectAssignments/fetchEmployeeProjects",
  async (employeeId, { rejectWithValue }) => {
    try {
      const response = await projectService.getEmployeeProjects(employeeId);
      return response.data || response || [];
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch projects assigned to employee",
      );
    }
  },
);
export const fetchEmployeesForAssignments = createAsyncThunk(
  "projectAssignments/fetchEmployeesForAssignments",
  async (_, { rejectWithValue }) => {
    try {
      const response = await projectService.getEmployeesForProjectAssignments();
      // Handle different response structures
      if (Array.isArray(response)) {
        return response;
      } else if (Array.isArray(response?.data)) {
        return response.data;
      } else if (Array.isArray(response?.data?.data)) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error("[API ERROR] fetchEmployeesForAssignments:", error);
      return rejectWithValue(
        error.message || "Failed to fetch employees for assignments",
      );
    }
  },
);

export const removeEmployeeSingleProject = createAsyncThunk(
  "projectAssignments/removeEmployeeSingleProject",
  async ({ employeeId, projectId }, { rejectWithValue, dispatch }) => {
    try {
      await projectService.removeEmployeeProject(employeeId, projectId);

      // After successful removal, fetch the updated assignments
      await dispatch(fetchAssignments()).unwrap();

      return { employeeId: Number(employeeId), projectId: String(projectId) };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to remove assignment details",
      );
    }
  },
);

// src/admin/store/slices/projectAssignmentSlice.js

export const fetchEmployeeProjectWorkingTime = createAsyncThunk(
  "projectAssignments/fetchEmployeeProjectWorkingTime",
  async (userId, { rejectWithValue }) => {
    try {
      const response =
        await projectService.getEmployeeProjectWorkingTime(userId);

      // Extract project_times from the response - FIXED
      let projectTimes = [];

      // Check the actual response structure
      if (response?.data?.project_times) {
        projectTimes = response.data.project_times;
      } else if (response?.data && Array.isArray(response.data)) {
        projectTimes = response.data;
      } else if (Array.isArray(response)) {
        projectTimes = response;
      } else if (response?.project_times) {
        projectTimes = response.project_times;
      }

      return { userId, data: projectTimes };
    } catch (error) {
      console.error("Error fetching working time:", error);
      return rejectWithValue(
        error.message || "Failed to fetch employee project working time",
      );
    }
  },
);

export const deleteAllEmployeeProjects = createAsyncThunk(
  "projectAssignments/deleteAllEmployeeProjects",
  async (employeeId, { rejectWithValue, dispatch }) => {
    try {
      // Call the new API to remove all assignments
      await projectService.removeAllEmployeeProjects(employeeId);

      // After successful deletion, fetch the updated assignments
      await dispatch(fetchAssignments()).unwrap();

      return Number(employeeId);
    } catch (error) {
      console.error("[API ERROR] deleteAllEmployeeProjects:", error);
      return rejectWithValue(
        error.message || "Failed to remove all project assignments",
      );
    }
  },
);

// Update the deleteAssignment thunk to use the new API
export const deleteAssignment = createAsyncThunk(
  "projectAssignments/deleteAssignment",
  async (employeeId, { rejectWithValue, dispatch }) => {
    try {
      // Use the new API to remove all assignments
      await projectService.removeAllEmployeeProjects(employeeId);

      // After successful delete, fetch the updated assignments
      const updatedAssignments = await dispatch(fetchAssignments()).unwrap();

      return Number(employeeId);
    } catch (error) {
      console.error("[API ERROR] deleteAssignment:", error);
      return rejectWithValue(
        error.message || "Failed to remove project assignments",
      );
    }
  },
);

const initialState = {
  assignments: [],
  employeeProjects: [],
  employeeWorkingTime: {},
  employeesForAssignment: [],
  loading: false,
  actionLoading: false,
  error: null,
};

const projectAssignmentSlice = createSlice({
  name: "projectAssignments",
  initialState,
  reducers: {
    clearAssignmentError: (state) => {
      state.error = null;
    },
    updateAssignmentLocally: (state, action) => {
      const { employeeId, projectIds } = action.payload;
      const exists = state.assignments.some(
        (a) => Number(a.employeeId) === Number(employeeId),
      );

      if (exists) {
        state.assignments = state.assignments.map((a) =>
          Number(a.employeeId) === Number(employeeId)
            ? { ...a, projectIds: projectIds.map(String) }
            : a,
        );
      } else if (projectIds && projectIds.length > 0) {
        state.assignments.unshift({
          employeeId: Number(employeeId),
          projectIds: projectIds.map(String),
          lastUpdated: new Date().toISOString().split("T")[0],
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Assignments
      .addCase(fetchAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = action.payload;
      })
      .addCase(fetchAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load project assignments";
      })

      // Save Assignment (Create / Edit)
      .addCase(saveAssignment.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      // In the extraReducers, update the saveAssignment.fulfilled case

      .addCase(saveAssignment.fulfilled, (state, action) => {
        state.actionLoading = false;

        const payload = action.payload;
        if (payload && payload.employeeId) {
          // Check if this is a removal (empty projectIds with _remove flag)
          if (
            payload._remove ||
            (payload.projectIds && payload.projectIds.length === 0)
          ) {
            // Remove the assignment entirely
            state.assignments = state.assignments.filter(
              (a) => Number(a.employeeId) !== Number(payload.employeeId),
            );
            return;
          }

          const exists = state.assignments.some(
            (a) => Number(a.employeeId) === Number(payload.employeeId),
          );

          if (exists) {
            state.assignments = state.assignments.map((a) =>
              Number(a.employeeId) === Number(payload.employeeId)
                ? { ...payload, _remove: undefined } // Remove the flag
                : a,
            );
          } else {
            state.assignments.unshift({ ...payload, _remove: undefined });
          }
        }
      })
      .addCase(saveAssignment.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload || "Failed to save project mappings";
      })

      // Delete Assignment
      .addCase(deleteAssignment.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteAssignment.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.assignments = state.assignments.filter(
          (a) => Number(a.employeeId) !== Number(action.payload),
        );
      })
      .addCase(deleteAssignment.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload || "Failed to delete assignment mapping";
      })

      // Fetch Employee Assigned Projects
      .addCase(fetchEmployeeProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.employeeProjects = action.payload;
      })
      .addCase(fetchEmployeeProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Remove single project assignment from employee
      .addCase(removeEmployeeSingleProject.fulfilled, (state, action) => {
        const { employeeId, projectId } = action.payload;
        state.assignments = state.assignments.map((a) => {
          if (Number(a.employeeId) === employeeId) {
            return {
              ...a,
              projectIds: a.projectIds.filter((id) => String(id) !== projectId),
            };
          }
          return a;
        });
        state.employeeProjects = state.employeeProjects.filter(
          (p) => String(p.id) !== projectId,
        );
      })

      // Fetch Employee Project Working Time
      .addCase(fetchEmployeeProjectWorkingTime.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeProjectWorkingTime.fulfilled, (state, action) => {
        state.loading = false;
        const { userId, data } = action.payload;
        state.employeeWorkingTime[userId] = data;
      })
      .addCase(fetchEmployeeProjectWorkingTime.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteAllEmployeeProjects.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteAllEmployeeProjects.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.assignments = state.assignments.filter(
          (a) => Number(a.employeeId) !== Number(action.payload),
        );
      })
      .addCase(deleteAllEmployeeProjects.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload || "Failed to delete all assignments";
      })
      .addCase(fetchEmployeesForAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeesForAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.employeesForAssignment = action.payload;
      })
      .addCase(fetchEmployeesForAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load employees";
      });
  },
});

export const { clearAssignmentError, updateAssignmentLocally } =
  projectAssignmentSlice.actions;
export default projectAssignmentSlice.reducer;
