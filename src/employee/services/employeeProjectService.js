import apiClient from "../../utils/apiClient";

const employeeProjectService = {
  // Get projects assigned to the logged-in employee - Accept employeeId as parameter
  getMyProjects: async (employeeId) => {
    try {
      if (!employeeId) {
        // If no employeeId provided, try to fetch it
        const userResponse = await apiClient.get("/auth/me");
        const user = userResponse.data.data || userResponse.data;
        employeeId = user.employee?.id || user.id;
      }
      
      
      if (!employeeId) {
        throw new Error("Employee ID is required");
      }
      
      // Use the project-assignments endpoint with the employee ID
      const response = await apiClient.get(`/admin/project-assignments/${employeeId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching employee projects:", error);
      throw error.response?.data || error;
    }
  },

  // Alternative: Using the employee projects endpoint
  getMyProjectsAlt: async (employeeId) => {
    try {
      if (!employeeId) {
        const userResponse = await apiClient.get("/auth/me");
        const user = userResponse.data.data || userResponse.data;
        employeeId = user.employee?.id || user.id;
      }
      
      const response = await apiClient.get(`/admin/employees/${employeeId}/projects`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get project details by ID
  getProjectById: async (projectId) => {
    try {
      const response = await apiClient.get(`/admin/projects/${projectId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get employees assigned to a project
  getProjectEmployees: async (projectId) => {
    try {
      const response = await apiClient.get(`/admin/projects/${projectId}/employees`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default employeeProjectService;