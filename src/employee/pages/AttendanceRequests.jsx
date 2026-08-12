import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiEye, FiPlus, FiChevronLeft, FiChevronRight, FiSearch, FiSun, FiMoon, FiLogIn, FiClock, FiChevronDown, FiEdit2, FiTrash2 } from "react-icons/fi";
import { MdFingerprint } from "react-icons/md";
import { showToast } from "../components/common/Toast";
import StatusBadge from "../components/common/StatusBadge";
import ConfirmModal from "../../admin/components/common/ConfirmModal";
import MissedPunchOutModal from "../components/modals/MissedPunchoutModal";
import MissedPunchInModal from "../components/modals/MissedPunchInModal";
import LateCheckinModal from "../components/modals/LateCheckinModal";
import EarlyCheckinModal from "../components/modals/EarlyCheckinModal";
import EditAttendanceRequestModal from "../components/modals/EditAttendanceRequestModal";
import { clearAttendanceError, fetchAttendanceRequests, deleteAttendanceRequest } from "../store/slices/attendanceTypeSlice";

const AttendanceRequests = () => {
  const dispatch = useDispatch();
  
  // Get state from Redux
  const {
    requests = [],
    loading = false,
    error = null,
  } = useSelector((state) => state.EmpAttendanceType || {});

  const safeRequests = Array.isArray(requests) ? requests : [];
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEarlyCheckin, setShowEarlyCheckin] = useState(false);
  const [showLateCheckin, setShowLateCheckin] = useState(false);
  const [showMissedPunchIn, setShowMissedPunchIn] = useState(false);
  const [showMissedPunchOut, setShowMissedPunchOut] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [requestToEdit, setRequestToEdit] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [localFilter, setLocalFilter] = useState({ status: "all", search: "" });
  const [localPagination, setLocalPagination] = useState({ currentPage: 1, perPage: 10 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteRequestId, setDeleteRequestId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch attendance requests on component mount
  useEffect(() => {
    loadAttendanceRequests();
  }, []);

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast(error, "error");
      dispatch(clearAttendanceError());
    }
  }, [error, dispatch]);

  const loadAttendanceRequests = async () => {
    try {
      await dispatch(fetchAttendanceRequests()).unwrap();
    } catch (error) {
      console.error("Failed to load attendance requests:", error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Close dropdown on ESC key
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && showDropdown) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showDropdown]);

  const getRequestTypeLabel = (type) => {
    const types = {
      early_check_in: "Early Check-in",
      late_check_in: "Late Check-in",
      missed_punch_in: "Missed Punch In",
      missed_punch_out: "Missed Punch Out",
      early_checkin: "Early Check-in",
      late_checkin: "Late Check-in",
    };
    return types[type] || type?.replace(/_/g, ' ') || type;
  };

  const getRequestTypeIcon = (type) => {
    const icons = {
      early_check_in: <FiSun className="text-[var(--muted)] text-xs" />,
      late_check_in: <FiMoon className="text-[var(--muted)] text-xs" />,
      missed_punch_in: <MdFingerprint className="text-[var(--muted)] text-xs" />,
      missed_punch_out: <FiLogIn className="text-[var(--muted)] text-xs" />,
      early_checkin: <FiSun className="text-[var(--muted)] text-xs" />,
      late_checkin: <FiMoon className="text-[var(--muted)] text-xs" />,
    };
    return icons[type] || <FiClock className="text-[var(--muted)] text-xs" />;
  };

  const getFilteredRequests = () => {
    let filtered = [...safeRequests];
    
    if (localFilter.status !== "all") {
      filtered = filtered.filter(
        (r) => r.status?.toLowerCase() === localFilter.status.toLowerCase()
      );
    }
    
    if (localFilter.search) {
      const searchLower = localFilter.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          getRequestTypeLabel(r.type).toLowerCase().includes(searchLower) ||
          (r.reason || "").toLowerCase().includes(searchLower) ||
          (r.status || "").toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  };

  const filteredRequests = getFilteredRequests();
  const totalPages = Math.ceil(filteredRequests.length / localPagination.perPage);
  const start = (localPagination.currentPage - 1) * localPagination.perPage;
  const currentRequests = filteredRequests.slice(start, start + localPagination.perPage);

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

  const formatTime = (timeString) => {
    if (!timeString) return "-";
    if (timeString.includes(':')) {
      const parts = timeString.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return timeString;
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "-";
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "-";
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleEditRequest = (request) => {
    setRequestToEdit(request);
    setShowEditModal(true);
  };

  // Updated delete handler - shows confirm modal
  const handleDeleteClick = (id) => {
    setDeleteRequestId(id);
    setShowDeleteConfirm(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteRequestId) return;
    
    setDeleteLoading(true);
    try {
      await dispatch(deleteAttendanceRequest(deleteRequestId)).unwrap();
      showToast("Request deleted successfully", "success");
      setShowDeleteConfirm(false);
      setDeleteRequestId(null);
      await loadAttendanceRequests();
    } catch (error) {
      showToast(error || "Failed to delete request", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Check if request can be edited or deleted (only pending requests)
  const canModifyRequest = (request) => {
    const status = request.status?.toLowerCase();
    // Only allow modification if status is 'pending'
    return status === 'pending';
  };

  const stats = {
    total: safeRequests.length,
    pending: safeRequests.filter(r => r.status?.toLowerCase() === "pending").length,
    approved: safeRequests.filter(r => r.status?.toLowerCase() === "approved").length,
    rejected: safeRequests.filter(r => r.status?.toLowerCase() === "rejected").length,
  };

  // Clear all modal states and reset dropdown
  const resetAllModals = () => {
    setShowEarlyCheckin(false);
    setShowLateCheckin(false);
    setShowMissedPunchIn(false);
    setShowMissedPunchOut(false);
    setShowEditModal(false);
    setRequestToEdit(null);
    setSelectedRequest(null);
    setShowDetailsModal(false);
    setShowDropdown(false);
  };

  const openRequestModal = (type) => {
    setShowDropdown(false);
    // Reset any previous modal state
    switch(type) {
      case "early_check_in":
      case "early_checkin":
        setShowEarlyCheckin(true);
        break;
      case "late_check_in":
      case "late_checkin":
        setShowLateCheckin(true);
        break;
      case "missed_punch_in":
        setShowMissedPunchIn(true);
        break;
      case "missed_punch_out":
        setShowMissedPunchOut(true);
        break;
      default:
        break;
    }
  };

  const handleModalClose = async () => {
    resetAllModals();
    await loadAttendanceRequests();
  };

  const handleSearch = (e) => {
    setLocalFilter({ ...localFilter, search: e.target.value });
    setLocalPagination({ ...localPagination, currentPage: 1 });
  };

  const handleStatusFilter = (status) => {
    setLocalFilter({ ...localFilter, status });
    setLocalPagination({ ...localPagination, currentPage: 1 });
  };

  const handleEntriesChange = (e) => {
    setLocalPagination({ currentPage: 1, perPage: parseInt(e.target.value) });
  };

  const handlePageChange = (page) => {
    setLocalPagination({ ...localPagination, currentPage: page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Show loading state
  if (loading && safeRequests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading attendance requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Grid */}
      <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-5 md:mb-7">
        <div className="stat-card bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 md:p-5 text-center hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="stat-icon w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl md:text-2xl mx-auto mb-2 md:mb-3">
            <FiClock />
          </div>
          <div className="stat-number text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
            {stats.total}
          </div>
          <div className="stat-label text-[10px] md:text-xs text-[var(--muted)]">
            Total Requests
          </div>
        </div>

        <div className="stat-card bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 md:p-5 text-center hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="stat-icon w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl md:text-2xl mx-auto mb-2 md:mb-3">
            <FiClock />
          </div>
          <div className="stat-number text-2xl md:text-3xl font-extrabold text-amber-500">
            {stats.pending}
          </div>
          <div className="stat-label text-[10px] md:text-xs text-[var(--muted)]">
            Pending
          </div>
        </div>

        <div className="stat-card bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 md:p-5 text-center hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="stat-icon w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center text-xl md:text-2xl mx-auto mb-2 md:mb-3">
            <FiClock />
          </div>
          <div className="stat-number text-2xl md:text-3xl font-extrabold text-green-500">
            {stats.approved}
          </div>
          <div className="stat-label text-[10px] md:text-xs text-[var(--muted)]">
            Approved
          </div>
        </div>

        <div className="stat-card bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 md:p-5 text-center hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="stat-icon w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center text-xl md:text-2xl mx-auto mb-2 md:mb-3">
            <FiClock />
          </div>
          <div className="stat-number text-2xl md:text-3xl font-extrabold text-red-500">
            {stats.rejected}
          </div>
          <div className="stat-label text-[10px] md:text-xs text-[var(--muted)]">
            Rejected
          </div>
        </div>
      </div>

      {/* Header with Dropdown */}
      <div className="attendance-requests-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-5 mb-5 md:mb-7">
        <h2 className="text-lg md:text-2xl font-semibold bg-gradient-to-r from-[var(--text)] to-green-600 bg-clip-text text-transparent">
          My Attendance Requests
        </h2>
        
        <div className="dropdown-container relative w-full md:w-auto">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center justify-center w-full md:w-auto gap-2 px-4 py-2.5 md:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all text-sm font-medium"
          >
            <FiPlus className="text-sm" />
            <span>New Request</span>
            <FiChevronDown className={`text-sm transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 bg-black/30 z-40 md:hidden"
                onClick={() => setShowDropdown(false)}
              />
              
              <div className={`
                absolute md:right-0 mt-2 w-full md:w-64 
                bg-[var(--surface)] border border-[var(--border)] 
                rounded-lg shadow-lg overflow-hidden z-50
                ${isMobile ? 'left-0' : ''}
              `}>
                <div className="py-1 max-h-[70vh] overflow-y-auto">
                  <button
                    onClick={() => openRequestModal("early_check_in")}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface2)] transition-colors border-b border-[var(--border)] md:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center flex-shrink-0">
                      <FiSun className="text-sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text)]">Early Check-in</div>
                      <div className="text-xs text-[var(--muted)] truncate">Request early check-in approval</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => openRequestModal("late_check_in")}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface2)] transition-colors border-b border-[var(--border)] md:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                      <FiMoon className="text-sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text)]">Late Check-in</div>
                      <div className="text-xs text-[var(--muted)] truncate">Request late check-in approval</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => openRequestModal("missed_punch_in")}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface2)] transition-colors border-b border-[var(--border)] md:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                      <MdFingerprint className="text-sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text)]">Missed Punch In</div>
                      <div className="text-xs text-[var(--muted)] truncate">Request missed punch in approval</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => openRequestModal("missed_punch_out")}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface2)] transition-colors border-b border-[var(--border)] md:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0">
                      <FiLogIn className="text-sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text)]">Missed Punch Out</div>
                      <div className="text-xs text-[var(--muted)] truncate">Request missed punch out approval</div>
                    </div>
                  </button>
                </div>
                
                {isMobile && (
                  <div className="p-3 border-t border-[var(--border)] bg-[var(--surface2)] md:hidden">
                    <button
                      onClick={() => setShowDropdown(false)}
                      className="w-full py-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="overflow-x-auto pb-2 mb-4 md:mb-5 -mx-4 px-4">
        <div className="flex gap-2 min-w-max border-b border-[var(--border)] pb-3">
          {["all", "pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap capitalize ${
                localFilter.status === status
                  ? "bg-green-500 text-white shadow-md"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface2)]"
              }`}
            >
              {status === "all" ? "All Requests" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Action Bar */}
      <div className="files-actions flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 mb-4 md:mb-5">
        <div className="entries-select flex items-center gap-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-full px-3.5 py-1.5 text-xs text-[var(--text-secondary)] w-full sm:w-auto">
          <span className="whitespace-nowrap">Show entries</span>
          <select
            value={localPagination.perPage}
            onChange={handleEntriesChange}
            className="border-none outline-none bg-transparent font-semibold text-[var(--text)] cursor-pointer flex-1"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
        <div className="search-wrapper flex items-center gap-3 flex-wrap w-full sm:w-auto">
          <div className="search-box flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-full px-3.5 py-2 flex-1 sm:flex-initial">
            <FiSearch className="text-[var(--muted)] text-xs flex-shrink-0" />
            <input
              type="text"
              value={localFilter.search}
              onChange={handleSearch}
              placeholder="Search by type, reason..."
              className="border-none outline-none bg-transparent text-xs text-[var(--text)] w-full sm:w-36 md:w-44"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="attendance-requests-table-wrapper bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-x-auto shadow-sm">
        <table className="attendance-requests-table w-full border-collapse text-xs min-w-[700px] md:min-w-[900px]">
          <thead>
            <tr>
              <th className="text-left py-3 px-3 md:px-4 text-xs font-semibold text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--border)]">
                #
              </th>
              <th className="text-left py-3 px-3 md:px-4 text-xs font-semibold text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--border)]">
                Type
              </th>
              <th className="text-left py-3 px-3 md:px-4 text-xs font-semibold text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--border)]">
                Date
              </th>
              <th className="text-left py-3 px-3 md:px-4 text-xs font-semibold text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--border)]">
                Time
              </th>
              <th className="text-left py-3 px-3 md:px-4 text-xs font-semibold text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--border)] hidden sm:table-cell">
                Reason
              </th>
              <th className="text-left py-3 px-3 md:px-4 text-xs font-semibold text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--border)]">
                Status
              </th>
              <th className="text-left py-3 px-3 md:px-4 text-xs font-semibold text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--border)]">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-[var(--muted)]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </div>
                 </td>
              </tr>
            ) : currentRequests.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-[var(--muted)]">
                  <div className="flex flex-col items-center gap-2">
                    <FiClock className="text-4xl text-[var(--muted)]" />
                    <p>No attendance requests found.</p>
                  </div>
                 </td>
              </tr>
            ) : (
              currentRequests.map((request, idx) => {
                const isModifiable = canModifyRequest(request);
                const isAdminCreated = request.created_by_admin || request.is_admin_created || request.created_by === 'admin';
                
                return (
                  <tr
                    key={request.id}
                    className="hover:bg-[var(--surface2)] transition-colors"
                  >
                    <td className="py-3 px-3 md:px-4 border-b border-[var(--border)] text-[var(--text-secondary)]">
                      {start + idx + 1}
                    </td>
                    <td className="py-3 px-3 md:px-4 border-b border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        {getRequestTypeIcon(request.type)}
                        <span className="text-[var(--text)] text-xs whitespace-nowrap">
                          {getRequestTypeLabel(request.type)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 md:px-4 border-b border-[var(--border)] text-[var(--text-secondary)] whitespace-nowrap">
                      {formatDate(request.request_date || request.date)}
                    </td>
                    <td className="py-3 px-3 md:px-4 border-b border-[var(--border)] text-[var(--text-secondary)] whitespace-nowrap">
                      {formatTime(request.request_time || request.time)}
                    </td>
                    <td className="py-3 px-3 md:px-4 border-b border-[var(--border)] text-[var(--text-secondary)] max-w-[150px] truncate hidden sm:table-cell" title={request.reason}>
                      {request.reason || "-"}
                    </td>
                    <td className="py-3 px-3 md:px-4 border-b border-[var(--border)]">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="py-3 px-3 md:px-4 border-b border-[var(--border)]">
                      <div className="flex items-center gap-1">
                        {/* View button - always visible */}
                        <button
                          onClick={() => handleViewDetails(request)}
                          className="p-1.5 rounded-lg hover:bg-[var(--surface2)] text-green-500 transition-colors"
                          title="View Details"
                        >
                          <FiEye className="text-sm" />
                        </button>
                        
                        {/* Edit button - only show if modifiable and not admin created */}
                        {!isAdminCreated && isModifiable && (
                          <button
                            onClick={() => handleEditRequest(request)}
                            className="p-1.5 rounded-lg hover:bg-[var(--surface2)] text-blue-500 transition-colors"
                            title="Edit Request"
                          >
                            <FiEdit2 className="text-sm" />
                          </button>
                        )}
                        
                        {/* Delete button - only show if modifiable and not admin created */}
                        {!isAdminCreated && isModifiable && (
                          <button
                            onClick={() => handleDeleteClick(request.id)}
                            className="p-1.5 rounded-lg hover:bg-[var(--surface2)] text-red-500 transition-colors"
                            title="Delete Request"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
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
      {filteredRequests.length > 0 && (
        <div className="pagination-container flex flex-col sm:flex-row justify-between items-center gap-3 mt-5">
          <div className="text-xs text-[var(--muted)] text-center sm:text-left">
            Showing {start + 1} to{" "}
            {Math.min(start + localPagination.perPage, filteredRequests.length)} of{" "}
            {filteredRequests.length} entries
          </div>
          <div className="page-buttons flex gap-1.5 flex-wrap justify-center">
            <button
              onClick={() => handlePageChange(localPagination.currentPage - 1)}
              disabled={localPagination.currentPage === 1}
              className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text)]"
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
                    localPagination.currentPage === pageNum
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(localPagination.currentPage + 1)}
              disabled={localPagination.currentPage === totalPages}
              className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text)]"
            >
              <FiChevronRight className="mx-auto" />
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1100] flex items-center justify-center p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-[var(--surface)] max-w-md w-full rounded-2xl p-4 md:p-6 shadow-xl border border-[var(--border)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg md:text-xl font-bold text-[var(--text)]">Request Details</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-[var(--muted)] hover:text-[var(--text)] p-1">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row py-2 border-b border-[var(--border)]">
                <span className="font-semibold text-[var(--text)] sm:w-28">Type:</span>
                <span className="text-[var(--text-secondary)]">{getRequestTypeLabel(selectedRequest.type)}</span>
              </div>
              <div className="flex flex-col sm:flex-row py-2 border-b border-[var(--border)]">
                <span className="font-semibold text-[var(--text)] sm:w-28">Date:</span>
                <span className="text-[var(--text-secondary)]">{formatDate(selectedRequest.request_date || selectedRequest.date)}</span>
              </div>
              <div className="flex flex-col sm:flex-row py-2 border-b border-[var(--border)]">
                <span className="font-semibold text-[var(--text)] sm:w-28">Time:</span>
                <span className="text-[var(--text-secondary)]">{formatTime(selectedRequest.request_time || selectedRequest.time)}</span>
              </div>
              <div className="flex flex-col sm:flex-row py-2 border-b border-[var(--border)]">
                <span className="font-semibold text-[var(--text)] sm:w-28">Reason:</span>
                <span className="text-[var(--text-secondary)] break-words">{selectedRequest.reason || "-"}</span>
              </div>
              <div className="flex flex-col sm:flex-row py-2 border-b border-[var(--border)]">
                <span className="font-semibold text-[var(--text)] sm:w-28">Status:</span>
                <StatusBadge status={selectedRequest.status} />
              </div>
              <div className="flex flex-col sm:flex-row py-2">
                <span className="font-semibold text-[var(--text)] sm:w-28">Submitted:</span>
                <span className="text-[var(--text-secondary)]">{formatDateTime(selectedRequest.created_at)}</span>
              </div>
            </div>
            <div className="flex justify-end mt-6 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 rounded-full bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--border)] transition-all w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteRequestId(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Attendance Request"
        message="Are you sure you want to delete this attendance request? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleteLoading}
        type="delete"
      />

      {/* Modals with proper state reset */}
      <EarlyCheckinModal
        isOpen={showEarlyCheckin} 
        onClose={handleModalClose}
        onSuccess={handleModalClose}
      />
      <LateCheckinModal
        isOpen={showLateCheckin} 
        onClose={handleModalClose}
        onSuccess={handleModalClose}
      />
      <MissedPunchInModal 
        isOpen={showMissedPunchIn} 
        onClose={handleModalClose}
        onSuccess={handleModalClose}
      />
      <MissedPunchOutModal
        isOpen={showMissedPunchOut} 
        onClose={handleModalClose}
        onSuccess={handleModalClose}
      />
      <EditAttendanceRequestModal
        isOpen={showEditModal}
        onClose={handleModalClose}
        request={requestToEdit}
        onSuccess={handleModalClose}
      />
    </div>
  );
};

export default AttendanceRequests;