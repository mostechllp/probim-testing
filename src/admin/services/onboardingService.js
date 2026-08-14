// src/admin/services/onboardingService.js
import apiClient from '../../utils/apiClient';

const BASE_PATH = '/admin';

/**
 * Standard error handler — mirrors projectService pattern.
 */
const handleError = (error, defaultMessage) => {
  console.error('[OnboardingService] API Error:', error);
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
  return { message: error.message || defaultMessage };
};

class OnboardingService {
  // ─────────────────────────────────────────────────────────────────────────────
  // ONBOARDING WIZARD STEPS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get salary packages for a specific employee/user
   * GET api/admin/employees/salary-packages/{userId}
   * The userId here is the employee's user ID (the user being onboarded)
   */
  async getSalaryPackages(userId) {
    try {
      const response = await apiClient.get(`${BASE_PATH}/employees/salary-packages/${userId}`);
      return response.data;
    } catch (error) {
      console.error('[OnboardingService] getSalaryPackages error:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Step 2 – Save employee personal & professional details.
   * If employeeId is provided, UPDATE the existing employee (draft).
   * Otherwise, CREATE a new employee.
   * 
   * POST api/admin/employees/onboard/details (create)
   * PUT api/admin/employees/{employeeId} (update)
   */
  async saveDetails(payload, employeeId = null) {
    try {
      let response;
      
      if (employeeId) {
        // UPDATE existing draft employee
        response = await apiClient.put(`${BASE_PATH}/employees/${employeeId}`, payload);
      } else {
        // CREATE new employee
        response = await apiClient.post(`${BASE_PATH}/employees/onboard/details`, payload);
      }
      
      return response.data;
    } catch (error) {
      throw handleError(error, 'Failed to save employee details');
    }
  }

  /**
   * Step 3 – Save salary structure (components + payment cycle).
   * POST api/admin/employees/onboard/salary
   */
  async saveSalary(payload) {
    try {
      const response = await apiClient.post(`${BASE_PATH}/employees/onboard/salary`, payload);
      return response.data;
    } catch (error) {
      console.error('[Onboarding] saveSalary error:', error);
      throw handleError(error, 'Failed to save salary structure');
    }
  }

  /**
   * Step 3 – Save bank account details.
   * POST api/admin/employees/onboard/banks
   */
  async saveBanks(payload) {
    try {
      const response = await apiClient.post(`${BASE_PATH}/employees/onboard/banks`, payload);
      return response.data;
    } catch (error) {
      throw handleError(error, 'Failed to save bank details');
    }
  }

  /**
   * Step 5 – Complete / finalise the onboarding process.
   * If employeeId is provided, UPDATE the existing employee to complete.
   * Otherwise, use the complete endpoint.
   * 
   * POST api/admin/employees/onboard/complete (create)
   * PUT api/admin/employees/{employeeId}/complete (update)
   */
  async completeOnboarding(payload) {
    try {
      const { employeeId, ...restPayload } = payload;
      let response;
      
      if (employeeId) {
        // UPDATE existing draft employee to complete
        response = await apiClient.put(`${BASE_PATH}/employees/${employeeId}/complete`, restPayload);
      } else {
        // Create new employee from onboarding
        response = await apiClient.post(`${BASE_PATH}/employees/onboard/complete`, restPayload);
      }
      
      return response.data;
    } catch (error) {
      throw handleError(error, 'Failed to complete onboarding');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BANK DETAILS CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  async updateBankDetail(id, payload) {
    try {
      const response = await apiClient.put(`${BASE_PATH}/bank-details/${id}`, payload);
      return response.data;
    } catch (error) {
      throw handleError(error, 'Failed to update bank detail');
    }
  }

  async deleteBankDetail(id) {
    try {
      const response = await apiClient.delete(`${BASE_PATH}/bank-details/${id}`);
      return response.data;
    } catch (error) {
      throw handleError(error, 'Failed to delete bank detail');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SALARY COMPONENTS CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  async updateSalaryComponent(id, payload) {
    try {
      const response = await apiClient.put(`${BASE_PATH}/salary-components/${id}`, payload);
      return response.data;
    } catch (error) {
      throw handleError(error, 'Failed to update salary component');
    }
  }

  async deleteSalaryComponent(id) {
    try {
      const response = await apiClient.delete(`${BASE_PATH}/salary-components/${id}`);
      return response.data;
    } catch (error) {
      throw handleError(error, 'Failed to delete salary component');
    }
  }
}

export default new OnboardingService();