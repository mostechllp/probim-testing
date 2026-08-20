// src/admin/store/slices/onboardingSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { parseResumeTextWithAI } from "../../utils/openRouterService";
import { extractTextFromFile } from "../../utils/fileExtractor";
import onboardingService from "../../services/onboardingService";
import apiClient from "../../../utils/apiClient";

// ─────────────────────────────────────────────────────────────────────────────
// RESUME PARSING (existing)
// ─────────────────────────────────────────────────────────────────────────────

export const parseResume = createAsyncThunk(
  "onboarding/parseResume",
  async (file, { rejectWithValue }) => {
    try {
      const text = await extractTextFromFile(file);
      const parsedData = await parseResumeTextWithAI(text);
      return {
        ...parsedData,
        fileName: file.name,
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to parse resume");
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// SALARY PACKAGES
// ─────────────────────────────────────────────────────────────────────────────

export const fetchEmployeeSalaryPackages = createAsyncThunk(
  "onboarding/fetchEmployeeSalaryPackages",
  async (userId, { rejectWithValue }) => {
    try {
      if (!userId) {
        return rejectWithValue("User ID is required to fetch salary packages");
      }
      const response = await onboardingService.getSalaryPackages(userId);

      let packagesData = [];
      if (response?.data?.data) {
        packagesData = response.data.data;
      } else if (response?.data) {
        packagesData = response.data;
      } else if (Array.isArray(response)) {
        packagesData = response;
      } else if (response?.success !== false) {
        packagesData = response?.data || response || [];
      }
    

      return {
        data: packagesData,
        message: response?.message || "Salary packages fetched successfully",
      };
    } catch (error) {
      console.error("[onboarding] Fetch salary packages error:", error);
      return rejectWithValue(
        error.message || "Failed to fetch salary packages",
      );
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING WIZARD STEPS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST api/admin/onboarding/save-details
 * Save employee personal & professional details (Step 2).
 * This should UPDATE the draft employee, not create a new one.
 */
// In onboardingSlice.js - update the saveOnboardingDetails thunk

export const saveOnboardingDetails = createAsyncThunk(
  "onboarding/saveDetails",
  async (payload, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const employeeId = state.onboarding?.savedEmployeeId || null;
      
      // Pass the employeeId to the service
      const data = await onboardingService.saveDetails(payload, employeeId);
      return data;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);
/**
 * POST api/admin/employees/onboard/salary
 * Save salary structure (Step 3).
 */
export const saveOnboardingSalary = createAsyncThunk(
  "onboarding/saveSalary",
  async (payload, { rejectWithValue, getState }) => {
    try {
      const data = await onboardingService.saveSalary(payload);
      return data;
    } catch (error) {
      console.error("[onboarding] saveOnboardingSalary error:", error);
      return rejectWithValue(
        error.message || "Failed to save salary structure",
      );
    }
  },
);

/**
 * POST api/admin/employees/onboard/banks
 * Save bank account details (Step 3).
 */
export const saveOnboardingBanks = createAsyncThunk(
  "onboarding/saveBanks",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await onboardingService.saveBanks(payload);
      return data;
    } catch (error) {
      console.error("[onboarding] saveOnboardingBanks error:", error);
      return rejectWithValue(error.message || "Failed to save bank details");
    }
  },
);

/**
 * POST api/admin/employees/onboard/complete
 * Finalise the onboarding process (Step 5 / Final Review).
 * This should UPDATE the draft employee to make them active/complete,
 * not create a new employee.
 */

export const completeOnboardingAPI = createAsyncThunk(
  "onboarding/completeAPI",
  async (payload, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const employeeId = state.onboarding?.savedEmployeeId || null;
      
      // Pass the employeeId in the payload
      const data = await onboardingService.completeOnboarding({
        ...payload,
        employeeId: employeeId,
      });
      return data;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// BANK DETAILS CRUD
// ─────────────────────────────────────────────────────────────────────────────

export const updateBankDetail = createAsyncThunk(
  "onboarding/updateBankDetail",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await onboardingService.updateBankDetail(id, payload);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to update bank detail");
    }
  },
);

export const deleteBankDetail = createAsyncThunk(
  "onboarding/deleteBankDetail",
  async (id, { rejectWithValue }) => {
    try {
      await onboardingService.deleteBankDetail(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to delete bank detail");
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// SALARY COMPONENTS CRUD
// ─────────────────────────────────────────────────────────────────────────────

export const updateSalaryComponent = createAsyncThunk(
  "onboarding/updateSalaryComponent",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await onboardingService.updateSalaryComponent(id, payload);
      return { id, data };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to update salary component",
      );
    }
  },
);

export const deleteSalaryComponent = createAsyncThunk(
  "onboarding/deleteSalaryComponent",
  async (id, { rejectWithValue }) => {
    try {
      await onboardingService.deleteSalaryComponent(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to delete salary component",
      );
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: SANITIZE PACKAGES
// ─────────────────────────────────────────────────────────────────────────────

const sanitizePackages = (packages) => {
  if (!packages) return null;

  const sanitized = { ...packages };

  ["package1", "package2"].forEach((key) => {
    if (sanitized[key]) {
      if (
        sanitized[key].currency &&
        typeof sanitized[key].currency !== "string"
      ) {
        sanitized[key].currency = String(sanitized[key].currency);
      }
      if (sanitized[key].isSaved !== undefined) {
        sanitized[key].isSaved = Boolean(sanitized[key].isSaved);
      }
      if (!Array.isArray(sanitized[key].salaryComponents)) {
        sanitized[key].salaryComponents = [];
      }
      sanitized[key].salaryComponents = sanitized[key].salaryComponents.map(
        (comp) => ({
          ...comp,
          id: String(comp.id || Date.now()),
          name: String(comp.name || ""),
          price:
            typeof comp.price === "number"
              ? comp.price
              : parseFloat(comp.price) || 0,
        }),
      );
      if (sanitized[key].totalSalary !== undefined) {
        sanitized[key].totalSalary =
          typeof sanitized[key].totalSalary === "number"
            ? sanitized[key].totalSalary
            : parseFloat(sanitized[key].totalSalary) || 0;
      }
      if (sanitized[key].packageId !== undefined) {
        sanitized[key].packageId = sanitized[key].packageId;
      }
    }
  });

  return sanitized;
};

// ─────────────────────────────────────────────────────────────────────────────
// FETCH ALL ONBOARDING RECORDS
// ─────────────────────────────────────────────────────────────────────────────

export const fetchAllOnboarding = createAsyncThunk(
  "onboarding/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/employees/onboarding");
      
      if (response.data && response.data.status === "success") {
        return response.data.data || [];
      }
      
      return response.data || [];
    } catch (error) {
      console.error("[onboarding] fetchAllOnboarding error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch onboarding records"
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE ONBOARDING RECORD
// ─────────────────────────────────────────────────────────────────────────────

export const deleteOnboardingRecord = createAsyncThunk(
  "onboarding/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/admin/employees/onboarding/${id}`);
      
      if (response.data && response.data.status === "success") {
        return id;
      }
      
      return id;
    } catch (error) {
      console.error("[onboarding] deleteOnboardingRecord error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete onboarding record"
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// FETCH ONBOARDING BY ID (VIEW)
// ─────────────────────────────────────────────────────────────────────────────

export const fetchOnboardingById = createAsyncThunk(
  "onboarding/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      if (!id) {
        return rejectWithValue("Onboarding ID is required");
      }
      
      const response = await apiClient.get(`/admin/employees/onboarding/${id}`);
      
      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      
      return rejectWithValue(response.data?.message || "Failed to fetch onboarding details");
    } catch (error) {
      console.error("[onboarding] fetchOnboardingById error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch onboarding details"
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE ONBOARDING (Update existing onboarding record)
// ─────────────────────────────────────────────────────────────────────────────

export const updateOnboarding = createAsyncThunk(
  "onboarding/update",
  async ({ id, data }, { rejectWithValue, getState }) => {
    try {
      // Use the same service method as saveDetails but with employeeId
      const state = getState();
      const employeeId = id || state.onboarding?.savedEmployeeId || null;
      
      // Update the existing employee
      const response = await onboardingService.saveDetails(data, employeeId);
      return response;
    } catch (error) {
      console.error("[onboarding] updateOnboarding error:", error);
      return rejectWithValue(
        error.message || "Failed to update onboarding"
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE ONBOARDING STATUS
// ─────────────────────────────────────────────────────────────────────────────

export const updateOnboardingStatus = createAsyncThunk(
  "onboarding/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/admin/employees/onboarding/${id}/status`, {
        status: status
      });
      
      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      
      return rejectWithValue(response.data?.message || "Failed to update status");
    } catch (error) {
      console.error("[onboarding] updateOnboardingStatus error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to update onboarding status"
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// SLICE
// ─────────────────────────────────────────────────────────────────────────────

const initialState = {
  currentStep: 1,
  isLoading: false,
  error: null,
  resumeData: null,
  savedEmployeeId: null,
  availablePackages: [],
  packagesLoading: false,
  onboardingRecords: [],
  onboardingLoading: false,
  currentOnboarding: null,      // For view/edit
  viewLoading: false,
  employeeDetails: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationality: "",
    address: "",
    designation: "",
    department: "",
    skills: "",
    experience: "",
    education: "",
    joiningDate: "",
    paymentCycle: "Monthly",
    packages: {
      package1: {
        id: "package1",
        name: "Package 1 - Home Country / WFH",
        currency: "AED",
        salaryComponents: [],
        isSaved: false,
        totalSalary: 0,
        packageId: null,
      },
      package2: {
        id: "package2",
        name: "Package 2 - Dubai Onsite",
        currency: "AED",
        salaryComponents: [],
        isSaved: false,
        totalSalary: 0,
        packageId: null,
      },
    },
    bankAccounts: [],
  },
  offerLetter: {
    content: "",
    template: "standard",
    generated: false,
  },
  onboardingComplete: false,
};

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    setStep: (state, action) => {
      state.currentStep = action.payload;
    },
    updateEmployeeDetails: (state, action) => {
      const payload = { ...action.payload };

      if (payload.packages) {
        payload.packages = sanitizePackages(payload.packages);
      }

      if (payload.bankAccounts && Array.isArray(payload.bankAccounts)) {
        payload.bankAccounts = payload.bankAccounts.map((bank) => ({
          ...bank,
          id: String(bank.id || Date.now()),
          bankName: String(bank.bankName || ""),
          accountNumber: String(bank.accountNumber || ""),
          bankCountry: String(bank.bankCountry || "UAE"),
          bankIfsc: String(bank.bankIfsc || ""),
          bankBranch: String(bank.bankBranch || ""),
          bankIban: String(bank.bankIban || ""),
          bankSwift: String(bank.bankSwift || ""),
        }));
      }

      state.employeeDetails = {
        ...state.employeeDetails,
        ...payload,
      };
    },
    updateOfferLetter: (state, action) => {
      state.offerLetter = { ...state.offerLetter, ...action.payload };
    },
    resetOnboarding: () => {
      localStorage.removeItem("onboarding-draft");
      return initialState;
    },
    completeOnboarding: (state) => {
      state.onboardingComplete = true;
    },
    restoreDraft: (state, action) => {
      const draft = action.payload;
      if (draft.employeeDetails) {
        const details = { ...draft.employeeDetails };
        if (details.packages) {
          ["package1", "package2"].forEach((key) => {
            if (details.packages[key]) {
              delete details.packages[key].icon;
              if (!details.packages[key].iconName) {
                details.packages[key].iconName =
                  key === "package1" ? "FiHome" : "FiMapPin";
              }
              if (
                details.packages[key].currency &&
                typeof details.packages[key].currency !== "string"
              ) {
                details.packages[key].currency = String(
                  details.packages[key].currency,
                );
              }
              if (details.packages[key].packageId !== undefined) {
                details.packages[key].packageId =
                  details.packages[key].packageId;
              }
            }
          });
        }
        state.employeeDetails = details;
      }
      if (draft.currentStep) {
        state.currentStep = draft.currentStep;
      }
      if (draft.resumeData) {
        state.resumeData = draft.resumeData;
      }
      if (draft.savedEmployeeId) {
        state.savedEmployeeId = draft.savedEmployeeId;
      }
    },
    clearOnboardingError: (state) => {
      state.error = null;
    },
    clearPackages: (state) => {
      state.availablePackages = [];
    },
    setSavedEmployeeId: (state, action) => {
      state.savedEmployeeId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Resume Parsing ──────────────────────────────────────────────────────
      .addCase(parseResume.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(parseResume.fulfilled, (state, action) => {
        state.isLoading = false;
        state.resumeData = { fileName: action.payload.fileName };
        state.employeeDetails = { ...state.employeeDetails, ...action.payload };
        state.currentStep = 2;
      })
      .addCase(parseResume.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // ── Fetch Employee Salary Packages ──────────────────────────────────────
      .addCase(fetchEmployeeSalaryPackages.pending, (state) => {
        state.packagesLoading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeSalaryPackages.fulfilled, (state, action) => {
        state.packagesLoading = false;
        state.availablePackages = action.payload?.data || [];

        const packages = action.payload?.data || [];
        if (Array.isArray(packages) && packages.length >= 2) {
          const pkg1 = packages[0];
          const pkg2 = packages[1];

          if (pkg1) {
            state.employeeDetails.packages.package1.packageId = pkg1.id;
            state.employeeDetails.packages.package1.name = pkg1.name;
            if (pkg1.currency) {
              state.employeeDetails.packages.package1.currency = pkg1.currency;
            }
          }
          if (pkg2) {
            state.employeeDetails.packages.package2.packageId = pkg2.id;
            state.employeeDetails.packages.package2.name = pkg2.name;
            if (pkg2.currency) {
              state.employeeDetails.packages.package2.currency = pkg2.currency;
            }
          }
        }
      })
      .addCase(fetchEmployeeSalaryPackages.rejected, (state, action) => {
        state.packagesLoading = false;
        state.error = action.payload;
      })

      // ── Save Details ────────────────────────────────────────────────────────
      .addCase(saveOnboardingDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveOnboardingDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        // ✅ Store the employee ID (draft) so we can update it later
        const employeeId = action.payload?.data?.id || action.payload?.id;
        if (employeeId) {
          state.savedEmployeeId = employeeId;
          // Also save to localStorage so it persists
          try {
            const draftStr = localStorage.getItem("onboarding-draft");
            if (draftStr) {
              const draft = JSON.parse(draftStr);
              draft.savedEmployeeId = employeeId;
              localStorage.setItem("onboarding-draft", JSON.stringify(draft));
            }
          } catch (err) {
            console.error("Failed to save employee ID to draft:", err);
          }
        }
      })
      .addCase(saveOnboardingDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // ── Save Salary ─────────────────────────────────────────────────────────
      .addCase(saveOnboardingSalary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveOnboardingSalary.fulfilled, (state, action) => {
        state.isLoading = false;


        const responseData = action.payload?.data;
        if (responseData?.packages) {
          const apiPackages = responseData.packages;

          const updatedPackages = {
            package1: { ...state.employeeDetails.packages.package1 },
            package2: { ...state.employeeDetails.packages.package2 },
          };

          if (apiPackages.package1) {
            const pkg1 = apiPackages.package1;
            updatedPackages.package1 = {
              ...updatedPackages.package1,
              packageId: pkg1.id,
              id: pkg1.id,
              name: pkg1.name || updatedPackages.package1.name,
              currency: pkg1.currency || updatedPackages.package1.currency,
              isSaved: true,
              totalSalary: pkg1.total_monthly_salary || 0,
              salaryComponents: (pkg1.salary_components || []).map((comp) => ({
                id: comp.id,
                name: comp.component_name,
                price: comp.value,
              })),
            };
          }

          if (apiPackages.package2) {
            const pkg2 = apiPackages.package2;
            updatedPackages.package2 = {
              ...updatedPackages.package2,
              packageId: pkg2.id,
              id: pkg2.id,
              name: pkg2.name || updatedPackages.package2.name,
              currency: pkg2.currency || updatedPackages.package2.currency,
              isSaved: true,
              totalSalary: pkg2.total_monthly_salary || 0,
              salaryComponents: (pkg2.salary_components || []).map((comp) => ({
                id: comp.id,
                name: comp.component_name,
                price: comp.value,
              })),
            };
          }

          state.employeeDetails.packages = updatedPackages;

          if (responseData.payment_cycle) {
            state.employeeDetails.paymentCycle = responseData.payment_cycle;
          }

          try {
            const draftStr = localStorage.getItem("onboarding-draft");
            if (draftStr) {
              const draft = JSON.parse(draftStr);
              if (draft.employeeDetails) {
                draft.employeeDetails.packages = updatedPackages;
                draft.employeeDetails.paymentCycle =
                  state.employeeDetails.paymentCycle;
                localStorage.setItem("onboarding-draft", JSON.stringify(draft));
              }
            }
          } catch (err) {
            console.error("Failed to update draft with salary data:", err);
          }
        }
      })
      .addCase(saveOnboardingSalary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // ── Save Banks ──────────────────────────────────────────────────────────
      .addCase(saveOnboardingBanks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveOnboardingBanks.fulfilled, (state, action) => {
        state.isLoading = false;


        const responseData = action.payload?.data;
        if (responseData?.bank_details) {
          const updatedBankAccounts = responseData.bank_details.map((bank) => ({
            id: bank.id,
            bankCountry: bank.bank_country,
            bankName: bank.bank_name,
            accountNumber: bank.account_number,
            bankIfsc: bank.ifsc_code || "",
            bankBranch: bank.branch_name || "",
            bankIban: bank.iban_number || "",
            bankSwift: bank.swift_code || "",
          }));

          state.employeeDetails.bankAccounts = updatedBankAccounts;

          try {
            const draftStr = localStorage.getItem("onboarding-draft");
            if (draftStr) {
              const draft = JSON.parse(draftStr);
              if (draft.employeeDetails) {
                draft.employeeDetails.bankAccounts = updatedBankAccounts;
                localStorage.setItem("onboarding-draft", JSON.stringify(draft));
              }
            }
          } catch (err) {
            console.error("Failed to update draft with bank data:", err);
          }
        }
      })
      .addCase(saveOnboardingBanks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // ── Complete Onboarding ─────────────────────────────────────────────────
      .addCase(completeOnboardingAPI.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeOnboardingAPI.fulfilled, (state) => {
        state.isLoading = false;
        state.onboardingComplete = true;
        // Clear the saved employee ID after completion
        state.savedEmployeeId = null;
      })
      .addCase(completeOnboardingAPI.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // ── Update Bank Detail ──────────────────────────────────────────────────
      .addCase(updateBankDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBankDetail.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(updateBankDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // ── Delete Bank Detail ──────────────────────────────────────────────────
      .addCase(deleteBankDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteBankDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        if (Array.isArray(state.employeeDetails.bankAccounts)) {
          state.employeeDetails.bankAccounts =
            state.employeeDetails.bankAccounts.filter(
              (b) => String(b.id) !== String(action.payload),
            );
        }
      })
      .addCase(deleteBankDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // ── Update Salary Component ─────────────────────────────────────────────
      .addCase(updateSalaryComponent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSalaryComponent.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(updateSalaryComponent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // ── Delete Salary Component ─────────────────────────────────────────────
      .addCase(deleteSalaryComponent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteSalaryComponent.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.employeeDetails.packages) {
          ["package1", "package2"].forEach((key) => {
            if (
              state.employeeDetails.packages[key] &&
              Array.isArray(
                state.employeeDetails.packages[key].salaryComponents,
              )
            ) {
              state.employeeDetails.packages[key].salaryComponents =
                state.employeeDetails.packages[key].salaryComponents.filter(
                  (c) => String(c.id) !== String(action.payload),
                );
            }
          });
        }
      })
      .addCase(deleteSalaryComponent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // ── Fetch All Onboarding ──────────────────────────────────────────────────
  .addCase(fetchAllOnboarding.pending, (state) => {
    state.onboardingLoading = true;
    state.error = null;
  })
  .addCase(fetchAllOnboarding.fulfilled, (state, action) => {
    state.onboardingLoading = false;
    state.onboardingRecords = action.payload || [];
  })
  .addCase(fetchAllOnboarding.rejected, (state, action) => {
    state.onboardingLoading = false;
    state.error = action.payload;
  })

  // ── Delete Onboarding Record ──────────────────────────────────────────────
  .addCase(deleteOnboardingRecord.pending, (state) => {
    state.isLoading = true;
    state.error = null;
  })
  .addCase(deleteOnboardingRecord.fulfilled, (state, action) => {
    state.isLoading = false;
    // Remove the deleted record from the list
    state.onboardingRecords = state.onboardingRecords.filter(
      (record) => record.id !== action.payload
    );
  })
  .addCase(deleteOnboardingRecord.rejected, (state, action) => {
    state.isLoading = false;
    state.error = action.payload;
  })
    // ── Fetch Onboarding by ID ────────────────────────────────────────────────
  .addCase(fetchOnboardingById.pending, (state) => {
    state.viewLoading = true;
    state.error = null;
    state.currentOnboarding = null;
  })
  .addCase(fetchOnboardingById.fulfilled, (state, action) => {
    state.viewLoading = false;
    state.currentOnboarding = action.payload;
  })
  .addCase(fetchOnboardingById.rejected, (state, action) => {
    state.viewLoading = false;
    state.error = action.payload;
  })

  // ── Update Onboarding ─────────────────────────────────────────────────────
  .addCase(updateOnboarding.pending, (state) => {
    state.isLoading = true;
    state.error = null;
  })
  .addCase(updateOnboarding.fulfilled, (state, action) => {
    state.isLoading = false;
    // Update current onboarding if it exists
    if (state.currentOnboarding) {
      state.currentOnboarding = {
        ...state.currentOnboarding,
        ...action.payload?.data,
      };
    }
    // Update in the list if present
    if (state.onboardingRecords) {
      const index = state.onboardingRecords.findIndex(
        (item) => item.id === action.payload?.data?.id
      );
      if (index !== -1) {
        state.onboardingRecords[index] = {
          ...state.onboardingRecords[index],
          ...action.payload?.data,
        };
      }
    }
  })
  .addCase(updateOnboarding.rejected, (state, action) => {
    state.isLoading = false;
    state.error = action.payload;
  })

  // ── Update Onboarding Status ─────────────────────────────────────────────
  .addCase(updateOnboardingStatus.pending, (state) => {
    state.isLoading = true;
    state.error = null;
  })
  .addCase(updateOnboardingStatus.fulfilled, (state, action) => {
    state.isLoading = false;
    // Update status in current onboarding
    if (state.currentOnboarding) {
      state.currentOnboarding.status = action.payload?.status;
      if (state.currentOnboarding.user) {
        state.currentOnboarding.user.status = action.payload?.status;
      }
    }
    // Update in the list
    if (state.onboardingRecords) {
      const index = state.onboardingRecords.findIndex(
        (item) => item.id === action.payload?.id
      );
      if (index !== -1) {
        state.onboardingRecords[index].status = action.payload?.status;
        if (state.onboardingRecords[index].user) {
          state.onboardingRecords[index].user.status = action.payload?.status;
        }
      }
    }
  })
  .addCase(updateOnboardingStatus.rejected, (state, action) => {
    state.isLoading = false;
    state.error = action.payload;
  });
  },
});

export const {
  setStep,
  updateEmployeeDetails,
  updateOfferLetter,
  resetOnboarding,
  completeOnboarding,
  restoreDraft,
  clearOnboardingError,
  clearPackages,
  setSavedEmployeeId,
} = onboardingSlice.actions;

export default onboardingSlice.reducer;