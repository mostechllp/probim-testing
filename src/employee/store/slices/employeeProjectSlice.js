import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import employeeProjectService from "../../services/employeeProjectService";

// Map project from API to frontend format
const mapProjectFromApi = (apiProj) => {
  if (!apiProj) return null;
  
  return {
    id: apiProj.id,
    name: apiProj.name,
    description: apiProj.description || "",
    status: apiProj.status || "Active",
    priority: apiProj.priority || "Medium",
    progress: apiProj.progress || 0,
    // Get manager info from the nested object
    managerId: apiProj.project_manager?.id,
    managerName: apiProj.project_manager?.name || "Not Assigned",
    managerAvatar: apiProj.project_manager?.avatar,
    managerEmail: apiProj.project_manager?.email,
    // Get team lead info from the nested object
    teamLeadId: apiProj.team_lead?.id,
    teamLeadName: apiProj.team_lead?.name || "Not Assigned",
    teamLeadAvatar: apiProj.team_lead?.avatar,
    teamLeadEmail: apiProj.team_lead?.email,
    // Who assigned the project and when
    assignedBy: apiProj.assigned_by,
    assignedAt: apiProj.assigned_at,
    assignedDate: apiProj.assigned_at ? new Date(apiProj.assigned_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) : "Not assigned",
    // Keep raw data for any other needs
    raw: apiProj
  };
};

// Async Thunks - Accept employeeId as parameter
export const fetchMyProjects = createAsyncThunk(
  "employeeProjects/fetchMyProjects",
  async (employeeId, { rejectWithValue, getState }) => {
    try {
      // If employeeId not provided, try to get from state
      let empId = employeeId;
      if (!empId) {
        const state = getState();
        const user = state.auth?.user;
        empId = user?.employee?.id || user?.id;
      }
      
      
      if (!empId) {
        throw new Error("Employee ID is required");
      }
      
      const response = await employeeProjectService.getMyProjects(empId);
      
      
      // Handle different response structures
      let projects = [];
      
      // Extract projects from response.data.projects
      if (response.data?.projects && Array.isArray(response.data.projects)) {
        projects = response.data.projects;
      } else if (response.projects && Array.isArray(response.projects)) {
        projects = response.projects;
      } else if (response.data && Array.isArray(response.data)) {
        projects = response.data;
      } else if (Array.isArray(response)) {
        projects = response;
      }
      
      
      const mappedProjects = projects.map(mapProjectFromApi);
      
      return mappedProjects;
    } catch (error) {
      console.error("Error in fetchMyProjects:", error);
      return rejectWithValue(error.message || "Failed to fetch your projects");
    }
  }
);

export const fetchProjectDetails = createAsyncThunk(
  "employeeProjects/fetchProjectDetails",
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await employeeProjectService.getProjectById(projectId);
      const project = response.data || response;
      return mapProjectFromApi(project);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch project details");
    }
  }
);

const initialState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  stats: {
    totalProjects: 0,
    activeProjects: 0
  }
};

// Calculate stats from projects
const calculateStats = (projects) => {
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === "Active").length;
  
  return {
    totalProjects,
    activeProjects
  };
};

const employeeProjectSlice = createSlice({
  name: "employeeProjects",
  initialState,
  reducers: {
    clearProjectError: (state) => {
      state.error = null;
    },
    clearCurrentProject: (state) => {
      state.currentProject = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch My Projects
      .addCase(fetchMyProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
        state.stats = calculateStats(action.payload);
      })
      .addCase(fetchMyProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch your projects";
      })
      
      // Fetch Project Details
      .addCase(fetchProjectDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProject = action.payload;
      })
      .addCase(fetchProjectDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch project details";
      });
  }
});

export const { clearProjectError, clearCurrentProject } = employeeProjectSlice.actions;
export default employeeProjectSlice.reducer;