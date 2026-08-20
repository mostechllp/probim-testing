import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/common/Toast";
import {
  FiUser,
  FiMail,
  FiGrid,
  FiFileText,
  FiMessageSquare,
  FiImage,
  FiCalendar,
  FiSend,
  FiX,
  FiAlertCircle,
  FiCheckCircle,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiClock,
  FiSearch,
  FiFilter,
  FiLock,
} from "react-icons/fi";
import apiClient from "../utils/apiClient";

// ─── Demo Data ────────────────────────────────────────────────────────────
const DEMO_TICKETS = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    module: "attendance",
    issue_title: "Cannot punch in from mobile",
    issue_description: "The punch in button is not working on the mobile app. It shows an error every time I try to punch in.",
    screenshot: null,
    screenshot_preview: null,
    date: "2024-01-15",
    status: "open",
    priority: "high",
    created_at: "2024-01-15T10:30:00",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@example.com",
    module: "leaves",
    issue_title: "Leave balance not updating",
    issue_description: "My leave balance is not updating after I took leave last week. It still shows the same balance.",
    screenshot: null,
    screenshot_preview: null,
    date: "2024-01-14",
    status: "in_progress",
    priority: "medium",
    created_at: "2024-01-14T14:20:00",
  },
  {
    id: 3,
    name: "Mike Johnson",
    email: "mike.johnson@example.com",
    module: "payroll",
    issue_title: "Salary discrepancy in January",
    issue_description: "My January salary seems to be missing the overtime pay. Please check and update.",
    screenshot: null,
    screenshot_preview: null,
    date: "2024-01-13",
    status: "resolved",
    priority: "high",
    created_at: "2024-01-13T09:15:00",
  },
  {
    id: 4,
    name: "Sarah Wilson",
    email: "sarah.wilson@example.com",
    module: "projects",
    issue_title: "Cannot access project files",
    issue_description: "I'm getting a permission denied error when trying to access project files for Project Alpha.",
    screenshot: null,
    screenshot_preview: null,
    date: "2024-01-12",
    status: "open",
    priority: "low",
    created_at: "2024-01-12T16:45:00",
  },
  {
    id: 5,
    name: "David Brown",
    email: "david.brown@example.com",
    module: "wfh",
    issue_title: "WFH request not showing in calendar",
    issue_description: "My approved WFH request for Jan 20 is not showing in the calendar view.",
    screenshot: null,
    screenshot_preview: null,
    date: "2024-01-11",
    status: "in_progress",
    priority: "medium",
    created_at: "2024-01-11T11:00:00",
  },
];

const MODULE_LABELS = {
  dashboard: "Dashboard",
  attendance: "Attendance",
  leaves: "Leaves",
  projects: "Projects",
  payroll: "Payroll",
  employees: "Employees",
  reports: "Reports",
  settings: "Settings",
  wfh: "WFH Requests",
  tasks: "Tasks",
  documents: "Documents",
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
};

const PRIORITY_CONFIG = {
  high: { label: "High", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  low: { label: "Low", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" },
};

const TicketRaise = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { dashboardData } = useSelector((state) => state.EmpAttendance || {});

  // ─── State ──────────────────────────────────────────────────────────────
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // add | edit
  const [editingTicket, setEditingTicket] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState({});

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState(null);

  // View modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);

  // ─── Get employee details from state ──────────────────────────────────
  const employee = dashboardData?.employee || {};
  const employeeName =
    employee.first_name && employee.last_name
      ? `${employee.first_name} ${employee.last_name}`
      : employee.name || user?.name || "";
  const employeeEmail = employee.email || user?.email || "";

  // ─── Form State ─────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: employeeName,
    email: employeeEmail,
    module: "",
    issue_title: "",
    issue_description: "",
    screenshot: null,
    screenshot_preview: null,
    date: new Date().toISOString().split("T")[0],
    status: "open",
    priority: "medium",
  });

  const [modules, setModules] = useState([]);

  // ─── Load Demo Data ────────────────────────────────────────────────────
  useEffect(() => {
    setTickets(DEMO_TICKETS);
    
    const sidebarModules = user?.sidebar_modules || [];
    if (sidebarModules.length > 0) {
      const moduleOptions = sidebarModules
        .filter((mod) => mod.status === "active")
        .map((mod) => ({
          value: mod.slug || mod.name,
          label: mod.name || mod.slug,
        }));
      setModules(moduleOptions);
    } else {
      const fallbackModules = [
        { value: "dashboard", label: "Dashboard" },
        { value: "attendance", label: "Attendance" },
        { value: "leaves", label: "Leaves" },
        { value: "projects", label: "Projects" },
        { value: "payroll", label: "Payroll" },
        { value: "employees", label: "Employees" },
        { value: "reports", label: "Reports" },
        { value: "settings", label: "Settings" },
        { value: "wfh", label: "WFH Requests" },
        { value: "tasks", label: "Tasks" },
        { value: "documents", label: "Documents" },
      ];
      setModules(fallbackModules);
    }
  }, [user]);

  // ─── Filtered Tickets ──────────────────────────────────────────────────
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.issue_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.issue_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.module?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesModule = moduleFilter === "all" || ticket.module === moduleFilter;
    
    return matchesSearch && matchesStatus && matchesModule;
  });

  // ─── Stats ─────────────────────────────────────────────────────────────
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
  };

  // ─── Modal Handlers ────────────────────────────────────────────────────
  const openAddModal = () => {
    setModalMode("add");
    setEditingTicket(null);
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      name: employeeName,
      email: employeeEmail,
      module: "",
      issue_title: "",
      issue_description: "",
      screenshot: null,
      screenshot_preview: null,
      date: today,
      status: "open",
      priority: "medium",
    });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (ticket) => {
    setModalMode("edit");
    setEditingTicket(ticket);
    setFormData({
      name: ticket.name,
      email: ticket.email,
      module: ticket.module,
      issue_title: ticket.issue_title,
      issue_description: ticket.issue_description,
      screenshot: ticket.screenshot || null,
      screenshot_preview: ticket.screenshot_preview || null,
      date: ticket.date,
      status: ticket.status,
      priority: ticket.priority || "medium",
    });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTicket(null);
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      name: employeeName,
      email: employeeEmail,
      module: "",
      issue_title: "",
      issue_description: "",
      screenshot: null,
      screenshot_preview: null,
      date: today,
      status: "open",
      priority: "medium",
    });
    setErrors({});
    setSubmitting(false);
  };

  const openViewModal = (ticket) => {
    setViewingTicket(ticket);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingTicket(null);
  };

  // ─── Delete Handlers ──────────────────────────────────────────────────
  const openDeleteConfirm = (id) => {
    setDeletingTicketId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (deletingTicketId) {
      setTickets(tickets.filter(t => t.id !== deletingTicketId));
      showToast("Ticket deleted successfully", "success");
      setShowDeleteConfirm(false);
      setDeletingTicketId(null);
    }
  };

  // ─── Validation ────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};

    if (!formData.module) {
      newErrors.module = "Please select a module";
    }

    if (!formData.issue_title || formData.issue_title.trim().length < 5) {
      newErrors.issue_title = "Issue title must be at least 5 characters";
    }

    if (!formData.issue_description || formData.issue_description.trim().length < 10) {
      newErrors.issue_description = "Issue description must be at least 10 characters";
    }

    // ─── SCREENSHOT IS NOW REQUIRED ──────────────────────────────────────
    if (!formData.screenshot) {
      newErrors.screenshot = "Please upload a screenshot (required)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Handle File Upload ───────────────────────────────────────────────
  const handleFileChange = (file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("File size must be less than 5MB", "error");
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Please upload a valid image (PNG, JPG, JPEG, GIF)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData({
        ...formData,
        screenshot: file,
        screenshot_preview: e.target.result,
      });
      setErrors({ ...errors, screenshot: "" });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeScreenshot = () => {
    setFormData({
      ...formData,
      screenshot: null,
      screenshot_preview: null,
    });
    // Show error if trying to remove in edit mode with existing screenshot
    if (modalMode === "edit" && editingTicket?.screenshot) {
      setErrors({ ...errors, screenshot: "Screenshot is required" });
    }
  };

  // ─── Handle Submit ─────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Please fix the errors before submitting", "error");
      return;
    }

    setSubmitting(true);

    try {
      if (modalMode === "add") {
        const newTicket = {
          id: Date.now(),
          name: formData.name,
          email: formData.email,
          module: formData.module,
          issue_title: formData.issue_title,
          issue_description: formData.issue_description,
          screenshot: formData.screenshot,
          screenshot_preview: formData.screenshot_preview,
          date: formData.date,
          status: formData.status,
          priority: formData.priority || "medium",
          created_at: new Date().toISOString(),
        };
        setTickets([newTicket, ...tickets]);
        showToast("Ticket raised successfully!", "success");
      } else if (modalMode === "edit" && editingTicket) {
        const updatedTicket = {
          ...editingTicket,
          module: formData.module,
          issue_title: formData.issue_title,
          issue_description: formData.issue_description,
          screenshot: formData.screenshot,
          screenshot_preview: formData.screenshot_preview,
          priority: formData.priority || "medium",
          // Name, email, date, status remain unchanged
        };
        setTickets(tickets.map(t => t.id === editingTicket.id ? updatedTicket : t));
        showToast("Ticket updated successfully!", "success");
      }

      closeModal();
    } catch (error) {
      console.error("Error saving ticket:", error);
      showToast(error.message || "Failed to save ticket", "error");
    } finally {
      setSubmitting(false);
    }
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

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="w-full px-4 md:px-6 py-4">
      {/* ─── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-800 to-green-600 dark:from-gray-200 dark:to-green-400 bg-clip-text text-transparent">
            <i className="fas fa-ticket-alt mr-2 text-green-500"></i> Tickets
          </h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your support tickets
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
        >
          <FiPlus size={18} /> Raise Ticket
        </button>
      </div>

      {/* ─── Stats Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FiClock className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{stats.total}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">Total</div>
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
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.resolved}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">Resolved</div>
            </div>
          </div>
        </div>
      </div>

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
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500"
        >
          <option value="all">All Modules</option>
          {modules.map((mod) => (
            <option key={mod.value} value={mod.value}>{mod.label}</option>
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
              {filteredTickets.length > 0 ? (
                filteredTickets.map((ticket, index) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                          {ticket.issue_title}
                        </span>
                        {ticket.screenshot_preview && (
                          <img
                            src={ticket.screenshot_preview}
                            alt="screenshot"
                            className="w-6 h-6 rounded object-cover border border-gray-200 dark:border-gray-700"
                          />
                        )}
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
                        >
                          <FiEye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(ticket)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-green-500 transition-colors"
                          title="Edit Ticket"
                        >
                          <FiEdit size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(ticket.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 transition-colors"
                          title="Delete Ticket"
                        >
                          <FiTrash2 size={16} />
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
                      <button
                        onClick={openAddModal}
                        className="text-sm text-green-500 hover:text-green-600 font-medium"
                      >
                        Raise a ticket
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ADD/EDIT MODAL ────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-[var(--surface)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-slide-up border border-[var(--border)]">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                <i className={`fas ${modalMode === "add" ? "fa-plus-circle" : "fa-edit"} text-green-500`}></i>
                {modalMode === "add" ? "Raise New Ticket" : "Edit Ticket"}
              </h3>
              <button
                onClick={closeModal}
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ─── NAME & EMAIL (Read-only) ────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                    <FiUser className="text-green-500" /> Full Name
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 cursor-not-allowed opacity-75"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                    <FiMail className="text-green-500" /> Email
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 cursor-not-allowed opacity-75"
                  />
                </div>
              </div>

              {/* ─── MODULE & PRIORITY ───────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                    <FiGrid className="text-green-500" /> Module
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={formData.module}
                    onChange={(e) => {
                      setFormData({ ...formData, module: e.target.value });
                      setErrors({ ...errors, module: "" });
                    }}
                    className={`w-full px-3.5 py-2.5 bg-[var(--surface2)] border rounded-lg text-sm text-[var(--text)] focus:outline-none focus:ring-2 ${
                      errors.module
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-[var(--border)] focus:border-green-500 focus:ring-green-500/20"
                    }`}
                  >
                    <option value="">Select Module</option>
                    {modules.map((mod) => (
                      <option key={mod.value} value={mod.value}>{mod.label}</option>
                    ))}
                  </select>
                  {errors.module && <p className="mt-1 text-xs text-red-500">{errors.module}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                    <FiAlertCircle className="text-green-500" /> Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* ─── ISSUE TITLE ─────────────────────────────────────────── */}
              <div>
                <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                  <FiFileText className="text-green-500" /> Issue Title
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={formData.issue_title}
                  onChange={(e) => {
                    setFormData({ ...formData, issue_title: e.target.value });
                    setErrors({ ...errors, issue_title: "" });
                  }}
                  placeholder="Brief title of the issue"
                  className={`w-full px-3.5 py-2.5 bg-[var(--surface2)] border rounded-lg text-sm text-[var(--text)] focus:outline-none focus:ring-2 ${
                    errors.issue_title
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-[var(--border)] focus:border-green-500 focus:ring-green-500/20"
                  }`}
                />
                {errors.issue_title && <p className="mt-1 text-xs text-red-500">{errors.issue_title}</p>}
              </div>

              {/* ─── ISSUE DESCRIPTION ───────────────────────────────────── */}
              <div>
                <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                  <FiMessageSquare className="text-green-500" /> Description
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={formData.issue_description}
                  onChange={(e) => {
                    setFormData({ ...formData, issue_description: e.target.value });
                    setErrors({ ...errors, issue_description: "" });
                  }}
                  rows="3"
                  placeholder="Describe the issue in detail (minimum 10 characters)..."
                  className={`w-full px-3.5 py-2.5 bg-[var(--surface2)] border rounded-lg text-sm text-[var(--text)] focus:outline-none focus:ring-2 resize-none ${
                    errors.issue_description
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-[var(--border)] focus:border-green-500 focus:ring-green-500/20"
                  }`}
                />
                <div className="flex justify-between mt-1">
                  <small className="text-[10px] text-[var(--muted)]">Minimum 10 characters</small>
                  <small className={`text-[10px] ${formData.issue_description.length >= 10 ? "text-green-500" : "text-[var(--muted)]"}`}>
                    {formData.issue_description.length}/10
                  </small>
                </div>
                {errors.issue_description && <p className="mt-1 text-xs text-red-500">{errors.issue_description}</p>}
              </div>

              {/* ─── SCREENSHOT UPLOAD (REQUIRED) ────────────────────────── */}
              <div>
                <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                  <FiImage className="text-green-500" /> Screenshot
                  <span className="text-red-500 ml-1">*</span>
                </label>
                {!formData.screenshot_preview ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => document.getElementById("screenshot-input").click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : errors.screenshot
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20 hover:border-red-400"
                          : "border-gray-300 dark:border-gray-600 hover:border-green-400"
                    }`}
                  >
                    <input
                      id="screenshot-input"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif"
                      onChange={(e) => handleFileChange(e.target.files[0])}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <i className="fas fa-cloud-upload-alt text-3xl text-gray-400"></i>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Drag & drop or click to upload</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">PNG, JPG, JPEG, GIF (Max 5MB)</p>
                      {errors.screenshot && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                          <FiAlertCircle size={12} /> {errors.screenshot}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-start gap-4">
                      <img
                        src={formData.screenshot_preview}
                        alt="Screenshot preview"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {formData.screenshot?.name || "Screenshot"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(formData.screenshot.size / 1024).toFixed(1)} KB
                        </p>
                        <button
                          type="button"
                          onClick={removeScreenshot}
                          className="mt-1 text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                        >
                          <FiX size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {!errors.screenshot && !formData.screenshot_preview && (
                  <p className="text-[10px] text-[var(--muted)] mt-1">
                    <i className="fas fa-info-circle mr-1"></i>
                    A screenshot is required to help us understand the issue better
                  </p>
                )}
              </div>

              {/* ─── DATE & STATUS (Read-only) ──────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                    <FiCalendar className="text-green-500" /> Date
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 cursor-not-allowed opacity-75"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                    <FiCheckCircle className="text-green-500" /> Status
                    <span className="text-[10px] text-[var(--muted)] ml-1">(Auto-set)</span>
                  </label>
                  <input
                    type="text"
                    value={modalMode === "add" ? "Open" : (STATUS_CONFIG[formData.status]?.label || formData.status)}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 cursor-not-allowed opacity-75 font-medium"
                  />
                  {modalMode === "edit" && (
                    <p className="text-[10px] text-[var(--muted)] mt-1">
                      <i className="fas fa-info-circle mr-1"></i>
                      Status cannot be changed from this form. It is managed by the system.
                    </p>
                  )}
                </div>
              </div>

              {/* ─── BUTTONS ─────────────────────────────────────────────── */}
              <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] font-medium text-sm hover:bg-[var(--surface3)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.screenshot}
                  className="flex-1 py-2.5 px-4 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><i className="fas fa-spinner fa-spin"></i> {modalMode === "add" ? "Creating..." : "Updating..."}</>
                  ) : (
                    <><FiSend /> {modalMode === "add" ? "Raise Ticket" : "Update Ticket"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              </div>

              <div>
                <label className="text-xs text-[var(--muted)]">Description</label>
                <p className="text-sm text-[var(--text)] mt-1 bg-[var(--surface2)] p-3 rounded-lg">
                  {viewingTicket.issue_description}
                </p>
              </div>

              {viewingTicket.screenshot_preview ? (
                <div>
                  <label className="text-xs text-[var(--muted)]">Screenshot</label>
                  <img
                    src={viewingTicket.screenshot_preview}
                    alt="Screenshot"
                    className="mt-2 max-h-64 rounded-lg border border-[var(--border)]"
                  />
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                    <FiAlertCircle size={16} />
                    No screenshot uploaded for this ticket
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  onClick={() => {
                    closeViewModal();
                    openEditModal(viewingTicket);
                  }}
                  className="flex-1 py-2.5 px-4 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FiEdit /> Edit Ticket
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

      {/* ─── DELETE CONFIRMATION ────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="bg-[var(--surface)] rounded-xl max-w-md w-full p-6 shadow-2xl animate-slide-up border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <FiTrash2 className="text-red-600 dark:text-red-400 text-2xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text)]">Delete Ticket</h3>
                <p className="text-sm text-[var(--muted)]">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Are you sure you want to delete this ticket? All data associated with it will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingTicketId(null);
                }}
                className="flex-1 py-2.5 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] font-medium text-sm hover:bg-[var(--surface3)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 px-4 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <FiTrash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketRaise;