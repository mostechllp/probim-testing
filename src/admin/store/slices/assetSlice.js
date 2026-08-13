import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

// ----------------------------------------------------
// ASSET TYPES API ENDPOINTS
// ----------------------------------------------------

// Fetch all asset types - GET /assets/types
export const fetchAssetTypes = createAsyncThunk(
  "assets/fetchTypes",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/admin/assets/types");
      console.log("Asset types fetched:", response.data);

      // Handle if response is directly the array
      if (Array.isArray(response.data)) {
        return response.data;
      }
      // Handle if response has status and data
      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      // Handle if response has data property
      if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to fetch asset types",
      );
    } catch (error) {
      console.error("Fetch asset types error:", error.response?.data);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch asset types",
      );
    }
  },
);

// Create asset type - POST /admin/assets/types
export const createAssetType = createAsyncThunk(
  "assets/createType",
  async (typeData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/admin/assets/types", typeData);
      console.log("Asset type created:", response.data);

      // Check if response has the created data (has id property)
      if (response.data && response.data.id) {
        return response.data;
      }
      // Check for success status
      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to create asset type",
      );
    } catch (error) {
      console.error("Create asset type error:", error.response?.data);

      // Return the full error response including validation errors
      if (error.response?.data?.errors) {
        return rejectWithValue({
          message: error.response.data.message,
          errors: error.response.data.errors,
        });
      }

      return rejectWithValue(
        error.response?.data?.message || "Failed to create asset type",
      );
    }
  },
);

// Fetch asset type by ID - GET /assets/types/{id}
export const fetchAssetTypeById = createAsyncThunk(
  "assets/fetchTypeById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/admin/assets/types/${id}`);
      console.log("Asset type fetched:", response.data);

      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to fetch asset type",
      );
    } catch (error) {
      console.error("Fetch asset type by ID error:", error.response?.data);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch asset type",
      );
    }
  },
);

// Update asset type - PUT /admin/assets/types/{id}
export const updateAssetType = createAsyncThunk(
  "assets/updateType",
  async ({ id, typeData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(
        `/admin/assets/types/${id}`,
        typeData,
      );
      console.log("Asset type updated:", response.data);

      // Check if response has the updated data (has id property)
      if (response.data && response.data.id) {
        return response.data;
      }
      // Check for success status
      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to update asset type",
      );
    } catch (error) {
      console.error("Update asset type error:", error.response?.data);

      // Return validation errors if present
      if (error.response?.data?.errors) {
        return rejectWithValue({
          message: error.response.data.message,
          errors: error.response.data.errors,
        });
      }

      return rejectWithValue(
        error.response?.data?.message || "Failed to update asset type",
      );
    }
  },
);

// Delete asset type - DELETE /admin/assets/types/{id}
export const deleteAssetType = createAsyncThunk(
  "assets/deleteType",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/admin/assets/types/${id}`);
      console.log("Asset type deleted:", response.data);

      // Check if deletion was successful
      if (
        response.data &&
        (response.data.status === "success" || response.data.message)
      ) {
        return { id, message: response.data.message };
      }
      if (response.status === 200 || response.status === 204) {
        return { id, message: "Asset type deleted successfully" };
      }
      return rejectWithValue(
        response.data?.message || "Failed to delete asset type",
      );
    } catch (error) {
      console.error("Delete asset type error:", error.response?.data);

      if (error.response?.data?.errors) {
        return rejectWithValue({
          message: error.response.data.message,
          errors: error.response.data.errors,
        });
      }

      return rejectWithValue(
        error.response?.data?.message || "Failed to delete asset type",
      );
    }
  },
);

// ----------------------------------------------------
// ASSETS API ENDPOINTS
// ----------------------------------------------------

// Fetch all assets - GET /admin/assets
export const fetchAssets = createAsyncThunk(
  "assets/fetchAll",
  async (
    { page = 1, perPage = 10, type = "all", status = "all", search = "" } = {},
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams({
        page,
        per_page: perPage,
        ...(type !== "all" && { type }),
        ...(status !== "all" && { status }),
        ...(search && { search }),
      });

      const response = await apiClient.get(`/admin/assets?${params}`);
      console.log("Assets fetched:", response.data);

      if (Array.isArray(response.data)) {
        return {
          data: response.data,
          total: response.data.length,
          current_page: page,
          per_page: perPage,
        };
      }
      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to fetch assets",
      );
    } catch (error) {
      console.error("Fetch assets error:", error.response?.data);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch assets",
      );
    }
  },
);

// NEW: Fetch assets assigned to a specific employee - GET /api/employee/assets/{id}
export const fetchEmployeeAssets = createAsyncThunk(
  "assets/fetchEmployeeAssets",
  async (employeeId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/admin/assets/employee/${employeeId}`);
      console.log("Employee assets fetched:", response.data);

      if (response.data && response.data.success === true) {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to fetch employee assets",
      );
    } catch (error) {
      console.error("Fetch employee assets error:", error.response?.data);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employee assets",
      );
    }
  },
);

// Create asset - POST /admin/assets
export const createAsset = createAsyncThunk(
  "assets/create",
  async (assetData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/admin/assets", assetData);
      console.log("Asset created:", response.data);

      if (response.data && response.data.id) {
        return response.data;
      }
      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to create asset",
      );
    } catch (error) {
      console.error("Create asset error:", error.response?.data);

      if (error.response?.data?.errors) {
        return rejectWithValue({
          message: error.response.data.message,
          errors: error.response.data.errors,
        });
      }

      return rejectWithValue(
        error.response?.data?.message || "Failed to create asset",
      );
    }
  },
);

// Fetch asset by ID - GET /admin/assets/{id}
export const fetchAssetById = createAsyncThunk(
  "assets/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/admin/assets/${id}`);
      console.log("Asset fetched:", response.data);

      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(response.data?.message || "Failed to fetch asset");
    } catch (error) {
      console.error("Fetch asset by ID error:", error.response?.data);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch asset",
      );
    }
  },
);

// Update asset - PUT /admin/assets/{id}
export const updateAsset = createAsyncThunk(
  "assets/update",
  async ({ id, assetData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/admin/assets/${id}`, assetData);
      console.log("Asset updated:", response.data);

      if (response.data && response.data.id) {
        return response.data;
      }
      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to update asset",
      );
    } catch (error) {
      console.error("Update asset error:", error.response?.data);

      if (error.response?.data?.errors) {
        return rejectWithValue({
          message: error.response.data.message,
          errors: error.response.data.errors,
        });
      }

      return rejectWithValue(
        error.response?.data?.message || "Failed to update asset",
      );
    }
  },
);

// Delete asset - DELETE /admin/assets/{id}
export const deleteAsset = createAsyncThunk(
  "assets/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/admin/assets/${id}`);
      console.log("Asset deleted:", response.data);

      if (
        response.data &&
        (response.data.status === "success" || response.data.id)
      ) {
        return {
          id,
          message: response.data.message || "Asset deleted successfully",
        };
      }
      if (response.status === 200 || response.status === 204) {
        return { id, message: "Asset deleted successfully" };
      }
      return rejectWithValue(
        response.data?.message || "Failed to delete asset",
      );
    } catch (error) {
      console.error("Delete asset error:", error.response?.data);

      if (error.response?.data?.errors) {
        return rejectWithValue({
          message: error.response.data.message,
          errors: error.response.data.errors,
        });
      }

      return rejectWithValue(
        error.response?.data?.message || "Failed to delete asset",
      );
    }
  },
);

// Assign asset to employee - POST /admin/assets/{id}/assign
export const assignAsset = createAsyncThunk(
  "assets/assign",
  async ({ id, assignmentData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        `/admin/assets/${id}/assign`,
        assignmentData,
      );
      console.log("Asset assigned:", response.data);

      if (response.data && response.data.id) {
        return response.data;
      }
      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      return rejectWithValue(
        response.data?.message || "Failed to assign asset",
      );
    } catch (error) {
      console.error("Assign asset error:", error.response?.data);

      if (error.response?.data?.errors) {
        return rejectWithValue({
          message: error.response.data.message,
          errors: error.response.data.errors,
        });
      }

      return rejectWithValue(
        error.response?.data?.message || "Failed to assign asset",
      );
    }
  },
);

// Revoke asset assignment - POST /admin/assets/{id}/revoke
export const revokeAsset = createAsyncThunk(
  "assets/revoke",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/admin/assets/${id}/revoke`, {
        reason,
      });
      console.log("Asset assignment revoked:", response.data);

      if (
        response.data &&
        response.data.message === "Asset revoked successfully"
      ) {
        return { id, message: response.data.message };
      }
      if (response.data && response.data.id) {
        return response.data;
      }
      if (response.data && response.data.status === "success") {
        return response.data.data || { id };
      }
      return rejectWithValue(
        response.data?.message || "Failed to revoke asset assignment",
      );
    } catch (error) {
      console.error("Revoke asset error:", error.response?.data);

      if (error.response?.data?.errors) {
        return rejectWithValue({
          message: error.response.data.message,
          errors: error.response.data.errors,
        });
      }

      return rejectWithValue(
        error.response?.data?.message || "Failed to revoke asset assignment",
      );
    }
  },
);

// ----------------------------------------------------
// INITIAL STATE
// ----------------------------------------------------
const initialState = {
  assets: [],
  assetTypes: [],
  employeeAssets: [],
  currentAsset: null,
  currentAssetType: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  perPage: 10,
  filters: {
    type: "all",
    status: "all",
    search: "",
  },
  stats: {
    total: 0,
    assigned: 0,
    available: 0,
    maintenance: 0,
    damaged: 0,
    disposed: 0,
  },
};

// ----------------------------------------------------
// SLICE
// ----------------------------------------------------
const assetSlice = createSlice({
  name: "assets",
  initialState,
  reducers: {
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setPerPage: (state, action) => {
      state.perPage = action.payload;
      state.currentPage = 1;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.currentPage = 1;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.currentPage = 1;
    },
    clearCurrentAsset: (state) => {
      state.currentAsset = null;
    },
    clearCurrentAssetType: (state) => {
      state.currentAssetType = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateLocalAsset: (state, action) => {
      const index = state.assets.findIndex((a) => a.id === action.payload.id);
      if (index !== -1) {
        state.assets[index] = action.payload;
      }
    },
    clearEmployeeAssets: (state) => {
      state.employeeAssets = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Asset Types
      .addCase(fetchAssetTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssetTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.assetTypes = action.payload || [];
      })
      .addCase(fetchAssetTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create Asset Type
      .addCase(createAssetType.fulfilled, (state, action) => {
        state.assetTypes.push(action.payload);
      })

      // Update Asset Type
      .addCase(updateAssetType.fulfilled, (state, action) => {
        const index = state.assetTypes.findIndex(
          (t) => t.id === action.payload.id,
        );
        if (index !== -1) {
          state.assetTypes[index] = action.payload;
        }
      })

      // Delete Asset Type
      .addCase(deleteAssetType.fulfilled, (state, action) => {
        state.assetTypes = state.assetTypes.filter(
          (t) => t.id !== action.payload.id,
        );
      })

      // Fetch Assets
      .addCase(fetchAssets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssets.fulfilled, (state, action) => {
        state.loading = false;
        const apiData = action.payload || {};

        if (Array.isArray(apiData)) {
          state.assets = apiData;
          state.totalCount = apiData.length;
        } else {
          state.assets = apiData.data || [];
          state.totalCount = apiData.total || state.assets.length;
          state.currentPage = apiData.current_page || 1;
          state.perPage = apiData.per_page || 10;
        }

        state.stats = {
          total: state.assets.length,
          assigned: state.assets.filter(
            (a) => a.assigned_to && a.assigned_to.length > 0,
          ).length,
          available: state.assets.filter(
            (a) => a.status?.toLowerCase() === "available",
          ).length,
          maintenance: state.assets.filter(
            (a) => a.status?.toLowerCase() === "maintenance",
          ).length,
          damaged: state.assets.filter(
            (a) => a.status?.toLowerCase() === "damaged",
          ).length,
          disposed: state.assets.filter(
            (a) => a.status?.toLowerCase() === "disposed",
          ).length,
        };
      })
      .addCase(fetchAssets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // NEW: Fetch Employee Assets
      .addCase(fetchEmployeeAssets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeAssets.fulfilled, (state, action) => {
        state.loading = false;
        state.employeeAssets = action.payload || [];
      })
      .addCase(fetchEmployeeAssets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create Asset
      .addCase(createAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAsset.fulfilled, (state, action) => {
        state.loading = false;
        state.assets.unshift(action.payload);
        state.totalCount += 1;

        if (action.payload.status === "assigned") {
          state.stats.assigned += 1;
        } else if (action.payload.status === "available") {
          state.stats.available += 1;
        } else if (action.payload.status === "maintenance") {
          state.stats.maintenance += 1;
        }
        state.stats.total += 1;
      })
      .addCase(createAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Asset By ID
      .addCase(fetchAssetById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssetById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAsset = action.payload;
      })
      .addCase(fetchAssetById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Asset
      .addCase(updateAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAsset.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.assets.findIndex((a) => a.id === action.payload.id);
        if (index !== -1) {
          state.assets[index] = action.payload;
        }
        if (state.currentAsset?.id === action.payload.id) {
          state.currentAsset = action.payload;
        }
      })
      .addCase(updateAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete Asset
      .addCase(deleteAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAsset.fulfilled, (state, action) => {
        state.loading = false;
        state.assets = state.assets.filter((a) => a.id !== action.payload.id);
        state.totalCount -= 1;

        const deletedAsset = state.assets.find(
          (a) => a.id === action.payload.id,
        );
        if (deletedAsset) {
          if (deletedAsset.status === "assigned") {
            state.stats.assigned -= 1;
          } else if (deletedAsset.status === "available") {
            state.stats.available -= 1;
          } else if (deletedAsset.status === "maintenance") {
            state.stats.maintenance -= 1;
          }
        }
        state.stats.total -= 1;
      })
      .addCase(deleteAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Assign Asset
      .addCase(assignAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(assignAsset.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.assets.findIndex((a) => a.id === action.payload.id);
        if (index !== -1) {
          state.assets[index] = action.payload;
        }
        if (state.currentAsset?.id === action.payload.id) {
          state.currentAsset = action.payload;
        }

        if (action.payload.status === "assigned") {
          state.stats.assigned += 1;
          state.stats.available -= 1;
        }
      })
      .addCase(assignAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Revoke Asset
      .addCase(revokeAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(revokeAsset.fulfilled, (state, action) => {
        state.loading = false;

        if (action.payload && action.payload.id) {
          const index = state.assets.findIndex(
            (a) => a.id === action.payload.id,
          );
          if (index !== -1) {
            state.assets[index] = {
              ...state.assets[index],
              status: "available",
              assigned_to: [],
            };
          }
          if (state.currentAsset?.id === action.payload.id) {
            state.currentAsset = {
              ...state.currentAsset,
              status: "available",
              assigned_to: [],
            };
          }

          state.stats.available += 1;
          state.stats.assigned -= 1;
        }
      })
      .addCase(revokeAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// ----------------------------------------------------
// EXPORT ACTIONS AND REDUCER
// ----------------------------------------------------
export const {
  setCurrentPage,
  setPerPage,
  setFilters,
  resetFilters,
  clearCurrentAsset,
  clearCurrentAssetType,
  clearError,
  updateLocalAsset,
  clearEmployeeAssets,
} = assetSlice.actions;

export default assetSlice.reducer;