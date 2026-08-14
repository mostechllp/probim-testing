import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  setLeaveFilter,
  setLeavePagination,
  fetchEmployeeLeaves,
  fetchLeaveById,
  deleteLeaveRequest,
  updateLeaveRequest,
  fetchLeaveBalance,
  fetchLeaveTypes,
} from "../store/slices/leavesSlice";
import {
  FiSearch,
  FiPlus,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiClock,
  FiEdit2,
  FiTrash2,
  FiX,
  FiUser,
  FiLoader,
  FiEye,
} from "react-icons/fi";
import StatusBadge from "../components/common/StatusBadge";
import ConfirmModal from "../../admin/components/common/ConfirmModal";
import { showToast } from "../components/common/Toast";
import DateInput from "../../admin/components/common/DateInput";
import LeaveViewModal from "../components/leaves/LeaveViewModal";

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

// Color mapping for leave types
const getLeaveTypeColor = (typeName) => {
  const name = typeName?.toLowerCase() || "";

  if (name.includes("sick"))
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
  if (name.includes("annual") || name.includes("vacation"))
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
  if (name.includes("casual"))
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
  if (name.includes("maternity"))
    return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800";
  if (name.includes("paternity"))
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800";
  if (name.includes("unpaid"))
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
  if (name.includes("comp") || name.includes("off"))
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
  if (name.includes("study") || name.includes("exam"))
    return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800";
  if (name.includes("marriage") || name.includes("wedding"))
    return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800";
  if (name.includes("bereavement") || name.includes("compassionate"))
    return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-600";

  return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800";
};

// Get icon for leave type
const getLeaveTypeIcon = (typeName) => {
  const name = typeName?.toLowerCase() || "";

  if (name.includes("sick")) return "fa-thermometer-half";
  if (name.includes("annual") || name.includes("vacation"))
    return "fa-suitcase";
  if (name.includes("casual")) return "fa-umbrella-beach";
  if (name.includes("maternity")) return "fa-baby";
  if (name.includes("paternity")) return "fa-baby";
  if (name.includes("unpaid")) return "fa-clock";
  if (name.includes("comp") || name.includes("off")) return "fa-clock";
  if (name.includes("study") || name.includes("exam"))
    return "fa-graduation-cap";
  if (name.includes("marriage") || name.includes("wedding")) return "fa-ring";

  return "fa-calendar-alt";
};

// ✅ Helper to get applied by info
const getAppliedByInfo = (leave) => {
  if (!leave.applied_by) {
    return {
      name: "Self",
      email: "-",
      role: "Employee",
    };
  }

  const appliedBy = leave.applied_by;

  let name =
    appliedBy.employee_name ||
    appliedBy.name ||
    appliedBy.username ||
    appliedBy.email ||
    "Unknown";

  let role = "Employee";
  if (appliedBy.type) {
    role = appliedBy.type.charAt(0).toUpperCase() + appliedBy.type.slice(1);
  }
  if (appliedBy.role) {
    role =
      typeof appliedBy.role === "object" ? appliedBy.role.name : appliedBy.role;
  }

  return {
    name: name,
    email: appliedBy.email || "-",
    role: role,
    userId: appliedBy.id || null,
  };
};

// ✅ Helper to check if document exists
const hasDocument = (leave) => {
  const doc = leave.document || leave.document_path || leave.doc;
  return !!(doc && doc !== "null" && doc !== "undefined" && doc.trim() !== "");
};

const Leaves = () => {
  const dispatch = useDispatch();
  const leavesState = useSelector((state) => state.EmpLeaves);
  const { user } = useSelector((state) => state.auth);
  const leaveTypes = useSelector((state) => state.EmpLeaves?.leaveTypes || []);

  const leaves = leavesState?.leaves || [];
  const filter = leavesState?.filter || { status: "all", search: "" };
  const pagination = leavesState?.pagination || { currentPage: 1, perPage: 10 };
  const loading = leavesState?.loading || false;
  const submitting = leavesState?.submitting || false;

  // Edit/Delete states
  const [editingLeave, setEditingLeave] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leaveToDelete, setLeaveToDelete] = useState(null);
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
  const [fetchingLeave, setFetchingLeave] = useState(false);

  // View states
  const [viewingLeave, setViewingLeave] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  // ✅ Document view handler
  const handleViewDocument = (docPath) => {
    if (!docPath) {
      showToast("No document attached", "warning");
      return;
    }

    const fullUrl = getDocumentUrl(docPath);
    window.open(fullUrl, "_blank");
  };

  // ✅ View handler - fetches leave by ID
  const handleViewClick = async (leave) => {
    setViewLoading(true);
    setShowViewModal(true);

    try {
      const result = await dispatch(fetchLeaveById(leave.id)).unwrap();
      setViewingLeave(result);
    } catch (error) {
      console.error("Failed to fetch leave details:", error);
      showToast("Failed to load leave details", "error");
      setShowViewModal(false);
    } finally {
      setViewLoading(false);
    }
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingLeave(null);
    setViewLoading(false);
  };

  const filteredLeaves = useMemo(() => {
    let filtered = [...leaves];

    if (filter.status && filter.status !== "all") {
      filtered = filtered.filter((l) => {
        const leaveStatus =
          typeof l.status === "object"
            ? l.status?.name?.toLowerCase()
            : l.status?.toLowerCase();
        return leaveStatus === filter.status.toLowerCase();
      });
    }

    if (filter.search) {
      filtered = filtered.filter((l) => {
        const leaveType =
          typeof l.leave_type === "object" ? l.leave_type?.name : l.leave_type;
        const leaveStatus =
          typeof l.status === "object" ? l.status?.name : l.status;
        const appliedBy = getAppliedByInfo(l);

        return (
          (leaveType?.toLowerCase() || "").includes(
            filter.search.toLowerCase(),
          ) ||
          (leaveStatus?.toLowerCase() || "").includes(
            filter.search.toLowerCase(),
          ) ||
          (l.reason?.toLowerCase() || "").includes(
            filter.search.toLowerCase(),
          ) ||
          (appliedBy.name?.toLowerCase() || "").includes(
            filter.search.toLowerCase(),
          )
        );
      });
    }

    return filtered;
  }, [leaves, filter.status, filter.search]);

  useEffect(() => {
    dispatch(fetchEmployeeLeaves());
    dispatch(fetchLeaveTypes());
  }, [dispatch]);

  const perPage = pagination?.perPage || 10;
  const currentPage = pagination?.currentPage || 1;

  const totalPages = Math.ceil(filteredLeaves.length / perPage);
  const start = (currentPage - 1) * perPage;
  const currentLeaves = filteredLeaves.slice(start, start + perPage);

  const getLeaveTypeName = (leaveType) => {
    if (!leaveType) return "Leave";
    if (typeof leaveType === "object") {
      return leaveType.name || "Leave";
    }
    return leaveType;
  };

  const getStatus = (status) => {
    if (!status) return "pending";
    if (typeof status === "object") {
      return status.name?.toLowerCase() || "pending";
    }
    return status.toLowerCase();
  };

  const getClaimSalary = (claimSalary) => {
    if (claimSalary === undefined || claimSalary === null) return "Yes";
    if (typeof claimSalary === "object") return "Yes";
    if (claimSalary === 1 || claimSalary === "1" || claimSalary === "Yes")
      return "Yes";
    return "No";
  };

  const stats = useMemo(
    () => ({
      total: leaves.length,
      pending: leaves.filter((l) => getStatus(l.status) === "pending").length,
      approved: leaves.filter((l) => getStatus(l.status) === "approved").length,
      rejected: leaves.filter((l) => getStatus(l.status) === "rejected").length,
    }),
    [leaves],
  );

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (error) {
      return "-";
    }
  };

  // Helper to format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (error) {
      return "";
    }
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    try {
      const from = new Date(startDate);
      const to = new Date(endDate);
      const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
      return days;
    } catch (error) {
      return 0;
    }
  };

  const handleStatusFilter = (status) => {
    dispatch(
      setLeaveFilter({
        status: status === "all" ? "all" : status.toLowerCase(),
        search: filter.search || "",
      }),
    );
  };

  const handleSearch = (e) => {
    dispatch(
      setLeaveFilter({
        status: filter.status || "all",
        search: e.target.value,
      }),
    );
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      dispatch(setLeavePagination({ currentPage: page, perPage: perPage }));
    }
  };

  const handleEntriesChange = (e) => {
    dispatch(
      setLeavePagination({ currentPage: 1, perPage: parseInt(e.target.value) }),
    );
  };

  // --- Edit Handlers ---
  const handleEditClick = async (leave) => {
    // Only allow editing if status is pending
    if (getStatus(leave.status) !== "pending") {
      showToast("Only pending leave requests can be edited", "warning");
      return;
    }

    setFetchingLeave(true);
    setShowEditModal(true);

    try {
      const result = await dispatch(fetchLeaveById(leave.id)).unwrap();

      const leaveTypeId =
        typeof result.leave_type === "object"
          ? result.leave_type.id
          : result.leave_type_id;

      const startDateFormatted = formatDateForInput(result.start_date);
      const endDateFormatted = formatDateForInput(result.end_date);

      const session1 = result.session1 || "morning";
      const session2 = result.session2 || "afternoon";

      setEditingLeave(result);
      setEditFormData({
        leave_type_id: leaveTypeId || "",
        start_date: startDateFormatted,
        end_date: endDateFormatted,
        reason: result.reason || "",
        claim_salary:
          result.claim_salary === 1 || result.claim_salary === "1" ? "1" : "0",
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

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editFormData.leave_type_id) {
      showToast("Please select a leave type", "error");
      return;
    }
    if (!editFormData.start_date || !editFormData.end_date) {
      showToast("Please select dates", "error");
      return;
    }
    if (editFormData.reason.length < 10) {
      showToast("Reason must be at least 10 characters", "error");
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("leave_type_id", editFormData.leave_type_id);
    formDataToSend.append("start_date", editFormData.start_date);
    formDataToSend.append("end_date", editFormData.end_date);
    formDataToSend.append("reason", editFormData.reason);
    formDataToSend.append("claim_salary", editFormData.claim_salary);
    formDataToSend.append("session1", editFormData.session1);
    formDataToSend.append("session2", editFormData.session2);

    if (editFile) {
      formDataToSend.append("document", editFile);
    }

    const result = await dispatch(
      updateLeaveRequest({
        id: editingLeave.id,
        formData: formDataToSend,
      }),
    );

    if (updateLeaveRequest.fulfilled.match(result)) {
      showToast("Leave request updated successfully!", "success");
      setShowEditModal(false);
      setEditingLeave(null);
      setEditFile(null);
      dispatch(fetchEmployeeLeaves());
      dispatch(fetchLeaveBalance());
    } else {
      showToast(result.payload || "Failed to update leave request", "error");
    }
  };

  // --- Delete Handlers ---
  const handleDeleteClick = (leave) => {
    if (getStatus(leave.status) !== "pending") {
      showToast("Only pending leave requests can be deleted", "warning");
      return;
    }
    setLeaveToDelete(leave);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!leaveToDelete) return;

    const result = await dispatch(deleteLeaveRequest(leaveToDelete.id));

    if (deleteLeaveRequest.fulfilled.match(result)) {
      showToast("Leave request deleted successfully!", "success");
      setDeleteConfirmOpen(false);
      setLeaveToDelete(null);
      dispatch(fetchEmployeeLeaves());
      dispatch(fetchLeaveBalance());
    } else {
      showToast(result.payload || "Failed to delete leave request", "error");
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
    setEditFormData({ ...editFormData, start_date: dateValue });
  };

  const handleEndDateChange = (dateValue) => {
    setEditFormData({ ...editFormData, end_date: dateValue });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--muted)]">Loading leave requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Grid */}
      <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-7">
        <div className="stat-card bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 md:p-5">
          <div className="stat-header flex justify-between items-center mb-3">
            <div className="stat-icon w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center text-xl md:text-2xl">
              <FiFileText />
            </div>
          </div>
          <div className="stat-number text-2xl md:text-3xl font-extrabold text-green-600">
            {stats.total}
          </div>
          <div className="stat-label text-xs text-[var(--muted)]">
            Total Leaves
          </div>
        </div>
        <div className="stat-card bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 md:p-5">
          <div className="stat-header flex justify-between items-center mb-3">
            <div className="stat-icon w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl md:text-2xl">
              <FiClock />
            </div>
          </div>
          <div className="stat-number text-2xl md:text-3xl font-extrabold text-amber-500">
            {stats.pending}
          </div>
          <div className="stat-label text-xs text-[var(--muted)]">Pending</div>
        </div>
        <div className="stat-card bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 md:p-5">
          <div className="stat-header flex justify-between items-center mb-3">
            <div className="stat-icon w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-xl md:text-2xl">
              <FiCalendar />
            </div>
          </div>
          <div className="stat-number text-2xl md:text-3xl font-extrabold text-purple-500">
            {stats.approved}
          </div>
          <div className="stat-label text-xs text-[var(--muted)]">Approved</div>
        </div>
        <div className="stat-card bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 md:p-5">
          <div className="stat-header flex justify-between items-center mb-3">
            <div className="stat-icon w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center text-xl md:text-2xl">
              <FiFileText />
            </div>
          </div>
          <div className="stat-number text-2xl md:text-3xl font-extrabold text-red-500">
            {stats.rejected}
          </div>
          <div className="stat-label text-xs text-[var(--muted)]">Rejected</div>
        </div>
      </div>

      <div className="leaves-header flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-7">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-gray-800 to-green-600 bg-clip-text text-transparent">
            My Leave Requests
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Manage your leave applications
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/employee/request-leave"
            className="request-btn bg-green-500 text-white py-2.5 px-6 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-green-600 hover:-translate-y-0.5 transition-all shadow-md"
          >
            <FiPlus /> Request Leave
          </Link>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="status-tabs flex flex-wrap gap-2.5 mb-6 pb-3 border-b border-[var(--border)]">
        {["all", "Pending", "Approved", "Rejected"].map((status) => (
          <button
            key={status}
            onClick={() => handleStatusFilter(status)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter.status === status.toLowerCase() ||
              (status === "all" && filter.status === "all")
                ? "bg-green-500 text-white shadow-sm"
                : "bg-[var(--surface2)] text-[var(--text-secondary)] hover:bg-green-100 hover:text-green-600"
            }`}
          >
            {status === "all" ? "All Requests" : status}
          </button>
        ))}
      </div>

      {/* Action Bar */}
      <div className="files-actions flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div className="entries-select flex items-center gap-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-full px-3.5 py-1.5 text-xs text-[var(--muted)]">
          <span>Show entries</span>
          <select
            value={perPage}
            onChange={handleEntriesChange}
            className="border-none outline-none bg-transparent font-semibold text-[var(--text)] cursor-pointer"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
        <div className="search-wrapper flex items-center gap-3 flex-wrap">
          <div className="search-box flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-full px-3.5 py-2">
            <FiSearch className="text-gray-400 text-xs" />
            <input
              type="text"
              value={filter.search || ""}
              onChange={handleSearch}
              placeholder="Search by type, status or reason..."
              className="border-none outline-none bg-transparent text-xs text-[var(--text)] w-36 sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="leave-table-wrapper bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-x-auto shadow-sm">
        <table className="leave-table w-full border-collapse text-xs min-w-[1300px]">
          <thead>
            <tr className="bg-[var(--surface2)]">
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)] border-b border-[var(--border)] w-16">
                #
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)] border-b border-[var(--border)]">
                Leave Type
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)] border-b border-[var(--border)]">
                From
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)] border-b border-[var(--border)]">
                To
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)] border-b border-[var(--border)]">
                Sessions
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)] border-b border-[var(--border)]">
                Days
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)] border-b border-[var(--border)]">
                Claim Salary
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)] border-b border-[var(--border)]">
                Document
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)] border-b border-[var(--border)]">
                Applied By
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)] border-b border-[var(--border)]">
                Status
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)] border-b border-[var(--border)] w-32">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {currentLeaves.length === 0 ? (
              <tr>
                <td
                  colSpan="11"
                  className="text-center py-8 text-[var(--muted)]"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FiCalendar className="text-3xl text-[var(--muted)]" />
                    <p>No leave requests found</p>
                    <Link
                      to="/employee/request-leave"
                      className="text-green-500 hover:underline text-sm mt-2"
                    >
                      Request Leave →
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              currentLeaves.map((leave, idx) => {
                const leaveTypeName = getLeaveTypeName(leave.leave_type);
                const statusName = getStatus(leave.status);
                const claimSalary = getClaimSalary(leave.claim_salary);
                const hasDoc = hasDocument(leave);
                const docPath =
                  leave.document || leave.document_path || leave.doc;
                const days =
                  leave.duration_days ||
                  calculateDays(leave.start_date, leave.end_date);
                const colorClass = getLeaveTypeColor(leaveTypeName);
                const iconClass = getLeaveTypeIcon(leaveTypeName);
                const isPending = statusName === "pending";
                const appliedByInfo = getAppliedByInfo(leave);

                // Format sessions for display
                const session1 = leave.session1 || "morning";
                const session2 = leave.session2 || "afternoon";
                const sessionsDisplay = `${session1.charAt(0).toUpperCase() + session1.slice(1)} → ${session2.charAt(0).toUpperCase() + session2.slice(1)}`;

                return (
                  <tr
                    key={leave.id || idx}
                    className="hover:bg-[var(--surface2)] transition-colors"
                  >
                    <td className="py-3.5 px-4 border-b border-[var(--border)] text-center">
                      {start + idx + 1}
                    </td>
                    <td className="py-3.5 px-4 border-b border-[var(--border)]">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold border ${colorClass}`}
                      >
                        <i className={`fas ${iconClass} text-[10px]`}></i>
                        {leaveTypeName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[var(--border)] text-[var(--text-secondary)]">
                      {formatDate(leave.start_date)}
                    </td>
                    <td className="py-3.5 px-4 border-b border-[var(--border)] text-[var(--text-secondary)]">
                      {formatDate(leave.end_date)}
                    </td>
                    <td className="py-3.5 px-4 border-b border-[var(--border)] text-[var(--text-secondary)] text-xs">
                      <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                        {sessionsDisplay}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold">
                      {days}
                    </td>
                    <td className="py-3.5 px-4 border-b border-[var(--border)]">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          claimSalary === "Yes"
                            ? "bg-green-500/15 text-green-600"
                            : "bg-gray-100 text-[var(--muted)]"
                        }`}
                      >
                        {claimSalary}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[var(--border)]">
                      {hasDoc ? (
                        <button
                          onClick={() => handleViewDocument(docPath)}
                          className="text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1 text-xs"
                        >
                          <i className="fas fa-file-pdf"></i>
                          View
                        </button>
                      ) : (
                        <span className="text-[var(--muted)]">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 border-b border-[var(--border)]">
                      <div className="flex items-center gap-1.5">
                        <FiUser size={12} className="text-[var(--muted)]" />
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {appliedByInfo.name}
                        </span>
                        {appliedByInfo.role !== "Employee" && (
                          <span className="text-[10px] text-[var(--muted)] bg-[var(--surface2)] px-1.5 py-0.5 rounded">
                            {appliedByInfo.role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[var(--border)]">
                      <StatusBadge status={statusName} />
                    </td>
                    <td className="py-3.5 px-4 border-b border-[var(--border)]">
                      <div className="flex items-center gap-1.5">
                        {/* View button - always visible */}
                        <button
                          onClick={() => handleViewClick(leave)}
                          className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View leave details"
                        >
                          <FiEye size={14} />
                        </button>

                        {/* Edit and Delete - only for pending */}
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleEditClick(leave)}
                              className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit leave request"
                            >
                              <FiEdit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(leave)}
                              className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete leave request"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredLeaves.length > 0 && totalPages > 1 && (
        <div className="pagination-container flex flex-col sm:flex-row justify-between items-center gap-3 mt-5">
          <div className="text-xs text-[var(--muted)]">
            Showing {start + 1} to{" "}
            {Math.min(start + perPage, filteredLeaves.length)} of{" "}
            {filteredLeaves.length} entries
          </div>
          <div className="page-buttons flex gap-1.5 flex-wrap">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--surface2)] transition-colors"
            >
              <FiChevronLeft className="mx-auto" />
            </button>
            {[...Array(Math.min(totalPages, 10))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={i}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-9 h-9 rounded-lg border text-xs transition-all ${
                    currentPage === pageNum
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--surface2)] transition-colors"
            >
              <FiChevronRight className="mx-auto" />
            </button>
          </div>
        </div>
      )}

      {/* View Modal */}
      <LeaveViewModal
        isOpen={showViewModal}
        leave={viewingLeave}
        loading={viewLoading}
        onClose={handleCloseViewModal}
        onViewDocument={handleViewDocument}
      />

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                <FiEdit2 className="inline mr-2 text-green-500" />
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
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <FiLoader className="w-10 h-10 text-green-500 animate-spin mx-auto mb-4" />
                  <p className="text-[var(--muted)]">
                    Loading leave details...
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEditSubmit}>
                <div className="space-y-4">
                  {/* Leave Type */}
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

                  {/* Dates with DateInput */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <DateInput
                        value={editFormData.start_date}
                        onChange={handleStartDateChange}
                        type="general"
                        className="w-full"
                        placeholder="dd/mm/yyyy"
                        error={false}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <DateInput
                        value={editFormData.end_date}
                        onChange={handleEndDateChange}
                        type="general"
                        className="w-full"
                        placeholder="dd/mm/yyyy"
                        error={false}
                        minDate={
                          editFormData.start_date
                            ? new Date(editFormData.start_date)
                            : null
                        }
                      />
                    </div>
                  </div>

                  {/* Sessions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Start Session <span className="text-red-500">*</span>
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
                        required
                      >
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        End Session <span className="text-red-500">*</span>
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
                        required
                      >
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                      </select>
                    </div>
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
                      placeholder="Enter reason for leave (min 10 characters)"
                      required
                    />
                  </div>

                  {/* Claim Salary */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Claim Salary
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="1"
                          checked={editFormData.claim_salary === "1"}
                          onChange={() =>
                            setEditFormData({
                              ...editFormData,
                              claim_salary: "1",
                            })
                          }
                          className="text-green-500 focus:ring-green-500"
                        />
                        <span className="text-sm">Yes</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="0"
                          checked={editFormData.claim_salary === "0"}
                          onChange={() =>
                            setEditFormData({
                              ...editFormData,
                              claim_salary: "0",
                            })
                          }
                          className="text-green-500 focus:ring-green-500"
                        />
                        <span className="text-sm">No</span>
                      </label>
                    </div>
                  </div>

                  {/* Document Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Upload Document{" "}
                      <span className="text-gray-400 text-xs">(Optional)</span>
                    </label>

                    {editingLeave?.document && !editFile && (
                      <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Current Document:
                        </p>
                        <div className="flex items-center gap-2">
                          <i className="fas fa-file-pdf text-red-500"></i>
                          <button
                            type="button"
                            onClick={() =>
                              handleViewDocument(editingLeave.document)
                            }
                            className="text-blue-500 hover:text-blue-600 hover:underline text-sm font-medium"
                          >
                            {editingLeave.document.split("/").pop()}
                          </button>
                          <span className="text-xs text-gray-400">
                            (Click to view)
                          </span>
                        </div>
                      </div>
                    )}

                    <input
                      type="file"
                      onChange={(e) => setEditFile(e.target.files[0])}
                      accept=".pdf,.doc,.docx,.jpg,.png"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-500 file:text-white file:cursor-pointer hover:file:bg-green-600"
                    />
                    {editFile && (
                      <p className="text-xs text-green-600 mt-1">
                        File selected: {editFile.name}
                      </p>
                    )}
                    {editingLeave?.document && !editFile && (
                      <p className="text-xs text-gray-500 mt-1">
                        Upload a new file to replace the current document
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                    className="px-4 py-2 rounded-lg font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <FiEdit2 /> Update
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setLeaveToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Leave Request"
        message={`Are you sure you want to delete your "${leaveToDelete ? getLeaveTypeName(leaveToDelete.leave_type) : ""}" leave request? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={loading}
      />
    </div>
  );
};

export default Leaves;