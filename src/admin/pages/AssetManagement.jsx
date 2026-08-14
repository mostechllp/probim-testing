import { useState, useEffect } from "react";
import {
  Laptop,
  Smartphone,
  Printer,
  Monitor,
  Package,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  AlertCircle,
  Users,
  Tag,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "../components/common/Toast";
import { fetchEmployees } from "../store/slices/employeeSlice";
import {
  fetchAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  assignAsset,
  revokeAsset,
  fetchAssetTypes,
  createAssetType,
  setCurrentPage,
  clearError,
} from "../store/slices/assetSlice";
import ConfirmModal from "../components/common/ConfirmModal";
import { useNavigate } from "react-router-dom";
import { AssignAssetModal } from "../components/assets/AssignAssetModal";
import { AssetTypeModal } from "../components/assets/AssetTypeModal";
import { AssetFormModal } from "../components/assets/AssetFormModal";

const DEFAULT_ASSET_TYPES = [
  {
    id: "laptop",
    name: "Laptop",
    icon: <Laptop size={16} />,
    category: "Electronics",
  },
  {
    id: "desktop",
    name: "Desktop",
    icon: <Monitor size={16} />,
    category: "Electronics",
  },
  {
    id: "monitor",
    name: "Monitor",
    icon: <Monitor size={16} />,
    category: "Electronics",
  },
  {
    id: "mobile",
    name: "Mobile Phone",
    icon: <Smartphone size={16} />,
    category: "Electronics",
  },
  {
    id: "tablet",
    name: "Tablet",
    icon: <Smartphone size={16} />,
    category: "Electronics",
  },
  {
    id: "printer",
    name: "Printer",
    icon: <Printer size={16} />,
    category: "Office Equipment",
  },
  {
    id: "scanner",
    name: "Scanner",
    icon: <Printer size={16} />,
    category: "Office Equipment",
  },
  {
    id: "furniture",
    name: "Furniture",
    icon: <Package size={16} />,
    category: "Furniture",
  },
  {
    id: "accessory",
    name: "Accessory",
    icon: <Package size={16} />,
    category: "Accessories",
  },
  {
    id: "other",
    name: "Other",
    icon: <Package size={16} />,
    category: "Other",
  },
];

// Asset status options
// eslint-disable-next-line react-refresh/only-export-components
export const ASSET_STATUS = [
  {
    id: "available",
    label: "Available",
    color: "green",
    bgClass:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  },
  {
    id: "assigned",
    label: "Assigned",
    color: "blue",
    bgClass: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  },
  {
    id: "maintenance",
    label: "Under Maintenance",
    color: "orange",
    bgClass:
      "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  },
  {
    id: "damaged",
    label: "Damaged",
    color: "red",
    bgClass: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  },
  {
    id: "disposed",
    label: "Disposed",
    color: "gray",
    bgClass: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400",
  },
];
const AssetManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State for modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showAssetTypeModal, setShowAssetTypeModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [assetToRevoke, setAssetToRevoke] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    asset_name: "",
    asset_type_id: "",
    serial_number: "",
    model: "",
    brand: "",
    purchase_date: "",
    purchase_price: "",
    warranty_expiry: "",
    status: "available",
    description: "",
  });

  // Asset type form state
  const [assetTypeData, setAssetTypeData] = useState({
    name: "",
    category: "",
    icon: "",
  });

  // Assignment form state
  const [assignmentData, setAssignmentData] = useState({
    employeeId: "",
    employeeName: "",
    assignedDate: "",
    expectedReturnDate: "",
    notes: "",
  });

  // Redux state
  const {
    assets,
    assetTypes,
    loading,
    error,
    totalCount,
    currentPage,
    perPage,
    stats,
  } = useSelector((state) => state.assets);
  const { employees, loading: employeesLoading } = useSelector(
    (state) => state.employees,
  );

  // Fetch data on mount
  useEffect(() => {
    dispatch(
      fetchAssets({
        page: currentPage,
        perPage: perPage,
        type: selectedTypeFilter,
        status: selectedStatusFilter,
        search: searchQuery,
      }),
    );
    dispatch(fetchAssetTypes());
    dispatch(fetchEmployees());
  }, [dispatch]);

  // Refetch when filters change
  useEffect(() => {
    dispatch(
      fetchAssets({
        page: currentPage,
        perPage: perPage,
        type: selectedTypeFilter,
        status: selectedStatusFilter,
        search: searchQuery,
      }),
    );
  }, [
    dispatch,
    currentPage,
    selectedTypeFilter,
    selectedStatusFilter,
    searchQuery,
  ]);

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast(error, "error");
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Get asset types from API or use defaults
  const assetTypeOptions =
    assetTypes.length > 0 ? assetTypes : DEFAULT_ASSET_TYPES;

  // Get asset icon
  // Get asset icon - use the type relation from the API
  const getAssetIcon = (asset) => {
    // Get type name from the type relation or asset_type_id
    const typeName = asset.type?.name || asset.asset_type_id;
    const type = assetTypeOptions.find(
      (t) => t.id === typeName || t.id === asset.asset_type_id,
    );
    return type?.icon || <Package size={16} />;
  };

  // Get status badge style
  // Get status badge style - handle both cases
  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase();
    const statusConfig = ASSET_STATUS.find((s) => s.id === normalizedStatus);
    return (
      statusConfig?.bgClass ||
      "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400"
    );
  };

  // Get status label
  const getStatusLabel = (status) => {
    const normalizedStatus = status?.toLowerCase();
    const statusConfig = ASSET_STATUS.find((s) => s.id === normalizedStatus);
    return statusConfig?.label || status;
  };

  // Reset forms
  const resetForm = () => {
    setFormData({
      asset_name: "",
      asset_type_id: "",
      serial_number: "",
      model: "",
      brand: "",
      purchase_date: "",
      purchase_price: "",
      warranty_expiry: "",
      status: "available",
      description: "",
    });
    setSelectedAsset(null);
  };

  const resetAssetTypeForm = () => {
    setAssetTypeData({
      label: "",
      category: "",
      icon: "",
    });
  };

  const resetAssignmentForm = () => {
    setAssignmentData({
      employeeId: "",
      employeeName: "",
      assignedDate: "",
      expectedReturnDate: "",
      notes: "",
    });
  };

  // Add new asset type
  // Add new asset type
  const handleAddAssetType = async () => {
    if (!assetTypeData.name.trim()) {
      showToast("Please enter asset type name", "error");
      return;
    }
    if (!assetTypeData.category) {
      showToast("Please select a category", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dispatch(createAssetType(assetTypeData)).unwrap();
      showToast("Asset type added successfully", "success");
      setShowAssetTypeModal(false);
      resetAssetTypeForm();
      // Refresh asset types
      dispatch(fetchAssetTypes());
    } catch (err) {
      console.error("Create asset type error:", err);

      // Check if it's a validation error with specific message
      if (typeof err === "object" && err !== null) {
        // If error has errors object (validation errors)
        if (err.errors && err.errors.name) {
          showToast(err.errors.name[0], "error");
        }
        // If error has message property
        else if (err.message) {
          showToast(err.message, "error");
        }
        // If error is a string
        else if (typeof err === "string") {
          showToast(err, "error");
        } else {
          showToast("Failed to add asset type", "error");
        }
      } else if (typeof err === "string") {
        showToast(err, "error");
      } else {
        showToast("Failed to add asset type", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  // Add new asset
  // Add new asset
  const handleAddAsset = async () => {
    if (!formData.asset_name?.trim()) {
      showToast("Please enter asset name", "error");
      return;
    }
    if (!formData.asset_type_id) {
      showToast("Please select asset type", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dispatch(createAsset(formData)).unwrap();
      showToast("Asset added successfully", "success");
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      showToast(err || "Failed to add asset", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit asset
  // Edit asset
  const handleEditAsset = async () => {
    if (!formData.asset_name?.trim()) {
      showToast("Please enter asset name", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dispatch(
        updateAsset({ id: selectedAsset.id, assetData: formData }),
      ).unwrap();
      showToast("Asset updated successfully", "success");
      setShowEditModal(false);
      resetForm();
    } catch (err) {
      showToast(err || "Failed to update asset", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assign asset to employee
  // Assign asset to employee
  const handleAssignAsset = async () => {
    if (!assignmentData.employeeId) {
      showToast("Please select an employee", "error");
      return;
    }
    if (!assignmentData.assignedDate) {
      showToast("Please select assigned date", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dispatch(
        assignAsset({
          id: selectedAsset.id,
          assignmentData: {
            employee_id: assignmentData.employeeId,
            employee_name: assignmentData.employeeName,
            assigned_date: assignmentData.assignedDate,
            expected_return_date: assignmentData.expectedReturnDate,
            notes: assignmentData.notes,
          },
        }),
      ).unwrap();

      showToast(
        `Asset assigned to ${assignmentData.employeeName} successfully`,
        "success",
      );
      setShowAssignModal(false);
      resetAssignmentForm();

      // Refresh the assets list to get updated data
      dispatch(
        fetchAssets({
          page: currentPage,
          perPage: perPage,
          type: selectedTypeFilter,
          status: selectedStatusFilter,
          search: searchQuery,
        }),
      );
    } catch (err) {
      showToast(err || "Failed to assign asset", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unassign asset
  // Unassign asset with confirmation
  const handleUnassignAsset = (asset) => {
    setAssetToRevoke(asset);
    setRevokeConfirmOpen(true);
  };

  // Actual revoke function after confirmation
  const confirmRevokeAsset = async () => {
    if (!assetToRevoke) return;

    setIsSubmitting(true);
    try {
      const result = await dispatch(
        revokeAsset({ id: assetToRevoke.id, reason: "Offboarding completion" }),
      ).unwrap();

      // Show success message
      if (result.message) {
        showToast(result.message, "success");
      } else {
        showToast("Asset unassigned successfully", "success");
      }

      // Refresh the assets list to get updated data
      await dispatch(
        fetchAssets({
          page: currentPage,
          perPage: perPage,
          type: selectedTypeFilter,
          status: selectedStatusFilter,
          search: searchQuery,
        }),
      );
    } catch (err) {
      console.error("Unassign error:", err);
      if (typeof err === "object" && err?.message) {
        showToast(err.message, "error");
      } else if (typeof err === "string") {
        showToast(err, "error");
      } else {
        showToast("Failed to unassign asset", "error");
      }
    } finally {
      setIsSubmitting(false);
      setRevokeConfirmOpen(false);
      setAssetToRevoke(null);
    }
  };

  // Delete asset
  const handleDeleteAsset = async () => {
    setIsSubmitting(true);
    try {
      await dispatch(deleteAsset(selectedAsset.id)).unwrap();
      showToast("Asset deleted successfully", "success");
      setDeleteConfirmOpen(false);
      setSelectedAsset(null);
    } catch (err) {
      showToast(err || "Failed to delete asset", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open modals
  const openEditModal = (asset) => {
    setSelectedAsset(asset);
    setFormData({
      asset_name: asset.asset_name,
      asset_type_id: asset.asset_type_id,
      serial_number: asset.serial_number || "",
      model: asset.model || "",
      brand: asset.brand || "",
      purchase_date: asset.purchase_date || "",
      purchase_price: asset.purchase_price || "",
      warranty_expiry: asset.warranty_expiry || "",
      status: asset.status,
      description: asset.description || "",
    });
    setShowEditModal(true);
  };

  // Get the latest active assignment from the assigned_to array
  const getLatestAssignment = (asset) => {
    if (!asset.assigned_to || asset.assigned_to.length === 0) {
      return null;
    }

    // Filter active assignments and get the latest by assigned_date
    const activeAssignments = asset.assigned_to.filter(
      (a) => a.status === "Active",
    );
    if (activeAssignments.length === 0) {
      return null;
    }

    // Sort by assigned_date descending and get the latest
    const sortedAssignments = [...activeAssignments].sort(
      (a, b) => new Date(b.assigned_date) - new Date(a.assigned_date),
    );

    return sortedAssignments[0];
  };

  const openAssignModal = (asset) => {
    setSelectedAsset(asset);
    setAssignmentData({
      employeeId: "",
      employeeName: "",
      assignedDate: new Date().toISOString().split("T")[0], // Set default to today
      expectedReturnDate: "",
      notes: "",
    });
    setShowAssignModal(true);
  };

  const openDeleteConfirm = (asset) => {
    setSelectedAsset(asset);
    setDeleteConfirmOpen(true);
  };

  // Pagination
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (currentPage - 1) * perPage;

  return (
    <div className="w-full overflow-x-hidden">
      {/* Header with Add Button */}
      <div className="flex flex-wrap justify-between items-center mb-4 md:mb-6">
        <h2 className="text-lg md:text-2xl font-bold gradient-heading bg-clip-text text-transparent">
          Assets
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/admin/employees/assets/types")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
          >
            <Tag size={18} />
            Manage Asset Types
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
          >
            <Plus size={18} />
            Add New Asset
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Assigned</p>
          <p className="text-xl font-bold text-blue-600">{stats.assigned}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Available</p>
          <p className="text-xl font-bold text-green-600">{stats.available}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Maintenance
          </p>
          <p className="text-xl font-bold text-orange-600">
            {stats.maintenance}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Damaged</p>
          <p className="text-xl font-bold text-red-600">{stats.damaged}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Disposed</p>
          <p className="text-xl font-bold text-gray-600">{stats.disposed}</p>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="overflow-x-auto pb-2 mb-4 md:mb-5 -mx-4 px-4">
        <div className="flex gap-2 min-w-max border-b border-gray-200 dark:border-gray-700 pb-3">
          <button
            onClick={() => {
              setSelectedTypeFilter("all");
              dispatch(setCurrentPage(1));
            }}
            className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
              selectedTypeFilter === "all"
                ? "bg-green-500 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            All Assets
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
              {stats.total}
            </span>
          </button>
          {assetTypeOptions.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setSelectedTypeFilter(type.id);
                dispatch(setCurrentPage(1));
              }}
              className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
                selectedTypeFilter === type.id
                  ? "bg-green-500 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {type.icon}
              <span className="hidden sm:inline">{type.name}</span>
              <span className="sm:hidden">{type.name.charAt(0)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-5">
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search assets by name, ID or serial number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
          />
        </div>

        <select
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
        >
          <option value="all">All Status</option>
          {ASSET_STATUS.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 dark:text-gray-400">
              Loading assets...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Assets Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-soft">
            <div className="min-w-[800px] md:min-w-0">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Sl.No.
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Asset
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Details
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Type
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Assigned To
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-right text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assets.length > 0 ? (
                    assets.map((asset, idx) => (
                      <tr
                        key={asset.id}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
                          {start + idx + 1}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              {getAssetIcon(asset)}
                            </div>
                            <div>
                              <p className="text-xs md:text-sm font-bold text-gray-900 dark:text-white">
                                {asset.asset_name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <div className="space-y-0.5">
                            {asset.model && (
                              <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-semibold">Model:</span>{" "}
                                {asset.model}
                              </p>
                            )}
                            {asset.serial_number && (
                              <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-semibold">SN:</span>{" "}
                                <span className="font-mono">
                                  {asset.serial_number}
                                </span>
                              </p>
                            )}
                            {!asset.model && !asset.serialNumber && (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {asset.type?.name || "-"}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <span
                            className={`inline-flex px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold ${getStatusBadge(asset.status)}`}
                          >
                            {getStatusLabel(asset.status)}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          {(() => {
                            const latestAssignment = getLatestAssignment(asset);
                            if (latestAssignment && latestAssignment.employee) {
                              return (
                                <div>
                                  <p className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                                    {latestAssignment.employee.first_name}{" "}
                                    {latestAssignment.employee.last_name}
                                  </p>
                                  <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
                                    Since:{" "}
                                    {new Date(
                                      latestAssignment.assigned_date,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              );
                            }
                            return (
                              <span className="text-xs text-gray-400">
                                Not assigned
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-right">
                          <div className="flex items-center justify-end gap-1 md:gap-2">
                            {(() => {
                              const latestAssignment =
                                getLatestAssignment(asset);
                              return (
                                !latestAssignment && (
                                  <button
                                    onClick={() => openAssignModal(asset)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors"
                                    title="Assign to employee"
                                    disabled={isSubmitting}
                                  >
                                    <Users size={16} />
                                  </button>
                                )
                              );
                            })()}
                            {(() => {
                              const latestAssignment =
                                getLatestAssignment(asset);
                              return (
                                latestAssignment && (
                                  <button
                                    onClick={() => handleUnassignAsset(asset)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-orange-600 dark:text-orange-400 transition-colors"
                                    title="Unassign asset"
                                    disabled={isSubmitting}
                                  >
                                    <X size={16} />
                                  </button>
                                )
                              );
                            })()}
                            <button
                              onClick={() => openEditModal(asset)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600 transition-colors"
                              title="Edit asset"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(asset)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600 transition-colors"
                              title="Delete asset"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        No assets found. Click "Add New Asset" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => dispatch(setCurrentPage(currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => dispatch(setCurrentPage(currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <AssetFormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        onSubmit={handleAddAsset}
        formData={formData}
        setFormData={setFormData}
        assetTypeOptions={assetTypeOptions}
        isSubmitting={isSubmitting}
        isEdit={false}
      />

      <AssetFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        onSubmit={handleEditAsset}
        formData={formData}
        setFormData={setFormData}
        assetTypeOptions={assetTypeOptions}
        isSubmitting={isSubmitting}
        isEdit={true}
      />

      <AssetTypeModal
        isOpen={showAssetTypeModal}
        onClose={() => {
          setShowAssetTypeModal(false);
          resetAssetTypeForm();
        }}
        onSubmit={handleAddAssetType}
        typeData={assetTypeData}
        setTypeData={setAssetTypeData}
        isSubmitting={isSubmitting}
      />

      <AssignAssetModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          resetAssignmentForm();
        }}
        onSubmit={handleAssignAsset}
        assignmentData={assignmentData}
        setAssignmentData={setAssignmentData}
        selectedAsset={selectedAsset}
        employees={employees}
        employeesLoading={employeesLoading}
        isSubmitting={isSubmitting}
      />

      {/* Revoke/Unassign Confirmation Modal */}
      <ConfirmModal
        isOpen={revokeConfirmOpen}
        onClose={() => {
          setRevokeConfirmOpen(false);
          setAssetToRevoke(null);
        }}
        onConfirm={confirmRevokeAsset}
        title="Unassign Asset"
        message={`Are you sure you want to unassign "${assetToRevoke?.asset_name}" from ${assetToRevoke?.assigned_to?.[0]?.employee?.first_name} ${assetToRevoke?.assigned_to?.[0]?.employee?.last_name}?`}
        confirmText="Unassign"
        cancelText="Cancel"
        loading={isSubmitting}
      />

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setSelectedAsset(null);
        }}
        onConfirm={handleDeleteAsset}
        title="Delete Asset"
        message={`Are you sure you want to delete "${selectedAsset?.asset_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={isSubmitting}
      />
    </div>
  );
};

export default AssetManagement;
