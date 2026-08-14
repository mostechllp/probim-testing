// src/admin/pages/Leaves.js

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import SearchBar from "@admin/components/common/SearchBar";
import EntriesSelector from "@admin/components/common/EntriesSelector";
import LeaveModal from "@admin/components/leaves/LeaveModal";
import { showToast } from "../../components/common/Toast";
import {
  fetchLeaves,
  fetchLeaveById,
  updateLeaveStatus,
  updateLeaveRequest,
  deleteLeaveRequest,
  clearError,
  fetchLeaveTypes,
} from "@admin/store/slices/LeaveSlice";
import Pagination from "@admin/components/common/Paginations";
import ConfirmModal from "@admin/components/common/ConfirmModal";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiLoader } from "react-icons/fi";
import DateInput from "../../admin/components/common/DateInput";

const Leaves = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  // Determine base path from current route
  const getBasePath = () => {
    if (location.pathname.startsWith("/admin")) return "/admin";
    if (location.pathname.startsWith("/employee")) return "/employee";
    return "";
  };
  const basePath = getBasePath();

  const {
    leaves = [],
    error = null,
    loading = false,
    leaveTypes = [],
  } = useSelector((state) => {
    return state.leaves || { leaves: [] };
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Edit states
  const [editingLeave, setEditingLeave] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
    claim_salary: "0",
    session1: "morning",
    session2: "morning",
  });
  const [editFile, setEditFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingLeave, setFetchingLeave] = useState(false);

  // Confirm modal states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // NEW: Manager/Team Lead approve/reject modal states
  const [managerActionModalOpen, setManagerActionModalOpen] = useState(false);
  const [managerActionType, setManagerActionType] = useState(null); // "approve" or "reject"
  const [managerActionLeave, setManagerActionLeave] = useState(null);
  const [managerRemark, setManagerRemark] = useState("");
  const [managerActionLoading, setManagerActionLoading] = useState(false);
  const [remarkError, setRemarkError] = useState("");

  // Delete confirm states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leaveToDelete, setLeaveToDelete] = useState(null);

  // Check if user is manager or team lead
  const isManagerOrTeamLead =
    user?.type === "manager" ||
    user?.type === "team_lead" ||
    user?.role?.name?.toLowerCase().includes("manager") ||
    user?.role?.name?.toLowerCase().includes("team lead");

  // Check if user is manager specifically
  const isManager =
    user?.type === "manager" ||
    user?.role?.name?.toLowerCase().includes("manager");

  // Check if user is team lead specifically
  const isTeamLead =
    user?.type === "team_lead" ||
    user?.role?.name?.toLowerCase().includes("team lead");

  // Check if user is admin or HR (has full permissions)
  const isAdminOrHR = user?.type === "admin" || user?.type === "hr";

  // ✅ Get API base URL from environment
  const getBaseUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      return apiUrl.replace(/\/api$/, "");
    }
    return window.location.origin;
  };

  // ✅ Helper to get full document URL
  const getDocumentUrl = (docPath) => {
    if (!docPath) return null;

    if (docPath.startsWith("http://") || docPath.startsWith("https://")) {
      return docPath;
    }

    const baseUrl = getBaseUrl();
    const cleanPath = docPath.replace(/^\/+/, "");

    if (cleanPath.startsWith("storage/")) {
      return `${baseUrl}/${cleanPath}`;
    }

    if (cleanPath.startsWith("leaves/documents/")) {
      return `${baseUrl}/storage/${cleanPath}`;
    }

    return `${baseUrl}/storage/${cleanPath}`;
  };

  useEffect(() => {
    dispatch(fetchLeaves());
    dispatch(fetchLeaveTypes());
  }, [dispatch]);

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast(error, "error");
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // ✅ Helper to get applied by user info
  const getAppliedByInfo = (leave) => {
    if (!leave.applied_by) {
      return {
        name: "-",
        role: "-",
        userId: null,
      };
    }

    const appliedBy = leave.applied_by;

    let name = appliedBy.employee_name || appliedBy.name || "-";

    let role = "-";
    if (appliedBy.role) {
      role = appliedBy.role.name || appliedBy.role || "-";
    }

    return {
      name: name,
      role: role,
      userId: appliedBy.user_id || null,
    };
  };

  // Helper to get employee name
  const getEmployeeName = (leave) => {
    if (leave.employee_name) return leave.employee_name;
    if (leave.employee?.name) return leave.employee.name;
    if (leave.employee?.first_name && leave.employee?.last_name) {
      return `${leave.employee.first_name} ${leave.employee.last_name}`;
    }
    if (leave.employee?.first_name) return leave.employee.first_name;
    return "-";
  };

  const getFilteredLeaves = () => {
    const leavesArray = Array.isArray(leaves) ? leaves : [];
    let filtered = leavesArray;

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (leave) =>
          (leave.status || "").toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (leave) =>
          (leave.employee?.first_name || "")
            .toLowerCase()
            .includes(searchLower) ||
          (leave.employee?.name || "").toLowerCase().includes(searchLower) ||
          (leave.leave_type?.name || leave.type || "")
            .toLowerCase()
            .includes(searchLower) ||
          (leave.reason || "").toLowerCase().includes(searchLower) ||
          (getAppliedByInfo(leave).name || "")
            .toLowerCase()
            .includes(searchLower),
      );
    }
    return filtered;
  };

  const filteredLeaves = getFilteredLeaves();
  const totalFiltered = filteredLeaves.length;
  const totalPages = Math.ceil(totalFiltered / perPage);
  const start = (currentPage - 1) * perPage;
  const pageLeaves = filteredLeaves.slice(start, start + perPage);

  // Manager/Team Lead action handlers
  const handleManagerActionClick = (leave, action) => {
    setManagerActionLeave(leave);
    setManagerActionType(action);
    setManagerRemark("");
    setRemarkError("");
    setManagerActionModalOpen(true);
  };

  const handleManagerActionConfirm = async () => {
    if (!managerActionLeave) return;

    // Validate remark is required
    if (!managerRemark.trim()) {
      setRemarkError("Remark is required");
      return;
    }

    setManagerActionLoading(true);

    const status = managerActionType === "approve" ? "approved" : "rejected";

    // Determine who is approving/rejecting
    let approvedBy = null;
    if (isManager) {
      approvedBy = "manager";
    } else if (isTeamLead) {
      approvedBy = "team_lead";
    } else if (isAdminOrHR) {
      approvedBy = "admin";
    }

    const result = await dispatch(
      updateLeaveStatus({
        id: managerActionLeave.id,
        status: status,
        processedBy: user?.username || user?.name || "Manager",
        rejection_reason: managerActionType === "reject" ? managerRemark : null,
        approved_by: approvedBy,
        remarks: managerRemark,
      }),
    );

    if (updateLeaveStatus.fulfilled.match(result)) {
      showToast(
        `Leave request ${managerActionType === "approve" ? "approved" : "rejected"} successfully`,
        "success",
      );
      setManagerActionModalOpen(false);
      setManagerActionLeave(null);
      setManagerActionType(null);
      setManagerRemark("");
      setRemarkError("");
      dispatch(fetchLeaves());
    } else {
      showToast(
        result.payload || `Failed to ${managerActionType} leave request`,
        "error",
      );
    }

    setManagerActionLoading(false);
  };

  // Original approve/reject handlers (for HR/Admin)
  const handleApproveClick = (id) => {
    setSelectedLeaveId(id);
    setActionType("approve");
    setConfirmOpen(true);
  };

  const handleRejectClick = (id) => {
    setSelectedLeaveId(id);
    setActionType("reject");
    setConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedLeaveId) return;

    setActionLoading(true);

    const result = await dispatch(
      updateLeaveStatus({
        id: selectedLeaveId,
        status: actionType === "approve" ? "approved" : "rejected",
        processedBy: user?.username || "HR Admin",
        rejection_reason: actionType === "reject" ? rejectionReason : null,
        approved_by: "admin",
        remarks:
          actionType === "approve" ? "Approved by Admin/HR" : rejectionReason,
      }),
    );

    if (updateLeaveStatus.fulfilled.match(result)) {
      showToast(
        `Leave request ${actionType === "approve" ? "approved" : "rejected"} successfully`,
        "success",
      );
      setConfirmOpen(false);
      setSelectedLeaveId(null);
      setRejectionReason("");
      setActionType(null);
      dispatch(fetchLeaves());
    } else {
      showToast(
        result.payload || `Failed to ${actionType} leave request`,
        "error",
      );
    }

    setActionLoading(false);
  };

  const handleView = (leave) => {
    setSelectedLeave(leave);
    setShowModal(true);
  };

  // ✅ Handle document view
  const handleViewDocument = (docPath) => {
    if (docPath) {
      const fullUrl = getDocumentUrl(docPath);
      window.open(fullUrl, "_blank");
    }
  };

  // ✅ Helper to check if document exists
  const hasDocument = (leave) => {
    const doc = leave.document_path || leave.document || leave.doc;
    return !!(
      doc &&
      doc !== "null" &&
      doc !== "undefined" &&
      doc.trim() !== ""
    );
  };

  // ✅ Helper to format date for input
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      if (
        typeof dateString === "string" &&
        dateString.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        return dateString;
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (error) {
      return "";
    }
  };

  // ✅ Edit Handlers - Only for Admin/HR
  const handleEditClick = async (leave) => {
    // Only allow editing if user is Admin/HR
    if (!isAdminOrHR) {
      showToast("You don't have permission to edit leave requests", "error");
      return;
    }

    // Only allow editing if status is pending
    if ((leave.status || "").toLowerCase() !== "pending") {
      showToast("Only pending leave requests can be edited", "warning");
      return;
    }

    setFetchingLeave(true);
    setShowEditModal(true);

    try {
      // Fetch the complete leave data by ID
      const result = await dispatch(fetchLeaveById(leave.id)).unwrap();


      const leaveTypeId = result.leave_type_id || result.leave_type?.id;

      // Format dates for input
      const startDate = result.start_date || result.from_date;
      const endDate = result.end_date || result.to_date;

      const startDateFormatted = startDate ? formatDateForInput(startDate) : "";
      const endDateFormatted = endDate ? formatDateForInput(endDate) : "";

      const session1 = result.session1 || "morning";
      const session2 = result.session2 || "afternoon";

      setEditingLeave(result);
      setEditFormData({
        leave_type_id: leaveTypeId || "",
        start_date: startDateFormatted,
        end_date: endDateFormatted,
        reason: result.reason || "",
        claim_salary:
          result.claim_salary === 1 || result.claim_salary === "Yes"
            ? "1"
            : "0",
        session1: session1,
        session2: session2,
      });
      setEditFile(null);
    } catch (error) {
      console.error("Failed to fetch leave details:", error);
      showToast("Failed to load leave details for editing", "error");
      setShowEditModal(false);
    } finally {
      setFetchingLeave(false);
    }
  };

  // In Leaves.js - Update handleEditSubmit

const handleEditSubmit = async (e) => {
  e.preventDefault();


  // Validate form data
  if (!editFormData.leave_type_id) {
    showToast("Please select a leave type", "error");
    return;
  }
  if (!editFormData.start_date || editFormData.start_date === "") {
    showToast("Please select a start date", "error");
    return;
  }
  if (!editFormData.end_date || editFormData.end_date === "") {
    showToast("Please select an end date", "error");
    return;
  }
  if (editFormData.reason.length < 10) {
    showToast("Reason must be at least 10 characters", "error");
    return;
  }

  setSubmitting(true);

  try {
    // Create FormData
    const formDataToSend = new FormData();
    formDataToSend.append("leave_type_id", editFormData.leave_type_id);
    formDataToSend.append("start_date", editFormData.start_date);
    formDataToSend.append("end_date", editFormData.end_date);
    formDataToSend.append("reason", editFormData.reason);
    formDataToSend.append("claim_salary", editFormData.claim_salary);
    formDataToSend.append("session1", editFormData.session1);
    formDataToSend.append("session2", editFormData.session2);

    // Add document if selected - THIS IS THE KEY PART
    if (editFile) {
      formDataToSend.append("document", editFile);
    }

    // If no new document but there's an existing one, we might want to keep it
    // If you want to allow removing the document, add a flag
    // For now, if no new file, we don't send anything (keep existing)


    const result = await dispatch(
      updateLeaveRequest({
        id: editingLeave.id,
        formData: formDataToSend,
      })
    );

    if (updateLeaveRequest.fulfilled.match(result)) {
      showToast("Leave request updated successfully!", "success");
      setShowEditModal(false);
      setEditingLeave(null);
      setEditFile(null);
      dispatch(fetchLeaves());
    } else {
      console.error("Update failed:", result.payload);
      showToast(result.payload || "Failed to update leave request", "error");
    }
  } catch (error) {
    console.error("Error submitting form:", error);
    showToast("An error occurred while updating", "error");
  } finally {
    setSubmitting(false);
  }
};
  const handleEditClose = () => {
    setShowEditModal(false);
    setEditingLeave(null);
    setEditFile(null);
    setFetchingLeave(false);
  };

  // Handle date changes from DateInput
  const handleStartDateChange = (dateValue) => {
    setEditFormData({ ...editFormData, start_date: dateValue || "" });
  };

  const handleEndDateChange = (dateValue) => {
    setEditFormData({ ...editFormData, end_date: dateValue || "" });
  };

  // ✅ Delete Handlers - Only for Admin/HR
  const handleDeleteClick = (leave) => {
    // Only allow deletion if user is Admin/HR
    if (!isAdminOrHR) {
      showToast("You don't have permission to delete leave requests", "error");
      return;
    }

    if ((leave.status || "").toLowerCase() !== "pending") {
      showToast("Only pending leave requests can be deleted", "warning");
      return;
    }
    setLeaveToDelete(leave);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!leaveToDelete) return;

    setActionLoading(true);

    const result = await dispatch(deleteLeaveRequest(leaveToDelete.id));

    if (deleteLeaveRequest.fulfilled.match(result)) {
      showToast("Leave request deleted successfully!", "success");
      setDeleteConfirmOpen(false);
      setLeaveToDelete(null);
      dispatch(fetchLeaves());
    } else {
      showToast(result.payload || "Failed to delete leave request", "error");
    }

    setActionLoading(false);
  };

  // Helper to get approval status badge
  const getApprovalBadge = (isApproved) => {
    if (isApproved === true) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <i className="fas fa-check-circle mr-1 text-xs"></i> Approved
        </span>
      );
    } else if (isApproved === false) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <i className="fas fa-times-circle mr-1 text-xs"></i> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
        <i className="fas fa-clock mr-1 text-xs"></i> Pending
      </span>
    );
  };

  // Calculate stats
  const leavesArray = Array.isArray(leaves) ? leaves : [];
  const total = leavesArray.length;
  const pending = leavesArray.filter(
    (l) => (l.status || "").toLowerCase() === "pending",
  ).length;
  const approved = leavesArray.filter(
    (l) => (l.status || "").toLowerCase() === "approved",
  ).length;
  const rejected = leavesArray.filter(
    (l) => (l.status || "").toLowerCase() === "rejected",
  ).length;

  const getStatusClass = (status) => {
    const lowerStatus = (status || "").toLowerCase();
    switch (lowerStatus) {
      case "pending":
        return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
      case "approved":
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      case "rejected":
        return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      if (
        typeof dateString === "string" &&
        dateString.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        const [year, month, day] = dateString.split("-");
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
      return dateString;
    } catch (error) {
      return dateString || "-";
    }
  };

  // Check if user can take action on leave
  const canTakeAction = (leave) => {
    const isPending = (leave.status || "").toLowerCase() === "pending";

    if (!isPending) return false;

    // Check if user is allowed to take action (manager, team lead, admin, hr)
    const hasRoleAccess =
      isManagerOrTeamLead || user?.type === "admin" || user?.type === "hr";
    if (!hasRoleAccess) return false;

    // For Team Lead: Check if they already approved/rejected
    if (isTeamLead) {
      const teamLeadApproval = leave.approvals?.find(
        (a) => a.approver_level === "team_lead",
      );
      if (
        teamLeadApproval &&
        (teamLeadApproval.status === "approved" ||
          teamLeadApproval.status === "rejected")
      ) {
        return false; // Team Lead already acted on this
      }
    }

    // For Manager: Check if they already approved/rejected
    if (isManager) {
      const managerApproval = leave.approvals?.find(
        (a) => a.approver_level === "manager",
      );
      if (
        managerApproval &&
        (managerApproval.status === "approved" ||
          managerApproval.status === "rejected")
      ) {
        return false; // Manager already acted on this
      }
    }

    // For Admin/HR: Always allow action on pending leaves
    // (They can override or change status even if someone else already acted)
    if (user?.type === "admin" || user?.type === "hr") {
      return true;
    }

    return true;
  };

  // Determine which approval columns to show
  const showTeamLeadApproval = true; // Everyone should see Team Lead status
  const showManagerApproval = isAdminOrHR; // Only Admin/HR see Manager status
  const showHrApproval = isAdminOrHR; // Only Admin/HR see HR status

  return (
    <div className="w-full overflow-x-hidden">
      {/* Stats Cards */}
      <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="flex justify-between items-start mb-1 md:mb-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <i className="fas fa-calendar-alt text-green-600 dark:text-green-400 text-sm md:text-lg"></i>
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
            {total}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
            Total Requests
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="flex justify-between items-start mb-1 md:mb-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <i className="fas fa-clock text-amber-600 dark:text-amber-400 text-sm md:text-lg"></i>
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400">
            {pending}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
            Pending
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="flex justify-between items-start mb-1 md:mb-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <i className="fas fa-check-circle text-green-600 dark:text-green-400 text-sm md:text-lg"></i>
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
            {approved}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
            Approved
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="flex justify-between items-start mb-1 md:mb-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <i className="fas fa-times-circle text-red-600 dark:text-red-400 text-sm md:text-lg"></i>
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">
            {rejected}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
            Rejected
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 md:mb-6">
        <h2 className="text-lg md:text-2xl font-bold gradient-heading bg-clip-text text-transparent">
          Leave Requests
        </h2>
      </div>

      {/* Status Tabs */}
      <div className="overflow-x-auto pb-2 mb-4 md:mb-5 -mx-4 px-4">
        <div className="flex gap-2 min-w-max border-b border-gray-200 dark:border-gray-700 pb-3">
          {["all", "pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setCurrentPage(1);
              }}
              className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap capitalize ${
                statusFilter === status
                  ? "bg-green-500 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {status === "all" ? "All Requests" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-5">
        <EntriesSelector value={perPage} onChange={setPerPage} />
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by employee..."
          />
          {user?.role?.name === "HR Manager" ||
          user?.type === "hr" ||
          user?.type === "admin" ? (
            <Link
              to={`${basePath}/request-leave-for-employee`}
              className="request-btn bg-emerald-700 text-white py-2.5 px-6 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-emerald-600 hover:-translate-y-0.5 transition-all shadow-md"
            >
              <FiPlus /> Request Leave for Employee
            </Link>
          ) : null}
          {user?.type === "admin" ? (
            <>
              <Link
                to={`${basePath}/leaves/allocations`}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
              >
                <i className="fas fa-chart-line"></i>
                <span className="hidden sm:inline">
                  Manage Leave Allocations
                </span>
                <span className="sm:hidden">Allocations</span>
              </Link>

              <Link
                to={`${basePath}/leaves/leave-types`}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
              >
                <i className="fas fa-briefcase"></i>
                <span className="hidden sm:inline">Manage Leave Types</span>
                <span className="sm:hidden">Leave Types</span>
              </Link>
            </>
          ) : null}
        </div>
      </div>

      {/* Leave Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-soft">
        <div className="min-w-[1100px] lg:min-w-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Sl.No.
                </th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Employee
                </th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Type
                </th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  From
                </th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  To
                </th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Days
                </th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Claim Salary
                </th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Doc
                </th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Status
                </th>
                {/* Approval columns - conditional */}
                {showTeamLeadApproval && (
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Team Lead
                  </th>
                )}
                {showManagerApproval && (
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Manager
                  </th>
                )}
                {showHrApproval && (
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                    HR
                  </th>
                )}
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {pageLeaves.length > 0 ? (
                pageLeaves.map((leave, idx) => {
                  const appliedByInfo = getAppliedByInfo(leave);
                  const hasDoc = hasDocument(leave);
                  const docPath =
                    leave.document_path || leave.document || leave.doc;
                  const isPending =
                    (leave.status || "").toLowerCase() === "pending";
                  const canAct = canTakeAction(leave);
                  // Only show edit/delete for Admin/HR
                  const showEditDelete = isPending && isAdminOrHR;

                  return (
                    <tr
                      key={leave.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
                        {start + idx + 1}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {getEmployeeName(leave)}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {leave.leave_type?.name || leave.type || "-"}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(leave.start_date || leave.from_date)}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(leave.end_date || leave.to_date)}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
                        {leave.duration_days ||
                          leave.number_of_days ||
                          leave.days ||
                          "-"}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <span
                          className={`inline-block px-1.5 md:px-2 py-0.5 rounded-full text-[9px] md:text-xs font-semibold whitespace-nowrap ${
                            leave.claim_salary === 1 ||
                            leave.claim_salary === "1" ||
                            leave.claim_salary === "Yes"
                              ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {leave.claim_salary === 1 ||
                          leave.claim_salary === "1" ||
                          leave.claim_salary === "Yes"
                            ? "Yes"
                            : "No"}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        {hasDoc ? (
                          <button
                            onClick={() => handleViewDocument(docPath)}
                            className="text-blue-500 hover:text-blue-600 text-xs md:text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-file-pdf text-xs md:text-sm"></i>
                            <span className="hidden sm:inline">View</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <span
                          className={`inline-block px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-semibold whitespace-nowrap capitalize ${getStatusClass(leave.status)}`}
                        >
                          {leave.status || "pending"}
                        </span>
                      </td>
                      {/* Approval columns - conditional */}
                      {showTeamLeadApproval && (
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          {getApprovalBadge(leave.is_team_lead_approved)}
                        </td>
                      )}
                      {showManagerApproval && (
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          {getApprovalBadge(leave.is_manager_approved)}
                        </td>
                      )}
                      {showHrApproval && (
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          {getApprovalBadge(leave.is_hr_approved)}
                        </td>
                      )}
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap">
                          <button
                            onClick={() => handleView(leave)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 transition-colors"
                            title="View Details"
                          >
                            <i className="fas fa-eye text-xs md:text-sm"></i>
                          </button>
                          {isPending && (
                            <>
                              {/* Edit & Delete - Only for Admin/HR */}
                              {showEditDelete && (
                                <>
                                  <button
                                    onClick={() => handleEditClick(leave)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-amber-500 transition-colors"
                                    title="Edit Leave Request"
                                  >
                                    <FiEdit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(leave)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 transition-colors"
                                    title="Delete Leave Request"
                                  >
                                    <FiTrash2 size={14} />
                                  </button>
                                </>
                              )}
                              {/* Approve/Reject - For Managers, Team Leads, Admin, and HR */}
                              {canAct && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleManagerActionClick(leave, "approve")
                                    }
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-green-500 transition-colors"
                                    title="Approve"
                                  >
                                    <i className="fas fa-check-circle text-xs md:text-sm"></i>
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleManagerActionClick(leave, "reject")
                                    }
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 transition-colors"
                                    title="Reject"
                                  >
                                    <i className="fas fa-times-circle text-xs md:text-sm"></i>
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={
                      10 +
                      (showTeamLeadApproval ? 1 : 0) +
                      (showManagerApproval ? 1 : 0) +
                      (showHrApproval ? 1 : 0)
                    }
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No leave requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalFiltered > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalFiltered}
          itemsPerPage={perPage}
        />
      )}

      {/* Leave Details Modal */}
      <LeaveModal
        isOpen={showModal}
        leave={selectedLeave}
        onClose={() => setShowModal(false)}
        onViewDocument={handleViewDocument}
      />

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                Edit Leave Request
              </h3>
              <button
                onClick={handleEditClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {fetchingLeave ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <FiLoader className="animate-spin text-green-500 text-2xl" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Loading leave details...
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEditSubmit}>
                <div className="space-y-4">
                  {/* Employee Info - Read Only */}
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium">
                          Employee
                        </label>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {editingLeave ? getEmployeeName(editingLeave) : "-"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium">
                          Leave Type
                        </label>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {editingLeave?.leave_type?.name ||
                            editingLeave?.type ||
                            "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Leave Type - Editable */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Leave Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormData.leave_type_id}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          leave_type_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Leave Type</option>
                      {leaveTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <DateInput
                      value={editFormData.start_date}
                      onChange={handleStartDateChange}
                      placeholder="dd/mm/yyyy"
                      required
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <DateInput
                      value={editFormData.end_date}
                      onChange={handleEndDateChange}
                      placeholder="dd/mm/yyyy"
                      required
                    />
                  </div>

                  {/* Session 1 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Session 1
                    </label>
                    <select
                      value={editFormData.session1}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          session1: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                    </select>
                  </div>

                  {/* Session 2 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Session 2
                    </label>
                    <select
                      value={editFormData.session2}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          session2: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                    </select>
                  </div>

                  {/* Claim Salary */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Claim Salary
                    </label>
                    <select
                      value={editFormData.claim_salary}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          claim_salary: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={editFormData.reason}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          reason: e.target.value,
                        })
                      }
                      rows="3"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter reason for leave..."
                      required
                      minLength="10"
                    />
                    {editFormData.reason && editFormData.reason.length < 10 && (
                      <p className="text-xs text-red-500 mt-1">
                        Reason must be at least 10 characters
                      </p>
                    )}
                  </div>

                  {/* Document Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Document (Optional)
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setEditFile(e.target.files[0])}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    {editFile && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        <i className="fas fa-check-circle mr-1"></i>
                        Selected: {editFile.name}
                      </p>
                    )}
                    {editingLeave?.document_path && !editFile && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <i className="fas fa-file mr-1"></i>
                        Current document attached. Upload a new file to replace
                        it.
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={handleEditClose}
                    className="px-4 py-2 rounded-lg font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <FiLoader className="animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i>
                        Update Leave
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Manager/Team Lead Action Modal */}
      {managerActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                {managerActionType === "approve" ? "Approve" : "Reject"} Leave
                Request
              </h3>
              <button
                onClick={() => {
                  setManagerActionModalOpen(false);
                  setManagerActionLeave(null);
                  setManagerActionType(null);
                  setManagerRemark("");
                  setRemarkError("");
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Employee:</span>{" "}
                {managerActionLeave ? getEmployeeName(managerActionLeave) : "-"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Leave Type:</span>{" "}
                {managerActionLeave?.leave_type?.name ||
                  managerActionLeave?.type ||
                  "-"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Duration:</span>{" "}
                {formatDate(
                  managerActionLeave?.start_date ||
                    managerActionLeave?.from_date,
                )}{" "}
                -{" "}
                {formatDate(
                  managerActionLeave?.end_date || managerActionLeave?.to_date,
                )}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {managerActionType === "approve" ? "Approval" : "Rejection"}{" "}
                Remark <span className="text-red-500">*</span>
              </label>
              <textarea
                value={managerRemark}
                onChange={(e) => {
                  setManagerRemark(e.target.value);
                  if (e.target.value.trim()) {
                    setRemarkError("");
                  }
                }}
                rows="4"
                className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  remarkError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-gray-200 dark:border-gray-700"
                }`}
                placeholder={
                  managerActionType === "approve"
                    ? "Add approval notes (required)..."
                    : "Provide reason for rejection (required)..."
                }
              />
              {remarkError && (
                <p className="text-xs text-red-500 mt-1">
                  <i className="fas fa-exclamation-circle mr-1"></i>
                  {remarkError}
                </p>
              )}
              {managerActionType === "reject" && (
                <p className="text-xs text-gray-500 mt-1">
                  <i className="fas fa-info-circle mr-1"></i>
                  Rejection reason will be visible to the employee
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setManagerActionModalOpen(false);
                  setManagerActionLeave(null);
                  setManagerActionType(null);
                  setManagerRemark("");
                  setRemarkError("");
                }}
                className="px-4 py-2 rounded-lg font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManagerActionConfirm}
                disabled={managerActionLoading}
                className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors flex items-center gap-2 ${
                  managerActionType === "approve"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                } disabled:opacity-50`}
              >
                {managerActionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    {managerActionType === "approve" ? (
                      <>
                        <i className="fas fa-check-circle"></i> Approve
                      </>
                    ) : (
                      <>
                        <i className="fas fa-times-circle"></i> Reject
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal for Approve/Reject (HR/Admin) */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setSelectedLeaveId(null);
          setRejectionReason("");
          setActionType(null);
        }}
        onConfirm={handleConfirmAction}
        title={
          actionType === "approve"
            ? "Approve Leave Request"
            : "Reject Leave Request"
        }
        message={
          actionType === "approve"
            ? "Are you sure you want to approve this leave request?"
            : "Are you sure you want to reject this leave request?"
        }
        confirmText={actionType === "approve" ? "Approve" : "Reject"}
        loading={actionLoading}
        variant={actionType === "approve" ? "success" : "danger"}
      >
        {actionType === "reject" && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rejection Reason (Optional)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows="3"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              placeholder="Enter reason for rejection..."
            />
          </div>
        )}
      </ConfirmModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setLeaveToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Leave Request"
        message={`Are you sure you want to delete the leave request for "${leaveToDelete ? getEmployeeName(leaveToDelete) : ""}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={actionLoading}
        variant="danger"
      />
    </div>
  );
};

export default Leaves;
