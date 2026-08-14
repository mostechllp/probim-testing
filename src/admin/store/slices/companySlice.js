import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

// Fetch companies for a specific organization
export const fetchCompanies = createAsyncThunk(
  "companies/fetchAll",
  async (organizationId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/companies");
      let companies = response.data.data || [];
      // Filter companies by organization
      if (organizationId) {
        companies = companies.filter(
          (company) => company.organization_id === parseInt(organizationId),
        );
      }
      return { companies, organizationId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch companies",
      );
    }
  },
);

// Add company
export const addCompany = createAsyncThunk(
  "companies/add",
  async (companyData, { rejectWithValue }) => {
    try {
      // Don't set headers here - let the interceptor handle it
      const response = await apiClient.post("/admin/companies", companyData);
      return response.data.data;
    } catch (error) {
      console.error("Company add error:", error.response?.data);
      
      // Return detailed validation errors
      if (error.response?.data?.errors) {
        return rejectWithValue({
          message: error.response.data.message,
          errors: error.response.data.errors
        });
      }
      
      const errorMessage = error.response?.data?.message || "Failed to add company";
      return rejectWithValue(errorMessage);
    }
  },
);

// Update company
export const updateCompany = createAsyncThunk(
  "companies/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const payload = {
        organization_id: parseInt(data.organization_id),
        company_name: data.company_name,
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
      };

      const response = await apiClient.put(`/admin/companies/${id}`, payload);
      return response.data.data;
    } catch (error) {
      console.error("Company update error:", error.response?.data);
      return rejectWithValue(
        error.response?.data?.message || "Failed to update company",
      );
    }
  },
);

// Delete company
export const deleteCompany = createAsyncThunk(
  "companies/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/admin/companies/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Delete failed");
    }
  },
);

// Fetch single company by ID
export const fetchCompanyById = createAsyncThunk(
  "companies/fetchById",
  async ({ organizationId, companyId }, { rejectWithValue }) => {
    try {
      // First fetch all companies for the organization
      const response = await apiClient.get("/admin/companies");
      let companies = response.data.data || [];

      // Filter by organization
      companies = companies.filter(
        (company) => company.organization_id === parseInt(organizationId),
      );

      // Find the specific company
      const company = companies.find((c) => c.id === parseInt(companyId));

      if (!company) {
        return rejectWithValue("Company not found");
      }

      return { company, organizationId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch company",
      );
    }
  },
);

const companySlice = createSlice({
  name: "companies",
  initialState: {
    companies: [],
    currentCompany: null,
    currentOrganizationId: null,
    currentOrganizationName: null,
    loading: false,
    error: null,
    totalCount: 0,
  },
  reducers: {
    clearCompanies: (state) => {
      state.companies = [];
      state.currentOrganizationId = null;
      state.currentOrganizationName = null;
      state.currentCompany = null;
    },
    setCurrentOrganization: (state, action) => {
      state.currentOrganizationId = action.payload.id;
      state.currentOrganizationName = action.payload.name;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Companies
      .addCase(fetchCompanies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrganizationId = action.payload.organizationId;
        state.companies = action.payload.companies.map((company) => ({
          id: company.id,
          name: company.company_name,
          company_name: company.company_name,
          phone: company.phone || "-",
          email: company.email || "-",
          address: company.address || "-",
          logo: company.logo || null,
          organization_id: company.organization_id,
          createdAt: company.created_at
            ? new Date(company.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "-",
          raw: company,
        }));
        state.totalCount = action.payload.companies.length;
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      // Fetch Single Company
      .addCase(fetchCompanyById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrganizationId = action.payload.organizationId;
        state.currentCompany = {
          id: action.payload.company.id,
          name: action.payload.company.company_name,
          company_name: action.payload.company.company_name,
          phone: action.payload.company.phone || "",
          email: action.payload.company.email || "",
          address: action.payload.company.address || "",
          logo: action.payload.company.logo || null,
          organization_id: action.payload.company.organization_id,
          raw: action.payload.company,
        };
      })
      .addCase(fetchCompanyById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      // Add Company
      .addCase(addCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCompany.fulfilled, (state, action) => {
        state.loading = false;
        const newCompany = {
          id: action.payload.id,
          name: action.payload.company_name,
          company_name: action.payload.company_name,
          phone: action.payload.phone || "-",
          email: action.payload.email || "-",
          address: action.payload.address || "-",
          logo: action.payload.logo || null,
          organization_id: action.payload.organization_id,
          createdAt: action.payload.created_at
            ? new Date(action.payload.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
          raw: action.payload,
        };
        state.companies.unshift(newCompany);
        state.totalCount += 1;
      })
      .addCase(addCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      // Update Company
      .addCase(updateCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCompany.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.companies.findIndex(
          (company) => company.id === action.payload.id,
        );
        if (index !== -1) {
          state.companies[index] = {
            ...state.companies[index],
            name: action.payload.company_name,
            company_name: action.payload.company_name,
            phone: action.payload.phone || "-",
            email: action.payload.email || "-",
            address: action.payload.address || "-",
            logo: action.payload.logo || state.companies[index].logo,
            raw: action.payload,
          };
        }
        // Also update currentCompany if it matches
        if (
          state.currentCompany &&
          state.currentCompany.id === action.payload.id
        ) {
          state.currentCompany = {
            ...state.currentCompany,
            name: action.payload.company_name,
            company_name: action.payload.company_name,
            phone: action.payload.phone || "-",
            email: action.payload.email || "-",
            address: action.payload.address || "-",
            raw: action.payload,
          };
        }
      })
      .addCase(updateCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      // Delete Company
      .addCase(deleteCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.companies = state.companies.filter(
          (company) => company.id !== action.payload,
        );
        state.totalCount -= 1;
      })
      .addCase(deleteCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearCompanies, setCurrentOrganization, clearError } =
  companySlice.actions;
export default companySlice.reducer;
