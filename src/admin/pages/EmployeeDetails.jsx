import { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "../../components/common/Toast";
import { fetchEmployeeById } from "@admin/store/slices/employeeSlice";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiFileText,
  FiDownload,
  FiEdit,
  FiArrowLeft,
  FiXCircle,
  FiCreditCard,
  FiPhoneCall,
  FiFlag,
  FiHeart,
  FiHome,
  FiCalendar,
  FiAward,
  FiDollarSign,
  FiCreditCard as FiCreditCardIcon,
  FiGlobe as FiGlobeIcon,
  FiSave,
  FiTrash2,
  FiPlus,
  FiX,
  FiPackage,
} from "react-icons/fi";
import { FaIdCard, FaVenusMars, FaPassport } from "react-icons/fa";
import { fetchOrganizations } from "../store/slices/organizationSlice";
import { fetchCompanies } from "../store/slices/companySlice";
import { fetchRoles } from "../store/slices/roleSlice";
import apiClient from "../../utils/apiClient";
import ConfirmModal from "../components/common/ConfirmModal";

const EmployeeDetails = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const location = useLocation();
  
  const getBasePath = () => {
    if (location.pathname.startsWith('/admin')) return '/admin';
    if (location.pathname.startsWith('/employee')) return '/employee';
    return '';
  };
  const basePath = getBasePath();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const [editingComponent, setEditingComponent] = useState(null);
  const [editingBankDetail, setEditingBankDetail] = useState(null);
  const [editingPackage, setEditingPackage] = useState(null);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newComponent, setNewComponent] = useState({
    component_name: "",
    value: "",
    employee_salary_package_id: null,
  });
  const [newBank, setNewBank] = useState({
    bank_country: "India",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    branch_name: "",
    iban_number: "",
    swift_code: "",
  });

  const { currentEmployee } = useSelector((state) => state.employees || {});
  const { organizations = [] } = useSelector(
    (state) => state.organizations || {},
  );
  const { roles = [] } = useSelector((state) => state.roles || {});

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
    id: null,
    title: "",
    message: "",
    loading: false,
  });

  useEffect(() => {
    if (id) {
      fetchEmployeeData();
    }
  }, [dispatch, id]);

  useEffect(() => {
    dispatch(fetchOrganizations());
    dispatch(fetchCompanies());
    dispatch(fetchRoles());
  }, [dispatch]);

  const getOrganizationName = (organizationId) => {
    if (!organizationId) return "N/A";
    const org = organizations.find(
      (org) => org.id === parseInt(organizationId),
    );
    return org?.name || "N/A";
  };

  const getRoleName = (roleId) => {
    if (!roleId) return "N/A";
    const role = roles.find((role) => role.id === parseInt(roleId));
    return role?.name || `Role ID: ${roleId}`;
  };

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      await dispatch(fetchEmployeeById(id));
    } catch (error) {
      showToast("Failed to load employee details", error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Package Helpers ──────────────────────────────────────────────────
  const getEmployeePackages = () => {
    return currentEmployee.salary_packages || currentEmployee.packages || [];
  };

  const getPackageTotal = (pkg) => {
    if (!pkg || !pkg.salary_components) return 0;
    return pkg.salary_components.reduce(
      (sum, comp) => sum + parseFloat(comp.value || 0),
      0,
    );
  };

  // ─── Delete Handlers ──────────────────────────────────────────────────
  const handleDeleteComponentClick = (componentId, componentName, packageId) => {
    setConfirmModal({
      isOpen: true,
      type: "component",
      id: componentId,
      packageId: packageId,
      title: "Delete Salary Component",
      message: `Are you sure you want to delete "${componentName}"? This action cannot be undone.`,
      loading: false,
    });
  };

  const handleDeletePackageClick = (packageId, packageName) => {
    setConfirmModal({
      isOpen: true,
      type: "package",
      id: packageId,
      title: "Delete Salary Package",
      message: `Are you sure you want to delete "${packageName}" package? This action cannot be undone.`,
      loading: false,
    });
  };

  const handleDeleteBankDetailClick = (bankId, bankName) => {
    setConfirmModal({
      isOpen: true,
      type: "bank",
      id: bankId,
      title: "Delete Bank Account",
      message: `Are you sure you want to delete "${bankName}" bank account? This action cannot be undone.`,
      loading: false,
    });
  };

  // ─── Execute Delete ──────────────────────────────────────────────────
  const executeDelete = async () => {
    const { type, id, packageId } = confirmModal;

    setConfirmModal((prev) => ({ ...prev, loading: true }));

    try {
      if (type === "component") {
        const response = await apiClient.delete(
          `/admin/salary-components/${id}`,
        );
        if (response.data.status === "success") {
          showToast("Salary component deleted successfully", "success");
          fetchEmployeeData();
          setConfirmModal({
            isOpen: false,
            type: null,
            id: null,
            title: "",
            message: "",
            loading: false,
          });
        } else {
          showToast(
            response.data.message || "Failed to delete salary component",
            "error",
          );
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      } else if (type === "package") {
        const response = await apiClient.delete(`/admin/salary-packages/${id}`);
        if (response.data.status === "success") {
          showToast("Salary package deleted successfully", "success");
          fetchEmployeeData();
          setConfirmModal({
            isOpen: false,
            type: null,
            id: null,
            title: "",
            message: "",
            loading: false,
          });
        } else {
          showToast(
            response.data.message || "Failed to delete salary package",
            "error",
          );
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      } else if (type === "bank") {
        const response = await apiClient.delete(`/admin/bank-details/${id}`);
        if (response.data.status === "success") {
          showToast("Bank details deleted successfully", "success");
          fetchEmployeeData();
          setConfirmModal({
            isOpen: false,
            type: null,
            id: null,
            title: "",
            message: "",
            loading: false,
          });
        } else {
          showToast(
            response.data.message || "Failed to delete bank details",
            "error",
          );
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      }
    } catch (error) {
      console.error("Error deleting:", error);
      showToast(error.response?.data?.message || "Failed to delete", "error");
      setConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      type: null,
      id: null,
      title: "",
      message: "",
      loading: false,
    });
  };

  const handleUpdateComponent = async (componentId, updatedData, packageId) => {
    try {
      const employeeId = currentEmployee.id || currentEmployee.employee_id;
      const response = await apiClient.put(
        `/admin/salary-components/${componentId}`,
        {
          employee_id: employeeId,
          employee_salary_package_id: packageId,
          component_name: updatedData.component_name,
          value: updatedData.value,
        },
      );
      if (response.data.status === "success") {
        showToast("Salary component updated successfully", "success");
        setEditingComponent(null);
        fetchEmployeeData();
      } else {
        showToast(
          response.data.message || "Failed to update salary component",
          "error",
        );
      }
    } catch (error) {
      console.error("Error updating salary component:", error);
      showToast(
        error.response?.data?.message || "Failed to update salary component",
        "error",
      );
    }
  };

  const handleAddComponent = async () => {
    if (!newComponent.component_name || !newComponent.value) {
      showToast("Please fill in all fields", "error");
      return;
    }

    if (!newComponent.employee_salary_package_id) {
      showToast("Please select a package", "error");
      return;
    }

    try {
      const employeeId = currentEmployee.id || currentEmployee.employee_id;

      if (!employeeId) {
        showToast(
          "Employee ID not found. Please refresh and try again.",
          "error",
        );
        return;
      }

      const payload = {
        employee_id: employeeId,
        employee_salary_package_id: newComponent.employee_salary_package_id,
        component_name: newComponent.component_name,
        value: parseFloat(newComponent.value).toFixed(2),
      };

      const response = await apiClient.post(
        "/admin/salary-components",
        payload,
      );

      if (response.data.status === "success") {
        showToast("Salary component added successfully", "success");
        setShowAddComponent(false);
        setNewComponent({
          component_name: "",
          value: "",
          employee_salary_package_id: null,
        });
        fetchEmployeeData();
      } else {
        showToast(
          response.data.message || "Failed to add salary component",
          "error",
        );
      }
    } catch (error) {
      console.error("Error adding salary component:", error);
      showToast(
        error.response?.data?.message || "Failed to add salary component",
        "error",
      );
    }
  };

  // ─── Package CRUD ────────────────────────────────────────────────────
  const handleAddPackage = async () => {
    showToast("Package management coming soon", "info");
  };

  // ─── Bank CRUD ──────────────────────────────────────────────────────
  const handleAddBankDetail = async () => {
    if (!newBank.bank_name || !newBank.account_number) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    if (newBank.bank_country === "India" && !newBank.ifsc_code) {
      showToast("IFSC Code is required for Indian bank accounts", "error");
      return;
    }
    if (newBank.bank_country === "UAE" && !newBank.iban_number) {
      showToast("IBAN Number is required for UAE bank accounts", "error");
      return;
    }

    try {
      const existingBanks = currentEmployee.bank_details || [];
      const newBankFormatted = {
        bank_country: newBank.bank_country,
        bank_name: newBank.bank_name,
        account_number: newBank.account_number,
        ifsc_code: newBank.bank_country === "India" ? newBank.ifsc_code : null,
        branch_name:
          newBank.bank_country === "India" ? newBank.branch_name : null,
        iban_number:
          newBank.bank_country === "UAE" ? newBank.iban_number : null,
        swift_code: newBank.bank_country === "UAE" ? newBank.swift_code : null,
      };

      const allBanks = [...existingBanks, newBankFormatted];
      const payload = {
        user_id: currentEmployee.user_id || currentEmployee.user?.id,
        bank_details: allBanks,
      };

      const response = await apiClient.post(
        "/admin/employees/onboard/banks",
        payload,
      );

      if (response.data.status === "success") {
        showToast("Bank details added successfully", "success");
        setShowAddBank(false);
        setNewBank({
          bank_country: "India",
          bank_name: "",
          account_number: "",
          ifsc_code: "",
          branch_name: "",
          iban_number: "",
          swift_code: "",
        });
        fetchEmployeeData();
      } else {
        showToast(
          response.data.message || "Failed to add bank details",
          "error",
        );
      }
    } catch (error) {
      console.error("Error adding bank details:", error);
      showToast(
        error.response?.data?.message || "Failed to add bank details",
        "error",
      );
    }
  };

  const handleUpdateBankDetail = async (bankId, updatedData) => {
    try {
      const response = await apiClient.put(
        `/admin/bank-details/${bankId}`,
        updatedData,
      );

      if (response.data.status === "success") {
        showToast("Bank details updated successfully", "success");
        setEditingBankDetail(null);
        fetchEmployeeData();
      } else {
        showToast(
          response.data.message || "Failed to update bank details",
          "error",
        );
      }
    } catch (error) {
      console.error("Error updating bank details:", error);
      showToast(
        error.response?.data?.message || "Failed to update bank details",
        "error",
      );
    }
  };

  // ─── Document Helpers ────────────────────────────────────────────────
  const getDocumentUrl = (documentPath) => {
    if (!documentPath) return null;
    const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
    return `${baseUrl}/storage/${documentPath}`;
  };

  const getPhotoUrl = (photoValue) => {
    if (!photoValue) return null;

    if (photoValue.startsWith("/tmp/")) {
      const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
      return `${baseUrl}/storage/temp/${photoValue.replace("/tmp/", "")}`;
    }

    if (photoValue.startsWith("data:")) return photoValue;
    if (photoValue.startsWith("http://") || photoValue.startsWith("https://"))
      return photoValue;

    const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";

    if (photoValue.startsWith("/storage/")) return `${baseUrl}${photoValue}`;

    if (!photoValue.includes("/")) {
      return `${baseUrl}/storage/avatars/${photoValue}`;
    }

    return `${baseUrl}/storage/${photoValue}`;
  };

  const getEmployeePhoto = () => {
    const possiblePhotoFields = [
      currentEmployee?.avatar,
      currentEmployee?.avatar_path,
      currentEmployee?.passport_size_photo,
      currentEmployee?.profile_photo,
      currentEmployee?.photo,
      currentEmployee?.user?.avatar,
      currentEmployee?.user?.avatar_path,
    ];

    for (const fieldValue of possiblePhotoFields) {
      if (fieldValue && typeof fieldValue === "string") {
        const resolvedPhoto = getPhotoUrl(fieldValue);
        if (resolvedPhoto) return resolvedPhoto;
      }
    }

    if (currentEmployee?.avatar && typeof currentEmployee.avatar === "object") {
      if (currentEmployee.avatar.path) {
        return getPhotoUrl(currentEmployee.avatar.path);
      }
    }

    return null;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";

    try {
      if (dateValue instanceof Date) {
        return dateValue.toLocaleDateString("en-GB");
      }

      if (typeof dateValue === "string") {
        if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateValue.split("-");
          return `${day}/${month}/${year}`;
        }

        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("en-GB");
        }
      }

      return dateValue;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const formatSpecialDays = (specialDays) => {
    if (!specialDays) return null;

    try {
      let days = specialDays;

      if (typeof specialDays === "string") {
        try {
          days = JSON.parse(specialDays);
        } catch (e) {
          console.error("Failed to parse special days string:", e);
          return null;
        }
      }

      if (Array.isArray(days) && days.length > 0) {
        return days.map((day) => ({
          name: day.name,
          date: day.date ? formatDate(day.date) : "No date",
        }));
      }

      if (days && days.special_days && Array.isArray(days.special_days)) {
        return days.special_days.map((day) => ({
          name: day.name,
          date: day.date ? formatDate(day.date) : "No date",
        }));
      }

      return null;
    } catch (e) {
      console.error("Error formatting special days:", e);
      return null;
    }
  };

  const formatUserType = (type) => {
    if (!type) return "EMPLOYEE";
    
    const typeMap = {
      'employee': 'Employee',
      'admin': 'Admin',
      'hr': 'HR',
      'manager': 'Manager',
      'team_lead': 'Team Lead',
    };
    
    return typeMap[type.toLowerCase()] || type;
  };

  const isSkilled = () => {
    return (
      currentEmployee?.is_skilled === 1 || currentEmployee?.is_skilled === true
    );
  };

  const tabs = [
    { id: "basic", label: "Basic Info", icon: <FiUser /> },
    { id: "salary", label: "Salary & Bank", icon: <FiDollarSign /> },
    { id: "passport", label: "Passport", icon: <FaPassport /> },
    { id: "visa", label: "Visa & Labor", icon: <FiCreditCard /> },
    { id: "eid", label: "EID", icon: <FaIdCard /> },
    { id: "contact", label: "Contact", icon: <FiPhoneCall /> },
    { id: "documents", label: "Documents", icon: <FiFileText /> },
  ];

  const documentFields = [
    {
      key: "passport_1st_page",
      label: "Passport 1st Page",
      icon: "fas fa-passport",
    },
    {
      key: "passport_2nd_page",
      label: "Passport 2nd Page",
      icon: "fas fa-passport",
    },
    {
      key: "passport_outer_page",
      label: "Passport Outer",
      icon: "fas fa-passport",
    },
    { key: "passport_id_page", label: "Passport ID", icon: "fas fa-id-card" },
    { key: "visa_page", label: "Visa Page", icon: "fas fa-file-contract" },
    { key: "labor_card", label: "Labor Card", icon: "fas fa-id-card" },
    {
      key: "labor_contract",
      label: "Labor Contract",
      icon: "fas fa-file-signature",
    },
    { key: "eid_1st_page", label: "EID Front Side", icon: "fas fa-id-card" },
    { key: "eid_2nd_page", label: "EID Back Side", icon: "fas fa-id-card" },
    {
      key: "educational_1st_page",
      label: "Educational Certificate (Front)",
      icon: "fas fa-graduation-cap",
    },
    {
      key: "educational_2nd_page",
      label: "Educational Certificate (Back)",
      icon: "fas fa-graduation-cap",
    },
    {
      key: "home_country_id_proof",
      label: "Home Country ID Proof",
      icon: "fas fa-home",
    },
  ];

  // Handle back navigation
  const handleBack = () => {
    navigate(`${basePath}/employees`);
  };

  if (loading) {
    return (
      <div className="w-full overflow-x-hidden">
        <main className="content px-4 py-4 md:px-6 md:py-6">
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!currentEmployee) {
    return (
      <div className="w-full overflow-x-hidden">
        <main className="content px-4 py-4 md:px-6 md:py-6">
          <div className="text-center py-12">
            <FiUser className="text-6xl text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">
              Employee not found
            </h3>
            <button
              onClick={() => navigate(`${basePath}/employees`)}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Back to Employees
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden">
      <main className="content px-4 py-4 md:px-6 md:py-6">
        <div className="max-w-7xl mx-auto">
          {/* ─── HEADER ────────────────────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-[var(--form-surface-hover)] rounded-lg transition-colors"
                  title="Back to Employees"
                >
                  <FiArrowLeft className="text-[var(--form-text-secondary)] text-xl" />
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-[var(--form-text)]">
                    Employee Details
                  </h1>
                  <p className="text-sm text-[var(--form-text-secondary)] mt-1">
                    View complete employee information
                  </p>
                </div>
              </div>
              <Link
                to={`${basePath}/employees/edit/${currentEmployee.id}`}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <FiEdit /> Edit Employee
              </Link>
            </div>
          </div>

          {/* ─── PROFILE SUMMARY CARD ────────────────────────────────────── */}
          <div className="bg-[var(--form-bg)] rounded-xl shadow-sm border border-[var(--form-border)] p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              {getEmployeePhoto() ? (
                <img
                  src={getEmployeePhoto()}
                  alt={`${currentEmployee.first_name || "Employee"} photo`}
                  className="w-24 h-24 rounded-full object-cover border-2 border-green-100 dark:border-green-800 shadow-md"
                  onError={(e) => {
                    console.error("Failed to load image:", getEmployeePhoto());
                    e.target.style.display = "none";
                    e.target.parentElement.querySelector(
                      ".fallback-avatar",
                    ).style.display = "flex";
                  }}
                />
              ) : null}
              {!getEmployeePhoto() && (
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md fallback-avatar">
                  {currentEmployee.first_name?.charAt(0)}
                  {currentEmployee.last_name?.charAt(0)}
                </div>
              )}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-[var(--form-text)]">
                  {currentEmployee.first_name} {currentEmployee.last_name}
                </h2>
                <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                    {formatUserType(currentEmployee.user?.type) || "EMPLOYEE"}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      currentEmployee.user?.status === "active"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : currentEmployee.user?.status === "onboarding"
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {currentEmployee.user?.status === "active"
                      ? "Active"
                      : currentEmployee.user?.status === "onboarding"
                        ? "Onboarding"
                        : "Inactive"}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold">
                    ID: {currentEmployee.employee_id}
                  </span>
                  {isSkilled() && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-semibold">
                      <FiAward className="inline mr-1" /> Skilled
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 justify-center md:justify-start text-sm text-[var(--form-text-secondary)]">
                  <div className="flex items-center gap-1">
                    <FiMail className="text-green-500" />{" "}
                    {currentEmployee.personal_email || "N/A"}
                  </div>
                  <div className="flex items-center gap-1">
                    <FiPhone className="text-green-500" />{" "}
                    {currentEmployee.personal_number || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── TABS NAVIGATION ─────────────────────────────────────────── */}
          <div className="bg-[var(--form-bg)] border border-[var(--form-border)] rounded-xl mb-6 overflow-x-auto">
            <div className="flex min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 flex items-center gap-2 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-gray-50 dark:bg-gray-800/50"
                      : "text-[var(--form-text-secondary)] hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ─── TAB CONTENT ─────────────────────────────────────────────── */}
          <div className="bg-[var(--form-bg)] border border-[var(--form-border)] rounded-xl p-6">
            {/* Basic Information Tab */}
            {activeTab === "basic" && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--form-text)] mb-4 flex items-center gap-2">
                  <FiUser className="text-green-500" /> Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Full Name
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.first_name} {currentEmployee.last_name}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Employee ID
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.employee_id}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Username
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.user?.username || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        User Type
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1 capitalize">
                        {formatUserType(currentEmployee.user?.type) || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Employee Category
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {isSkilled() ? "Skilled" : "Unskilled"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide flex items-center gap-1">
                        <FaVenusMars /> Gender
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1 capitalize">
                        {currentEmployee.gender || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide flex items-center gap-1">
                        <FiCalendar /> Date of Birth
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.dob
                          ? formatDate(currentEmployee.dob)
                          : "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide flex items-center gap-1">
                        <FiCalendar /> Joining Date
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.joining_date
                          ? formatDate(currentEmployee.joining_date)
                          : "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide flex items-center gap-1">
                        <FiFlag /> Nationality
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.nationality || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide flex items-center gap-1">
                        <FiHeart /> Marital Status
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1 capitalize">
                        {currentEmployee.marital_status || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Dependents
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.dependents || "0"}
                      </p>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-[var(--form-text)] mt-6 mb-4 flex items-center gap-2">
                  <FiBriefcase className="text-green-500" /> Organization
                  Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Organization
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {getOrganizationName(
                          currentEmployee.user?.organization_id,
                        )}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Company
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.user?.company?.company_name ||
                          currentEmployee.user?.company?.name ||
                          "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Trade License Type
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1 capitalize">
                        {currentEmployee.user?.company?.trade_license || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Designation
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.user?.designation?.name || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Department
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.user?.department?.name || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Role
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {getRoleName(currentEmployee.user?.role_id)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Special Days Section */}
                <h3 className="text-lg font-semibold text-[var(--form-text)] mt-6 mb-4 flex items-center gap-2">
                  <FiHeart className="text-green-500" /> Special Days
                </h3>
                <div className="border-t border-[var(--form-border)] pt-4">
                  {(() => {
                    const formattedSpecialDays = formatSpecialDays(
                      currentEmployee.special_days,
                    );
                    if (
                      !formattedSpecialDays ||
                      formattedSpecialDays.length === 0
                    ) {
                      return (
                        <p className="text-[var(--form-text-secondary)]">
                          No special days recorded
                        </p>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formattedSpecialDays.map((day, index) => (
                          <div
                            key={index}
                            className="bg-[var(--form-surface)] rounded-lg p-3 flex items-center gap-3"
                          >
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                              <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-[var(--form-text)]">
                                {day.name}
                              </p>
                              <p className="text-sm text-[var(--form-text-secondary)]">
                                {day.date}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ─── SALARY & BANK DETAILS TAB ────────────────────────────── */}
            {activeTab === "salary" && (
              <div>
                {/* Salary Packages Section */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-[var(--form-text)] flex items-center gap-2">
                    <FiPackage className="text-green-500" /> Salary Packages
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddComponent(true)}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors flex items-center gap-1"
                    >
                      <FiPlus size={14} /> Add Component
                    </button>
                  </div>
                </div>

                {/* Salary Packages */}
                {getEmployeePackages().length > 0 ? (
                  <div className="space-y-4 mb-6">
                    {getEmployeePackages().map((pkg, index) => {
                      const total = getPackageTotal(pkg);
                      return (
                        <div
                          key={pkg.id || index}
                          className="border border-[var(--form-border)] rounded-xl overflow-hidden"
                        >
                          <div className="bg-[var(--form-surface)] px-6 py-3 border-b border-[var(--form-border)] flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <FiPackage className="text-green-500" />
                              <h4 className="font-semibold text-[var(--form-text)]">
                                {pkg.name || `Package ${index + 1}`}
                              </h4>
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs">
                                {pkg.currency || "AED"}
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  pkg.is_active
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                    : "bg-gray-100 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400"
                                }`}
                              >
                                {pkg.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-[var(--form-border)]">
                                <thead className="bg-[var(--form-surface)]">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--form-text-muted)] uppercase tracking-wider">
                                      Component Name
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-[var(--form-text-muted)] uppercase tracking-wider">
                                      Amount ({pkg.currency || "AED"})
                                    </th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-[var(--form-text-muted)] uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-[var(--form-bg)] divide-y divide-[var(--form-border)]">
                                  {pkg.salary_components &&
                                  pkg.salary_components.length > 0 ? (
                                    <>
                                      {pkg.salary_components.map(
                                        (comp, compIdx) => (
                                          <tr
                                            key={comp.id || compIdx}
                                            className="hover:bg-[var(--form-surface)]"
                                          >
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-[var(--form-text)]">
                                              {editingComponent === comp.id ? (
                                                <input
                                                  type="text"
                                                  defaultValue={
                                                    comp.component_name
                                                  }
                                                  className="px-2 py-1 border border-[var(--form-border)] rounded bg-[var(--form-surface)] text-[var(--form-text)]"
                                                  id={`comp-name-${comp.id}`}
                                                />
                                              ) : (
                                                comp.component_name
                                              )}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--form-text)] text-right">
                                              {editingComponent === comp.id ? (
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  defaultValue={comp.value}
                                                  className="px-2 py-1 border border-[var(--form-border)] rounded text-right bg-[var(--form-surface)] text-[var(--form-text)]"
                                                  id={`comp-value-${comp.id}`}
                                                />
                                              ) : (
                                                parseFloat(
                                                  comp.value,
                                                ).toLocaleString(undefined, {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                })
                                              )}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-center">
                                              {editingComponent === comp.id ? (
                                                <div className="flex items-center justify-center gap-2">
                                                  <button
                                                    onClick={() => {
                                                      const newName =
                                                        document.getElementById(
                                                          `comp-name-${comp.id}`,
                                                        ).value;
                                                      const newValue =
                                                        document.getElementById(
                                                          `comp-value-${comp.id}`,
                                                        ).value;
                                                      handleUpdateComponent(
                                                        comp.id,
                                                        {
                                                          component_name:
                                                            newName,
                                                          value: newValue,
                                                        },
                                                        pkg.id,
                                                      );
                                                    }}
                                                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                                                    title="Save"
                                                  >
                                                    <FiSave size={16} />
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      setEditingComponent(null)
                                                    }
                                                    className="text-[var(--form-text-muted)] hover:text-[var(--form-text)]"
                                                    title="Cancel"
                                                  >
                                                    <FiX size={16} />
                                                  </button>
                                                </div>
                                              ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                  <button
                                                    onClick={() =>
                                                      setEditingComponent(
                                                        comp.id,
                                                      )
                                                    }
                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                                    title="Edit"
                                                  >
                                                    <FiEdit size={16} />
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      handleDeleteComponentClick(
                                                        comp.id,
                                                        comp.component_name,
                                                        pkg.id,
                                                      )
                                                    }
                                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                                    title="Delete"
                                                  >
                                                    <FiTrash2 size={16} />
                                                  </button>
                                                </div>
                                              )}
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                      <tr className="bg-[var(--form-surface)] font-bold">
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-[var(--form-text)]">
                                          Package Total
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-green-600 dark:text-green-400 text-right">
                                          {pkg.currency || "AED"}{" "}
                                          {total.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </td>
                                        <td></td>
                                      </tr>
                                    </>
                                  ) : (
                                    <tr>
                                      <td
                                        colSpan="3"
                                        className="px-4 py-4 text-center text-[var(--form-text-muted)]"
                                      >
                                        No salary components in this package
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-[var(--form-surface)] rounded-xl border border-[var(--form-border)] mb-6">
                    <FiPackage className="text-4xl text-[var(--form-text-muted)] mx-auto mb-2" />
                    <p className="text-[var(--form-text-secondary)]">
                      No salary packages configured
                    </p>
                  </div>
                )}

                {/* Add Component Modal */}
                {showAddComponent && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--form-bg)] rounded-xl max-w-md w-full p-6 border border-[var(--form-border)]">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-[var(--form-text)]">
                          Add Salary Component
                        </h3>
                        <button
                          onClick={() => {
                            setShowAddComponent(false);
                            setNewComponent({
                              component_name: "",
                              value: "",
                              employee_salary_package_id: null,
                            });
                          }}
                          className="text-[var(--form-text-muted)] hover:text-[var(--form-text)]"
                        >
                          <FiX size={20} />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--form-label)] mb-1">
                            Employee Salary Package
                          </label>
                          <select
                            value={
                              newComponent.employee_salary_package_id || ""
                            }
                            onChange={(e) =>
                              setNewComponent({
                                ...newComponent,
                                employee_salary_package_id: e.target.value
                                  ? parseInt(e.target.value)
                                  : null,
                              })
                            }
                            className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg focus:ring-green-500 focus:border-green-500 bg-[var(--form-surface)] text-[var(--form-text)]"
                          >
                            <option value="">Select a package</option>
                            {getEmployeePackages().map((pkg) => (
                              <option key={pkg.id} value={pkg.id}>
                                {pkg.name} ({pkg.currency || "AED"})
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-[var(--form-text-muted)] mt-1">
                            Select the employee's salary package this component
                            belongs to
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--form-label)] mb-1">
                            Component Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Basic Salary"
                            value={newComponent.component_name}
                            onChange={(e) =>
                              setNewComponent({
                                ...newComponent,
                                component_name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg focus:ring-green-500 focus:border-green-500 bg-[var(--form-surface)] text-[var(--form-text)] placeholder:text-[var(--form-placeholder)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--form-label)] mb-1">
                            Amount
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Enter amount"
                            value={newComponent.value}
                            onChange={(e) =>
                              setNewComponent({
                                ...newComponent,
                                value: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg focus:ring-green-500 focus:border-green-500 bg-[var(--form-surface)] text-[var(--form-text)] placeholder:text-[var(--form-placeholder)]"
                          />
                        </div>
                        <button
                          onClick={handleAddComponent}
                          className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Add Component
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── Bank Details Section ───────────────────────────────── */}
                <div className="flex justify-between items-center mb-4 mt-8 pt-4 border-t border-[var(--form-border)]">
                  <h3 className="text-lg font-semibold text-[var(--form-text)] flex items-center gap-2">
                    <FiCreditCardIcon className="text-green-500" /> Bank Details
                  </h3>
                  <button
                    onClick={() => setShowAddBank(true)}
                    className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors flex items-center gap-1"
                  >
                    <FiPlus size={14} /> Add Bank Account
                  </button>
                </div>

                {/* Add Bank Modal */}
                {showAddBank && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-[var(--form-bg)] rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto border border-[var(--form-border)]">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-[var(--form-text)]">
                          Add Bank Account
                        </h3>
                        <button
                          onClick={() => setShowAddBank(false)}
                          className="text-[var(--form-text-muted)] hover:text-[var(--form-text)]"
                        >
                          <FiX size={20} />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--form-label)] mb-1">
                            Country
                          </label>
                          <select
                            value={newBank.bank_country}
                            onChange={(e) =>
                              setNewBank({
                                ...newBank,
                                bank_country: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg focus:ring-green-500 focus:border-green-500 bg-[var(--form-surface)] text-[var(--form-text)]"
                          >
                            <option value="India">India</option>
                            <option value="UAE">United Arab Emirates</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--form-label)] mb-1">
                            Bank Name *
                          </label>
                          <input
                            type="text"
                            value={newBank.bank_name}
                            onChange={(e) =>
                              setNewBank({
                                ...newBank,
                                bank_name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg focus:ring-green-500 focus:border-green-500 bg-[var(--form-surface)] text-[var(--form-text)] placeholder:text-[var(--form-placeholder)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--form-label)] mb-1">
                            Account Number *
                          </label>
                          <input
                            type="text"
                            value={newBank.account_number}
                            onChange={(e) =>
                              setNewBank({
                                ...newBank,
                                account_number: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg focus:ring-green-500 focus:border-green-500 bg-[var(--form-surface)] text-[var(--form-text)] placeholder:text-[var(--form-placeholder)]"
                          />
                        </div>
                        {newBank.bank_country === "India" ? (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-[var(--form-label)] mb-1">
                                IFSC Code *
                              </label>
                              <input
                                type="text"
                                value={newBank.ifsc_code}
                                onChange={(e) =>
                                  setNewBank({
                                    ...newBank,
                                    ifsc_code: e.target.value.toUpperCase(),
                                  })
                                }
                                className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg focus:ring-green-500 focus:border-green-500 bg-[var(--form-surface)] text-[var(--form-text)] placeholder:text-[var(--form-placeholder)]"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[var(--form-label)] mb-1">
                                Branch Name
                              </label>
                              <input
                                type="text"
                                value={newBank.branch_name}
                                onChange={(e) =>
                                  setNewBank({
                                    ...newBank,
                                    branch_name: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg focus:ring-green-500 focus:border-green-500 bg-[var(--form-surface)] text-[var(--form-text)] placeholder:text-[var(--form-placeholder)]"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-[var(--form-label)] mb-1">
                                IBAN Number *
                              </label>
                              <input
                                type="text"
                                value={newBank.iban_number}
                                onChange={(e) =>
                                  setNewBank({
                                    ...newBank,
                                    iban_number: e.target.value.toUpperCase(),
                                  })
                                }
                                className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg focus:ring-green-500 focus:border-green-500 bg-[var(--form-surface)] text-[var(--form-text)] placeholder:text-[var(--form-placeholder)]"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[var(--form-label)] mb-1">
                                SWIFT/BIC Code
                              </label>
                              <input
                                type="text"
                                value={newBank.swift_code}
                                onChange={(e) =>
                                  setNewBank({
                                    ...newBank,
                                    swift_code: e.target.value.toUpperCase(),
                                  })
                                }
                                className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg focus:ring-green-500 focus:border-green-500 bg-[var(--form-surface)] text-[var(--form-text)] placeholder:text-[var(--form-placeholder)]"
                              />
                            </div>
                          </>
                        )}
                        <button
                          onClick={handleAddBankDetail}
                          className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Add Bank Account
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Details List */}
                {currentEmployee.bank_details &&
                currentEmployee.bank_details.length > 0 ? (
                  <div className="space-y-4">
                    {currentEmployee.bank_details.map((bank, index) => (
                      <div
                        key={bank.id || index}
                        className="border border-[var(--form-border)] rounded-xl overflow-hidden"
                      >
                        <div className="bg-[var(--form-surface)] px-6 py-3 border-b border-[var(--form-border)] flex justify-between items-center">
                          <h4 className="font-semibold text-[var(--form-text)] flex items-center gap-2">
                            <FiGlobeIcon className="text-green-500" />
                            Bank Account{" "}
                            {currentEmployee.bank_details.length > 1
                              ? `#${index + 1}`
                              : ""}
                            <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">
                              {bank.bank_country}
                            </span>
                          </h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingBankDetail(bank.id)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              title="Edit"
                            >
                              <FiEdit size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteBankDetailClick(
                                  bank.id,
                                  bank.bank_name,
                                )
                              }
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="p-6">
                          {editingBankDetail === bank.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs text-[var(--form-text-muted)] mb-1">
                                    Bank Name
                                  </label>
                                  <input
                                    type="text"
                                    defaultValue={bank.bank_name}
                                    className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg bg-[var(--form-surface)] text-[var(--form-text)]"
                                    id={`bank-name-${bank.id}`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-[var(--form-text-muted)] mb-1">
                                    Account Number
                                  </label>
                                  <input
                                    type="text"
                                    defaultValue={bank.account_number}
                                    className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg bg-[var(--form-surface)] text-[var(--form-text)]"
                                    id={`bank-account-${bank.id}`}
                                  />
                                </div>
                                {bank.bank_country === "India" ? (
                                  <>
                                    <div>
                                      <label className="block text-xs text-[var(--form-text-muted)] mb-1">
                                        IFSC Code
                                      </label>
                                      <input
                                        type="text"
                                        defaultValue={bank.ifsc_code || ""}
                                        className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg bg-[var(--form-surface)] text-[var(--form-text)]"
                                        id={`bank-ifsc-${bank.id}`}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-[var(--form-text-muted)] mb-1">
                                        Branch Name
                                      </label>
                                      <input
                                        type="text"
                                        defaultValue={bank.branch_name || ""}
                                        className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg bg-[var(--form-surface)] text-[var(--form-text)]"
                                        id={`bank-branch-${bank.id}`}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <label className="block text-xs text-[var(--form-text-muted)] mb-1">
                                        IBAN Number
                                      </label>
                                      <input
                                        type="text"
                                        defaultValue={bank.iban_number || ""}
                                        className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg bg-[var(--form-surface)] text-[var(--form-text)]"
                                        id={`bank-iban-${bank.id}`}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-[var(--form-text-muted)] mb-1">
                                        SWIFT Code
                                      </label>
                                      <input
                                        type="text"
                                        defaultValue={bank.swift_code || ""}
                                        className="w-full px-3 py-2 border border-[var(--form-border)] rounded-lg bg-[var(--form-surface)] text-[var(--form-text)]"
                                        id={`bank-swift-${bank.id}`}
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingBankDetail(null)}
                                  className="px-4 py-2 bg-[var(--form-surface)] border border-[var(--form-border)] text-[var(--form-text)] rounded-lg hover:bg-[var(--form-surface-hover)]"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => {
                                    const updatedData = {
                                      bank_country: bank.bank_country,
                                      bank_name: document.getElementById(
                                        `bank-name-${bank.id}`,
                                      ).value,
                                      account_number: document.getElementById(
                                        `bank-account-${bank.id}`,
                                      ).value,
                                    };
                                    if (bank.bank_country === "India") {
                                      updatedData.ifsc_code =
                                        document.getElementById(
                                          `bank-ifsc-${bank.id}`,
                                        ).value;
                                      updatedData.branch_name =
                                        document.getElementById(
                                          `bank-branch-${bank.id}`,
                                        ).value;
                                    } else {
                                      updatedData.iban_number =
                                        document.getElementById(
                                          `bank-iban-${bank.id}`,
                                        ).value;
                                      updatedData.swift_code =
                                        document.getElementById(
                                          `bank-swift-${bank.id}`,
                                        ).value;
                                    }
                                    handleUpdateBankDetail(
                                      bank.id,
                                      updatedData,
                                    );
                                  }}
                                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                                    Bank Name
                                  </label>
                                  <p className="text-[var(--form-text)] font-medium mt-1">
                                    {bank.bank_name}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                                    Account Number
                                  </label>
                                  <p className="text-[var(--form-text)] font-medium mt-1 font-mono">
                                    {bank.account_number}
                                  </p>
                                </div>
                                {bank.branch_name && (
                                  <div>
                                    <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                                      Branch Name
                                    </label>
                                    <p className="text-[var(--form-text)] font-medium mt-1">
                                      {bank.branch_name}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-3">
                                {bank.ifsc_code && (
                                  <div>
                                    <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                                      IFSC Code
                                    </label>
                                    <p className="text-[var(--form-text)] font-medium mt-1 font-mono">
                                      {bank.ifsc_code}
                                    </p>
                                  </div>
                                )}
                                {bank.iban_number && (
                                  <div>
                                    <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                                      IBAN Number
                                    </label>
                                    <p className="text-[var(--form-text)] font-medium mt-1 font-mono">
                                      {bank.iban_number}
                                    </p>
                                  </div>
                                )}
                                {bank.swift_code && (
                                  <div>
                                    <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                                      SWIFT/BIC Code
                                    </label>
                                    <p className="text-[var(--form-text)] font-medium mt-1 font-mono">
                                      {bank.swift_code}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-[var(--form-surface)] rounded-xl border border-[var(--form-border)]">
                    <FiCreditCardIcon className="text-4xl text-[var(--form-text-muted)] mx-auto mb-2" />
                    <p className="text-[var(--form-text-secondary)]">
                      No bank details available
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ─── PASSPORT INFORMATION TAB ──────────────────────────────── */}
            {activeTab === "passport" && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--form-text)] mb-4 flex items-center gap-2">
                  <FaPassport className="text-green-500" /> Passport Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Passport Full Name
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.passport_full_name || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Passport Number
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.passport_number || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Issued From
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.passport_issued_from || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Issued Date
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.passport_issued_date
                          ? formatDate(currentEmployee.passport_issued_date)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Expiry Date
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.passport_expiry_date
                          ? formatDate(currentEmployee.passport_expiry_date)
                          : "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Place of Birth
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.place_of_birth || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Father's Name
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.father_name || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Mother's Name
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.mother_name || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="border-b border-[var(--form-border)] pb-3">
                    <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide flex items-center gap-1">
                      <FiHome /> Address
                    </label>
                    <p className="text-[var(--form-text)] font-medium mt-1">
                      {currentEmployee.address || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── VISA & LABOR TAB ───────────────────────────────────────── */}
            {activeTab === "visa" && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--form-text)] mb-4 flex items-center gap-2">
                  <FiCreditCard className="text-green-500" /> Visa Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Visa Type
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1 capitalize">
                        {currentEmployee.visa_type?.replace("_", " ") || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Visa Number
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.visa_number || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Visa Issued Date
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.visa_issued_date
                          ? formatDate(currentEmployee.visa_issued_date)
                          : "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Visa Expiry Date
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.visa_expiry_date
                          ? formatDate(currentEmployee.visa_expiry_date)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Labor Number
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.labor_number || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Labor Issued Date
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.labor_issued_date
                          ? formatDate(currentEmployee.labor_issued_date)
                          : "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Labor Expiry Date
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.labor_expiry_date
                          ? formatDate(currentEmployee.labor_expiry_date)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── EID TAB ────────────────────────────────────────────────── */}
            {activeTab === "eid" && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--form-text)] mb-4 flex items-center gap-2">
                  <FaIdCard className="text-green-500" /> Emirates ID Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        EID Number
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.eid_number || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        EID Issued Date
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.eid_issued_date
                          ? formatDate(currentEmployee.eid_issued_date)
                          : "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        EID Expiry Date
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.eid_expiry_date
                          ? formatDate(currentEmployee.eid_expiry_date)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── CONTACT TAB ────────────────────────────────────────────── */}
            {activeTab === "contact" && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--form-text)] mb-4 flex items-center gap-2">
                  <FiPhoneCall className="text-green-500" /> Contact Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Company Email
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.company_email || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Personal Email
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.personal_email || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Company Mobile Number
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.company_mobile_number || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Personal Number
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.personal_number || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Other Number
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.other_number || "N/A"}
                      </p>
                    </div>
                    <div className="border-b border-[var(--form-border)] pb-3">
                      <label className="text-xs text-[var(--form-text-muted)] uppercase tracking-wide">
                        Home Country Number
                      </label>
                      <p className="text-[var(--form-text)] font-medium mt-1">
                        {currentEmployee.home_country_number || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── DOCUMENTS TAB ──────────────────────────────────────────── */}
            {activeTab === "documents" && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--form-text)] mb-4 flex items-center gap-2">
                  <FiFileText className="text-green-500" /> Employee Documents
                </h3>

                {(currentEmployee.avatar || currentEmployee.avatar_path) && (
                  <div className="mb-6 p-4 bg-[var(--form-surface)] rounded-lg">
                    <h4 className="font-semibold text-[var(--form-text)] mb-3">
                      Profile Photo
                    </h4>
                    <a
                      href={getEmployeePhoto()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <FiDownload /> View Profile Photo
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documentFields.map((doc) => {
                    const documentPath = currentEmployee[doc.key];
                    const hasDocument =
                      documentPath && !currentEmployee[`remove_${doc.key}`];

                    return (
                      <div
                        key={doc.key}
                        className="border border-[var(--form-border)] rounded-lg p-4 hover:shadow-md transition-shadow bg-[var(--form-bg)]"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <i
                              className={`${doc.icon} text-green-600 dark:text-green-400 text-lg`}
                            ></i>
                          </div>
                          <div>
                            <h4 className="font-semibold text-[var(--form-text)] text-sm">
                              {doc.label}
                            </h4>
                            <p className="text-xs text-[var(--form-text-muted)]">
                              {hasDocument ? "Uploaded" : "Not Uploaded"}
                            </p>
                          </div>
                        </div>
                        {hasDocument ? (
                          <a
                            href={getDocumentUrl(documentPath)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors w-full justify-center"
                          >
                            <FiDownload /> View Document
                          </a>
                        ) : (
                          <div className="text-center py-2 text-[var(--form-text-muted)] text-sm">
                            <FiXCircle className="inline mr-1" /> No document
                            uploaded
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── CONFIRM DELETE MODAL ───────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={executeDelete}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        cancelText="Cancel"
        loading={confirmModal.loading}
      />
    </div>
  );
};

export default EmployeeDetails;