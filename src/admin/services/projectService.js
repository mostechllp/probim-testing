// src/admin/services/projectService.js
import apiClient from "../../utils/apiClient";

const BASE_PATH = "/admin";

/**
 * Standard utility to parse errors and extract message and structure.
 */
const handleError = (error, defaultMessage) => {
  console.error("API Service Error:", error);
  if (error.response && error.response.data) {
    const data = error.response.data;
    if (data.errors) {
      return {
        message: data.message || defaultMessage,
        errors: data.errors,
        status: error.response.status,
      };
    }
    return {
      message: data.message || defaultMessage,
      status: error.response.status,
    };
  }
  return {
    message: error.message || defaultMessage,
  };
};

/**
 * Translates camelCase UI fields to backend snake_case database fields.
 */
const mapProjectPayload = (data) => {
  const payload = { ...data };

  if (payload.managerId !== undefined) {
    payload.project_manager_id = payload.managerId
      ? Number(payload.managerId)
      : null;
    delete payload.managerId;
  }
  if (payload.teamLeadId !== undefined) {
    payload.team_lead_id = payload.teamLeadId
      ? Number(payload.teamLeadId)
      : null;
    delete payload.teamLeadId;
  }

  return payload;
};

class ProjectService {
  /**
   * Fetch all projects
   * GET /admin/projects
   */
  async getProjects() {
    try {
      const response = await apiClient.get(`${BASE_PATH}/projects`);
      return response.data;
    } catch (error) {
      throw handleError(error, "Failed to fetch projects");
    }
  }

  /**
   * Create a new project
   * POST /admin/projects
   */
  async createProject(projectData) {
    try {
      const mappedData = mapProjectPayload(projectData);
      const response = await apiClient.post(
        `${BASE_PATH}/projects`,
        mappedData,
      );
      return response.data;
    } catch (error) {
      throw handleError(error, "Failed to create project");
    }
  }

  /**
   * View a single project details
   * GET /admin/projects/{project}
   */
  async getProjectById(projectId) {
    try {
      const response = await apiClient.get(
        `${BASE_PATH}/projects/${projectId}`,
      );
      return response.data;
    } catch (error) {
      throw handleError(error, "Failed to fetch project details");
    }
  }

  /**
   * Update project details
   * PUT /admin/projects/{project}
   */
  async updateProject(projectId, projectData) {
    try {
      const mappedData = mapProjectPayload(projectData);
      const response = await apiClient.put(
        `${BASE_PATH}/projects/${projectId}`,
        mappedData,
      );
      return response.data;
    } catch (error) {
      throw handleError(error, "Failed to update project");
    }
  }

  /**
   * Partial Update support
   * PATCH /admin/projects/{project}
   */
  async patchProject(projectId, patchData) {
    try {
      const mappedData = mapProjectPayload(patchData);
      const response = await apiClient.patch(
        `${BASE_PATH}/projects/${projectId}`,
        mappedData,
      );
      return response.data;
    } catch (error) {
      throw handleError(error, "Failed to update project field");
    }
  }

  /**
   * Delete a project
   * DELETE /admin/projects/{project}
   */
  async deleteProject(projectId) {
    try {
      const response = await apiClient.delete(
        `${BASE_PATH}/projects/${projectId}`,
      );
      return response.data;
    } catch (error) {
      throw handleError(error, "Failed to delete project");
    }
  }

  /**
   * Fetch all employee project assignments
   * GET /admin/project-assignments
   */
  async getProjectAssignments() {
    try {
      const response = await apiClient.get(`${BASE_PATH}/project-assignments`);
      
      return response.data;
    } catch (error) {
      console.error(
        `[API ERROR] GET ${BASE_PATH}/project-assignments | Error:`,
        error,
      );
      throw handleError(error, "Failed to fetch project assignments");
    }
  }
  /**
   * Fetch all employees for project assignments
   */
  async getEmployeesForProjectAssignments() {
    try {
      const response = await apiClient.get(`${BASE_PATH}/project-assignments/employees`);
  
      return response.data;
    } catch (error) {
      console.error(
        `[API ERROR] GET ${BASE_PATH}/project-assignments/employees | Error:`,
        error,
      );
      throw handleError(error, "Failed to fetch employees for project assignments");
    }
  }

  /**
   * Assign projects to an employee
   * POST /admin/employees/projects
   */
  async assignProjectsToEmployee(employeeId, projectIds) {
    try {
      const payload = {
        employee_id: employeeId,
        project_ids: projectIds,
      };
      const response = await apiClient.post(
        `${BASE_PATH}/employees/projects`,
        payload,
      );
      return response.data;
    } catch (error) {
      console.error(
        `[API ERROR] POST ${BASE_PATH}/employees/projects | Error:`,
        error,
      );
      throw handleError(error, "Failed to assign projects to employee");
    }
  }

  /**
   * Get employee assigned projects
   * GET /admin/employees/projects?employee_id={employee}
   */
  async getEmployeeProjects(employeeId) {
    try {
      const response = await apiClient.get(`${BASE_PATH}/employees/projects`, {
        params: { employee_id: employeeId },
      });
      return response.data;
    } catch (error) {
      console.error(
        `[API ERROR] GET ${BASE_PATH}/employees/projects | Error:`,
        error,
      );
      throw handleError(error, "Failed to fetch projects assigned to employee");
    }
  }

  /**
   * Update employee project assignment details
   * PUT /admin/employees/projects
   */
  async updateEmployeeProject(employeeId, projectId, assignmentData) {
    try {
      const payload = {
        employee_id: employeeId,
        project_id: projectId,
        ...assignmentData,
      };
      const response = await apiClient.put(
        `${BASE_PATH}/employees/projects`,
        payload,
      );
      return response.data;
    } catch (error) {
      console.error(
        `[API ERROR] PUT ${BASE_PATH}/employees/projects | Error:`,
        error,
      );
      throw handleError(error, "Failed to update employee project assignment");
    }
  }

  /**
   * Remove employee project assignment
   * DELETE /admin/employees/projects
   */
  async removeEmployeeProject(employeeId, projectId) {
    try {
      const payload = {
        employee_id: employeeId,
        project_id: projectId,
      };
      const response = await apiClient.delete(
        `${BASE_PATH}/employees/projects`,
        {
          data: payload,
        },
      );
      return response.data;
    } catch (error) {
      console.error(
        `[API ERROR] DELETE ${BASE_PATH}/employees/projects | Error:`,
        error,
      );
      throw handleError(error, "Failed to remove employee project assignment");
    }
  }

  /**
   * Get employees assigned to a project
   * GET /admin/projects/{project}/employees
   */
  async getProjectEmployees(projectId) {
    try {
      const response = await apiClient.get(
        `${BASE_PATH}/projects/${projectId}/employees`,
      );
      return response.data;
    } catch (error) {
      console.error(
        `[API ERROR] GET ${BASE_PATH}/projects/${projectId}/employees | Error:`,
        error,
      );
      throw handleError(error, "Failed to fetch employees assigned to project");
    }
  }

  /**
   * Tag multiple employees to a project (Bulk assign)
   * POST /admin/projects/{project}/employees
   */
  async assignEmployeesToProject(projectId, employeeIds) {
    try {
      const response = await apiClient.post(
        `${BASE_PATH}/projects/${projectId}/employees`,
        {
          employee_ids: employeeIds,
        },
      );
      return response.data;
    } catch (error) {
      console.error(
        `[API ERROR] POST ${BASE_PATH}/projects/${projectId}/employees | Error:`,
        error,
      );
      throw handleError(error, "Failed to tag employees to project");
    }
  }

  /**
   * Get working time for employee's assigned projects
   * GET /admin/project-assignments/{employeeId}/working-time
   */
  async getEmployeeProjectWorkingTime(userId) {
    try {
      const response = await apiClient.get(
        `${BASE_PATH}/project-assignments/${userId}/working-time`,
      );
      return response.data;
    } catch (error) {
      console.error(
        `[API ERROR] GET ${BASE_PATH}/project-assignments/${userId}/working-time | Error:`,
        error,
      );
      throw handleError(error, "Failed to fetch employee project working time");
    }
  }
  /**
   * Remove all project assignments for an employee
   * DELETE /admin/project-assignments/{employeeId}/all
   */
  async removeAllEmployeeProjects(employeeId) {
    try {
      const response = await apiClient.delete(
        `${BASE_PATH}/project-assignments/${employeeId}/all`,
      );
      return response.data;
    } catch (error) {
      console.error(
        `[API ERROR] DELETE ${BASE_PATH}/project-assignments/${employeeId}/all | Error:`,
        error,
      );
      throw handleError(error, "Failed to remove all project assignments");
    }
  }
}

export default new ProjectService();
