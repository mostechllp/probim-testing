import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/common/Toast";
import {
  FiEye,
  FiEdit,
  FiX,
  FiSearch,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiMessageSquare,
  FiUser,
  FiCalendar,
  FiGrid,
  FiSend,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import apiClient from "../utils/apiClient";

// ─── Constants ────────────────────────────────────────────────────────────
const MODULE_LABELS = {
  dashboard: "Dashboard",
  attendance: "Attendance",
  leaves: "Leaves",
  projects: "Projects",
  payroll: "Payroll",
  employees: "Employees",
  reports: "Reports",
  settings: "Settings",
  "wfh-requests": "WFH Requests",
  tasks: "Tasks",
  documents: "Documents",
  "ticket-raise": "Ticket Raise",
  "task-reports": "Task Reports",
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  inprogress: { label: "In Progress", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
  reopen: { label: "Reopen", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
};

const PRIORITY_CONFIG = {
  high: { label: "High", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  low: { label: "Low", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" },
};

// ─── Status Options for UI ──────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "inprogress", label: "In Progress" },
  { value: "closed", label: "Closed" },
  { value: "reopen", label: "Reopen" },
];

// ─── Status mapping for API ──────────────────────────────────────────────
const STATUS_MAP = {
  open: "open",
  in_progress: "inprogress",
  inprogress: "inprogress",
  closed: "closed",
  reopen: "reopen",
};

const REVERSE_STATUS_MAP = {
  open: "open",
  inprogress: "inprogress",
  closed: "closed",
  reopen: "reopen",
};

const DeveloperTickets = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // ─── State ──────────────────────────────────────────────────────────────
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [allModules, setAllModules] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [editFormData, setEditFormData] = useState({
    status: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);

  // ─── API Calls ──────────────────────────────────────────────────────────

  // Fetch tickets from API
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {
        status: statusFilter !== "all" ? STATUS_MAP[statusFilter] : undefined,
        search: searchTerm || undefined,
        per_page: perPage,
        page: currentPage,
      };

      const response = await apiClient.get("/admin/developer-tickets", { params });
      
      const responseData = response.data.data;
      const ticketsData = responseData.data || [];
      
      const transformedTickets = ticketsData.map((ticket) => ({
        id: ticket.id,
        name: ticket.user?.name || ticket.name || "Unknown User",
        email: ticket.user?.email || ticket.email || "",
        module: ticket.module?.slug || ticket.module_id || "unknown",
        issue_title: ticket.title || "Untitled Ticket",
        issue_description: ticket.description || "",
        screenshot: ticket.screenshot || null,
        screenshot_preview: ticket.screenshot ? `/storage/${ticket.screenshot}` : null,
        date: ticket.created_at?.split('T')[0] || "",
        status: REVERSE_STATUS_MAP[ticket.status] || ticket.status || "open",
        priority: ticket.priority || "medium",
        created_at: ticket.created_at || "",
        notes: ticket.notes || "", // Keep as string
        user_id: ticket.user_id,
        module_id: ticket.module_id,
      }));

      setTickets(transformedTickets);
      
      setTotalPages(responseData.last_page || 1);
      setTotalItems(responseData.total || 0);
      setCurrentPage(responseData.current_page || 1);

      const modules = [...new Set(transformedTickets.map(t => t.module))];
      setAllModules(modules);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      showToast(
        error.response?.data?.message || "Failed to load tickets",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // View a single ticket
  const fetchTicketDetails = async (ticketId) => {
    try {
      const response = await apiClient.get(`/admin/developer-tickets/${ticketId}`);
      
      const ticket = response.data.data || response.data;
      
      const transformedTicket = {
        id: ticket.id,
        name: ticket.user?.name || ticket.name || "Unknown User",
        email: ticket.user?.email || ticket.email || "",
        module: ticket.module?.slug || ticket.module_id || "unknown",
        issue_title: ticket.title || "Untitled Ticket",
        issue_description: ticket.description || "",
        screenshot: ticket.screenshot || null,
        screenshot_preview: ticket.screenshot ? `/storage/${ticket.screenshot}` : null,
        date: ticket.created_at?.split('T')[0] || "",
        status: REVERSE_STATUS_MAP[ticket.status] || ticket.status || "open",
        priority: ticket.priority || "medium",
        created_at: ticket.created_at || "",
        notes: ticket.notes || "", // Keep as string
        user_id: ticket.user_id,
        module_id: ticket.module_id,
      };
      
      return transformedTicket;
    } catch (error) {
      console.error("Error fetching ticket details:", error);
      showToast(
        error.response?.data?.message || "Failed to load ticket details",
        "error"
      );
      return null;
    }
  };

  // Update ticket status
  const updateTicketStatus = async (ticketId, status, note) => {
    try {
      const apiStatus = STATUS_MAP[status] || status;
      
      const response = await apiClient.patch(`/admin/developer-tickets/${ticketId}/status`, {
        status: apiStatus,
        notes: note || undefined,
      });
      
      return response.data;
    } catch (error) {
      console.error("Error updating ticket:", error);
      throw new Error(error.response?.data?.message || "Failed to update ticket");
    }
  };

  // ─── Load Data ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, searchTerm, currentPage, perPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  // ─── Filtered Tickets ──────────────────────────────────────────────────
  const filteredTickets = tickets.filter((ticket) => {
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    const matchesModule = moduleFilter === "all" || ticket.module === moduleFilter;
    return matchesPriority && matchesModule;
  });

  // ─── Stats ─────────────────────────────────────────────────────────────
  const stats = {
    total: totalItems || tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "inprogress").length,
    closed: tickets.filter(t => t.status === "closed").length,
  };

  // ─── Format Date ──────────────────────────────────────────────────────
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // ─── View Modal Handlers ──────────────────────────────────────────────
  const openViewModal = async (ticket) => {
    const fullTicket = await fetchTicketDetails(ticket.id);
    if (fullTicket) {
      setViewingTicket(fullTicket);
      setShowViewModal(true);
    } else {
      setViewingTicket(ticket);
      setShowViewModal(true);
    }
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingTicket(null);
  };

  // ─── Edit Modal Handlers ──────────────────────────────────────────────
  const openEditModal = async (ticket) => {
    setIsLoadingTicket(true);
    
    try {
      const fullTicket = await fetchTicketDetails(ticket.id);
      
      if (fullTicket) {
        setEditingTicket(fullTicket);
        setEditFormData({
          status: fullTicket.status,
          note: "",
        });
        setShowEditModal(true);
      } else {
        setEditingTicket(ticket);
        setEditFormData({
          status: ticket.status,
          note: "",
        });
        setShowEditModal(true);
      }
    } catch (error) {
      console.error("Error opening edit modal:", error);
      showToast("Failed to load ticket details", "error");
    } finally {
      setIsLoadingTicket(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTicket(null);
    setEditFormData({
      status: "",
      note: "",
    });
    setSubmitting(false);
    setIsLoadingTicket(false);
  };

  const handleUpdateTicket = async () => {
    if (!editingTicket) return;

    setSubmitting(true);

    try {
      await updateTicketStatus(
        editingTicket.id,
        editFormData.status,
        editFormData.note.trim()
      );

      showToast("Ticket updated successfully!", "success");

      await fetchTickets();

      if (showViewModal && viewingTicket?.id === editingTicket.id) {
        const updatedTicket = await fetchTicketDetails(editingTicket.id);
        if (updatedTicket) {
          setViewingTicket(updatedTicket);
        }
      }

      closeEditModal();
    } catch (error) {
      console.error("Error updating ticket:", error);
      showToast(error.message || "Failed to update ticket", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Refresh Handler ──────────────────────────────────────────────────
  const handleRefresh = () => {
    fetchTickets();
  };

  // ─── Pagination Handlers ──────────────────────────────────────────────
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // ─── Stats Cards ──────────────────────────────────────────────────────
  const StatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <FiClock className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{stats.total}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Total Tickets</div>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <FiAlertCircle className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.open}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Open</div>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <FiClock className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.in_progress}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">In Progress</div>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <FiCheckCircle className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.closed || 0}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Closed</div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="w-full px-4 md:px-6 py-4">
      {/* ─── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-800 to-green-600 dark:from-gray-200 dark:to-green-400 bg-clip-text text-transparent">
            <i className="fas fa-ticket-alt mr-2 text-green-500"></i> Developer Tickets
          </h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and resolve support tickets {loading && <span className="inline-block ml-2 animate-spin">⟳</span>}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* ─── Stats Cards ────────────────────────────────────────────────── */}
      <StatsCards />

      {/* ─── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tickets..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="inprogress">In Progress</option>
          <option value="closed">Closed</option>
          <option value="reopen">Reopen</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Modules</option>
          {allModules.map((mod) => (
            <option key={mod} value={mod}>{MODULE_LABELS[mod] || mod}</option>
          ))}
        </select>
      </div>

      {/* ─── Table ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Module</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin">
                        <FiRefreshCw size={32} className="text-purple-500" />
                      </div>
                      <p>Loading tickets...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket, index) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {((currentPage - 1) * perPage) + index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                          {ticket.issue_title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {MODULE_LABELS[ticket.module] || ticket.module}
                    </td>
                    <td className="px-4 py-3">{getPriorityBadge(ticket.priority)}</td>
                    <td className="px-4 py-3">{getStatusBadge(ticket.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(ticket.date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openViewModal(ticket)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 transition-colors"
                          title="View Details"
                          disabled={loading}
                        >
                          <FiEye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(ticket)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-purple-500 transition-colors"
                          title="Update Ticket"
                          disabled={loading}
                        >
                          <FiEdit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fas fa-ticket-alt text-4xl text-gray-300 dark:text-gray-600"></i>
                      <p>No tickets found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination ────────────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, totalItems)} of {totalItems} tickets
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft size={20} />
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = currentPage - 2 + i;
                if (pageNum < 1) pageNum = i + 1;
                if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                if (pageNum >= 1 && pageNum <= totalPages) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        currentPage === pageNum
                          ? "bg-purple-500 text-white"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── VIEW MODAL ────────────────────────────────────────────────── */}
      {showViewModal && viewingTicket && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-[var(--surface)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-slide-up border border-[var(--border)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                <FiEye className="text-blue-500" /> Ticket Details
              </h3>
              <button
                onClick={closeViewModal}
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--muted)]">Title</label>
                  <p className="text-sm font-medium text-[var(--text)]">{viewingTicket.issue_title}</p>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)]">Module</label>
                  <p className="text-sm text-[var(--text)]">{MODULE_LABELS[viewingTicket.module] || viewingTicket.module}</p>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)]">Priority</label>
                  <div className="mt-1">{getPriorityBadge(viewingTicket.priority)}</div>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)]">Status</label>
                  <div className="mt-1">{getStatusBadge(viewingTicket.status)}</div>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)]">Date</label>
                  <p className="text-sm text-[var(--text)]">{formatDate(viewingTicket.date)}</p>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)]">Created</label>
                  <p className="text-sm text-[var(--text)]">{formatDateTime(viewingTicket.created_at)}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-[var(--muted)]">Employee</label>
                  <p className="text-sm text-[var(--text)]">{viewingTicket.name} ({viewingTicket.email})</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--muted)]">Description</label>
                <p className="text-sm text-[var(--text)] mt-1 bg-[var(--surface2)] p-3 rounded-lg">
                  {viewingTicket.issue_description}
                </p>
              </div>

              {viewingTicket.screenshot && (
                <div>
                  <label className="text-xs text-[var(--muted)]">Screenshot</label>
                  <img
                    src={viewingTicket.screenshot_preview || viewingTicket.screenshot}
                    alt="Screenshot"
                    className="mt-2 max-h-64 rounded-lg border border-[var(--border)]"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* ─── Notes Section ────────────────────────────────────── */}
              <div>
                <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-2">
                  <FiMessageSquare className="text-purple-500" /> Notes
                </label>
                <div className="mt-2 p-3 bg-[var(--surface2)] rounded-lg border border-[var(--border)]">
                  {viewingTicket.notes ? (
                    <p className="text-sm text-[var(--text)]">{viewingTicket.notes}</p>
                  ) : (
                    <p className="text-sm text-[var(--muted)] italic">No notes</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  onClick={() => {
                    closeViewModal();
                    openEditModal(viewingTicket);
                  }}
                  className="flex-1 py-2.5 px-4 bg-purple-500 text-white rounded-lg font-medium text-sm hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FiEdit /> Update Ticket
                </button>
                <button
                  onClick={closeViewModal}
                  className="flex-1 py-2.5 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] font-medium text-sm hover:bg-[var(--surface3)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT/UPDATE MODAL ────────────────────────────────────────── */}
      {showEditModal && editingTicket && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-[var(--surface)] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-slide-up border border-[var(--border)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                <FiEdit className="text-purple-500" /> Update Ticket
                <span className="text-xs font-normal text-[var(--muted)] ml-2">
                  #{editingTicket.id}
                </span>
              </h3>
              <button
                onClick={closeEditModal}
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            {isLoadingTicket ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Ticket Info */}
                <div className="p-3 bg-[var(--surface2)] rounded-lg border border-[var(--border)]">
                  <p className="text-sm font-medium text-[var(--text)]">{editingTicket.issue_title}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    <FiUser className="inline mr-1" size={12} />
                    {editingTicket.name} • {MODULE_LABELS[editingTicket.module] || editingTicket.module}
                  </p>
                </div>

                {/* Update Form */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                      <FiAlertCircle className="text-purple-500" /> Status
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                      <FiMessageSquare className="text-purple-500" /> Add Note
                      <span className="text-[10px] text-[var(--muted)] ml-1">(Optional)</span>
                    </label>
                    <textarea
                      value={editFormData.note}
                      onChange={(e) => setEditFormData({ ...editFormData, note: e.target.value })}
                      rows="3"
                      placeholder="Add a note about the update (e.g., progress, findings, resolution)..."
                      className="w-full px-3.5 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none"
                    />
                    <p className="text-[10px] text-[var(--muted)] mt-1">
                      <i className="fas fa-info-circle mr-1"></i>
                      Note will be added to the ticket history
                    </p>
                  </div>

                  {/* Current Notes Preview */}
                  {editingTicket.notes && (
                    <div>
                      <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                        <FiClock className="text-[var(--muted)]" /> Current Note
                      </label>
                      <div className="text-sm text-[var(--text)] bg-[var(--surface2)] p-2 rounded-lg mt-1">
                        {editingTicket.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4 mt-4 border-t border-[var(--border)]">
              <button
                onClick={closeEditModal}
                className="flex-1 py-2.5 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] font-medium text-sm hover:bg-[var(--surface3)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTicket}
                disabled={submitting || isLoadingTicket}
                className="flex-1 py-2.5 px-4 bg-gray-500 text-white rounded-lg font-medium text-sm hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><i className="fas fa-spinner fa-spin"></i> Updating...</>
                ) : (
                  <><FiSend /> Update Ticket</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperTickets;