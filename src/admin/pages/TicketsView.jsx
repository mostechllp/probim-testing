import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiEye,
  FiSearch,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiMessageSquare,
  FiUser,
  FiCalendar,
  FiGrid,
  FiInfo,
  FiFileText,
  FiImage,
  FiMail,
  FiTag,
  FiFlag,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

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
    updated_at: "2024-01-15T10:30:00",
    notes: [
      { id: 1, content: "Investigating the issue", created_at: "2024-01-15T11:00:00", author: "Developer 1" },
      { id: 2, content: "Fixed the mobile app bug", created_at: "2024-01-15T14:30:00", author: "Developer 1" },
    ],
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
    updated_at: "2024-01-14T16:30:00",
    notes: [
      { id: 1, content: "Looking into the leave balance calculation", created_at: "2024-01-14T15:00:00", author: "Developer 2" },
      { id: 2, content: "Found the bug, fixing it now", created_at: "2024-01-14T16:30:00", author: "Developer 2" },
    ],
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
    updated_at: "2024-01-13T11:30:00",
    notes: [
      { id: 1, content: "Verified the overtime calculation", created_at: "2024-01-13T10:00:00", author: "Developer 1" },
      { id: 2, content: "Fixed the issue, will be resolved in next payroll", created_at: "2024-01-13T11:30:00", author: "Developer 1" },
    ],
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
    updated_at: "2024-01-12T16:45:00",
    notes: [],
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
    updated_at: "2024-01-12T09:00:00",
    notes: [
      { id: 1, content: "Calendar sync issue", created_at: "2024-01-11T12:00:00", author: "Developer 3" },
      { id: 2, content: "Fixed the calendar sync", created_at: "2024-01-12T09:00:00", author: "Developer 3" },
    ],
  },
  {
    id: 6,
    name: "Emily Chen",
    email: "emily.chen@example.com",
    module: "settings",
    issue_title: "Unable to change profile picture",
    issue_description: "The profile picture upload is failing with an error. I've tried multiple images and formats.",
    screenshot: null,
    screenshot_preview: null,
    date: "2024-01-10",
    status: "resolved",
    priority: "low",
    created_at: "2024-01-10T08:30:00",
    updated_at: "2024-01-10T15:00:00",
    notes: [
      { id: 1, content: "Image upload issue", created_at: "2024-01-10T09:00:00", author: "Developer 2" },
      { id: 2, content: "Fixed the upload handler", created_at: "2024-01-10T15:00:00", author: "Developer 2" },
    ],
  },
  {
    id: 7,
    name: "Robert Taylor",
    email: "robert.taylor@example.com",
    module: "reports",
    issue_title: "Reports not loading",
    issue_description: "The reports page is stuck on loading. I can't view any of my reports for this month.",
    screenshot: null,
    screenshot_preview: null,
    date: "2024-01-09",
    status: "open",
    priority: "high",
    created_at: "2024-01-09T13:00:00",
    updated_at: "2024-01-09T13:00:00",
    notes: [],
  },
  {
    id: 8,
    name: "Lisa Park",
    email: "lisa.park@example.com",
    module: "tasks",
    issue_title: "Task completion not updating",
    issue_description: "When I mark a task as complete, it still shows as pending. The status doesn't update.",
    screenshot: null,
    screenshot_preview: null,
    date: "2024-01-08",
    status: "closed",
    priority: "medium",
    created_at: "2024-01-08T10:15:00",
    updated_at: "2024-01-08T17:00:00",
    notes: [
      { id: 1, content: "Task status bug", created_at: "2024-01-08T11:00:00", author: "Developer 1" },
      { id: 2, content: "Fixed and closed", created_at: "2024-01-08T17:00:00", author: "Developer 1" },
    ],
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
  open: { 
    label: "Open", 
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: "fa-circle",
    iconColor: "text-blue-500"
  },
  in_progress: { 
    label: "In Progress", 
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    icon: "fa-clock",
    iconColor: "text-amber-500"
  },
  resolved: { 
    label: "Resolved", 
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    icon: "fa-check-circle",
    iconColor: "text-green-500"
  },
  closed: { 
    label: "Closed", 
    color: "bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400 border-gray-200 dark:border-gray-700",
    icon: "fa-times-circle",
    iconColor: "text-gray-500"
  },
};

const PRIORITY_CONFIG = {
  high: { 
    label: "High", 
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    icon: "fa-arrow-up"
  },
  medium: { 
    label: "Medium", 
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    icon: "fa-minus"
  },
  low: { 
    label: "Low", 
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    icon: "fa-arrow-down"
  },
};

const AdminTickets = () => {
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

  // View modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);

  // ─── Load Demo Data ────────────────────────────────────────────────────
  useEffect(() => {
    setTickets(DEMO_TICKETS);
  }, []);

  // ─── Get all available modules ────────────────────────────────────────
  const allModules = [...new Set(tickets.map(t => t.module))];

  // ─── Filtered Tickets ──────────────────────────────────────────────────
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.issue_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.issue_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.module?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    const matchesModule = moduleFilter === "all" || ticket.module === moduleFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesModule;
  });

  // ─── Stats ─────────────────────────────────────────────────────────────
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
    closed: tickets.filter(t => t.status === "closed").length,
    high_priority: tickets.filter(t => t.priority === "high").length,
    medium_priority: tickets.filter(t => t.priority === "medium").length,
    low_priority: tickets.filter(t => t.priority === "low").length,
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
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} flex items-center gap-1.5`}>
        <i className={`fas ${config.icon} ${config.iconColor}`}></i>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} flex items-center gap-1.5`}>
        <i className={`fas ${config.icon}`}></i>
        {config.label}
      </span>
    );
  };

  // ─── View Modal Handlers ──────────────────────────────────────────────
  const openViewModal = (ticket) => {
    setViewingTicket(ticket);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingTicket(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="w-full px-4 md:px-6 py-4">
      {/* ─── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-800 to-blue-600 dark:from-gray-200 dark:to-blue-400 bg-clip-text text-transparent">
            <i className="fas fa-ticket-alt mr-2 text-blue-500"></i> All Tickets
          </h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
            View all support tickets across the system
          </p>
        </div>
        <button
          onClick={() => setTickets(DEMO_TICKETS)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
        >
          <FiRefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* ─── Stats Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FiInfo className="text-blue-600 dark:text-blue-400" />
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
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.resolved}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">Resolved</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Secondary Stats (Priority) ────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2 md:p-3 border border-gray-200 dark:border-gray-700 text-center">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">High Priority</span>
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{stats.high_priority}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2 md:p-3 border border-gray-200 dark:border-gray-700 text-center">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Medium Priority</span>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.medium_priority}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2 md:p-3 border border-gray-200 dark:border-gray-700 text-center">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Low Priority</span>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.low_priority}</div>
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
              placeholder="Search tickets by title, name, email, module..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500"
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Employee</th>
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
                        {ticket.notes && ticket.notes.length > 0 && (
                          <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <FiMessageSquare size={10} />
                            {ticket.notes.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                        {MODULE_LABELS[ticket.module] || ticket.module}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{ticket.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{ticket.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getPriorityBadge(ticket.priority)}</td>
                    <td className="px-4 py-3">{getStatusBadge(ticket.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(ticket.date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => openViewModal(ticket)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 transition-colors"
                          title="View Details"
                        >
                          <FiEye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
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
      </div>

      {/* ─── VIEW MODAL ────────────────────────────────────────────────── */}
      {showViewModal && viewingTicket && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-[var(--surface)] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-slide-up border border-[var(--border)]">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-[var(--surface)] z-10 pb-3 border-b border-[var(--border)]">
              <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                <FiEye className="text-blue-500" /> Ticket Details
                <span className="text-xs font-normal text-[var(--muted)] ml-2">
                  #{viewingTicket.id}
                </span>
              </h3>
              <button
                onClick={closeViewModal}
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status & Priority Row */}
              <div className="grid grid-cols-2 gap-4 bg-[var(--surface2)] p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <FiFlag className="text-[var(--muted)]" />
                  <span className="text-xs text-[var(--muted)]">Status:</span>
                  {getStatusBadge(viewingTicket.status)}
                </div>
                <div className="flex items-center gap-2">
                  <FiTag className="text-[var(--muted)]" />
                  <span className="text-xs text-[var(--muted)]">Priority:</span>
                  {getPriorityBadge(viewingTicket.priority)}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs text-[var(--muted)] flex items-center gap-1">
                  <FiFileText className="text-blue-500" size={14} /> Title
                </label>
                <p className="text-sm font-medium text-[var(--text)] mt-1">{viewingTicket.issue_title}</p>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-[var(--muted)] flex items-center gap-1">
                  <FiMessageSquare className="text-blue-500" size={14} /> Description
                </label>
                <p className="text-sm text-[var(--text)] mt-1 bg-[var(--surface2)] p-3 rounded-lg border border-[var(--border)]">
                  {viewingTicket.issue_description}
                </p>
              </div>

              {/* Screenshot */}
              {viewingTicket.screenshot_preview && (
                <div>
                  <label className="text-xs text-[var(--muted)] flex items-center gap-1">
                    <FiImage className="text-blue-500" size={14} /> Screenshot
                  </label>
                  <img
                    src={viewingTicket.screenshot_preview}
                    alt="Screenshot"
                    className="mt-2 max-h-64 rounded-lg border border-[var(--border)] object-contain"
                  />
                </div>
              )}

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 bg-[var(--surface2)] p-3 rounded-lg border border-[var(--border)]">
                <div>
                  <label className="text-xs text-[var(--muted)] flex items-center gap-1">
                    <FiUser className="text-blue-500" size={14} /> Employee
                  </label>
                  <p className="text-sm font-medium text-[var(--text)]">{viewingTicket.name}</p>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] flex items-center gap-1">
                    <FiMail className="text-blue-500" size={14} /> Email
                  </label>
                  <p className="text-sm text-[var(--text)]">{viewingTicket.email}</p>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] flex items-center gap-1">
                    <FiGrid className="text-blue-500" size={14} /> Module
                  </label>
                  <p className="text-sm text-[var(--text)]">{MODULE_LABELS[viewingTicket.module] || viewingTicket.module}</p>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] flex items-center gap-1">
                    <FiCalendar className="text-blue-500" size={14} /> Date
                  </label>
                  <p className="text-sm text-[var(--text)]">{formatDate(viewingTicket.date)}</p>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-xs text-[var(--muted)]">
                <div>
                  <label className="text-[10px] uppercase tracking-wider">Created At</label>
                  <p className="mt-0.5">{formatDateTime(viewingTicket.created_at)}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider">Last Updated</label>
                  <p className="mt-0.5">{formatDateTime(viewingTicket.updated_at)}</p>
                </div>
              </div>

              {/* ─── Notes Section ────────────────────────────────────── */}
              <div>
                <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-2">
                  <FiMessageSquare className="text-blue-500" /> Notes & Updates
                  <span className="text-[10px] text-[var(--muted)]">
                    ({viewingTicket.notes?.length || 0})
                  </span>
                </label>
                <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {viewingTicket.notes && viewingTicket.notes.length > 0 ? (
                    viewingTicket.notes.map((note, idx) => (
                      <div key={note.id} className="bg-[var(--surface2)] p-3 rounded-lg border border-[var(--border)]">
                        <div className="flex justify-between items-start">
                          <p className="text-sm text-[var(--text)]">{note.content}</p>
                          <span className="text-[10px] text-[var(--muted)] whitespace-nowrap ml-2">
                            {formatDateTime(note.created_at)}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--muted)] mt-1">
                          <FiUser className="inline mr-1" size={10} />
                          {note.author || "Developer"} • Note #{idx + 1}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--muted)] italic p-3 text-center">No notes have been added to this ticket yet</p>
                  )}
                </div>
              </div>

              {/* Footer - View Only */}
              <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
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
    </div>
  );
};

export default AdminTickets;