// src/employee/pages/SupportAdminDashboard.jsx

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useAppTheme } from "../context/ThemeContext";
import {
  FiUser,
  FiClock,
  FiTag ,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiArrowRight,
} from "react-icons/fi";
import apiClient from "../utils/apiClient";
import { showToast } from "../components/common/Toast";

const SupportAdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const { primaryColor, primaryDark } = useAppTheme();
  const [ticketStats, setTicketStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    closed: 0,
    resolved: 0,
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const [currentTime, setCurrentTime] = useState("");

   const adjustColor = (color, percent) => {
    let r, g, b;
    if (color.startsWith('#')) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    } else {
      return color;
    }
    r = Math.max(0, Math.min(255, r + (r * percent) / 100));
    g = Math.max(0, Math.min(255, g + (g * percent) / 100));
    b = Math.max(0, Math.min(255, b + (b * percent) / 100));
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  };

  const gradientStyle = {
    background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark || adjustColor(primaryColor, -20)})`
  };

  // Update time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch ticket stats
  useEffect(() => {
    fetchTicketStats();
  }, []);

  const fetchTicketStats = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/admin/developer-tickets", {
        params: {
          per_page: 100,
        },
      });

      const tickets = response.data?.data?.data || [];
      
      // Calculate stats
      const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === "open" || t.status === "open").length,
        in_progress: tickets.filter(t => t.status === "inprogress" || t.status === "in_progress").length,
        closed: tickets.filter(t => t.status === "closed").length,
        resolved: tickets.filter(t => t.status === "resolved").length,
      };
      setTicketStats(stats);

      // Get recent 5 tickets
      const recent = tickets
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      setRecentTickets(recent);
    } catch (error) {
      console.error("Error fetching ticket stats:", error);
      showToast("Failed to fetch ticket statistics", "error");
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusBadge = (status) => {
    const statusMap = {
      open: { label: "Open", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
      inprogress: { label: "In Progress", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
      resolved: { label: "Resolved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
      closed: { label: "Closed", color: "bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400" },
    };
    const config = statusMap[status] || statusMap.open;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Get user name
  const userName = user?.employee?.name || user?.name || "Support Admin";

  // Stat Card Component
  const StatCard = ({ title, value, icon, color, bgColor, to }) => (
    <Link
      to={to || "/admin/developer-tickets"}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all hover:-translate-y-1"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
          <i className={`${icon} ${color} text-lg`}></i>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="w-full px-4 md:px-6 py-4">
      {/* ─── Welcome Banner ────────────────────────────────────────────────── */}
      <div
  className="rounded-xl p-5 md:p-6 mb-6 shadow-lg"
  style={gradientStyle}
>
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <FiUser className="text-white text-3xl" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Welcome, {userName}! 👋
              </h1>
              <p className="text-white/80 text-sm mt-1">
                Support Admin Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 md:mt-0">
            <div className="text-white/90 text-sm">
              <FiClock className="inline mr-2" />
              {currentTime}
            </div>
            <button
              onClick={fetchTicketStats}
              disabled={loading}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors flex items-center gap-2"
            >
              <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ─── Quick Actions ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Link
          to="/employee/developer-tickets"
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all hover:-translate-y-1 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
              <FiTag  className="text-purple-600 dark:text-purple-400 text-2xl" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Manage Developer Tickets
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                View and update all support tickets
              </p>
            </div>
            <FiArrowRight className="text-gray-400 group-hover:text-purple-500 transition-colors text-xl" />
          </div>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <FiCheckCircle className="text-green-600 dark:text-green-400 text-2xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Quick Stats
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {ticketStats.total} total tickets, {ticketStats.open} open
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Statistics Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard
          title="Total Tickets"
          value={ticketStats.total}
          icon="fas fa-ticket-alt"
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-100 dark:bg-blue-900/30"
          to="/admin/developer-tickets"
        />
        <StatCard
          title="Open"
          value={ticketStats.open}
          icon="fas fa-circle"
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-100 dark:bg-blue-900/30"
          to="/admin/developer-tickets?status=open"
        />
        <StatCard
          title="In Progress"
          value={ticketStats.in_progress}
          icon="fas fa-clock"
          color="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-100 dark:bg-amber-900/30"
          to="/admin/developer-tickets?status=inprogress"
        />
        <StatCard
          title="Closed"
          value={ticketStats.closed}
          icon="fas fa-check-circle"
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-100 dark:bg-green-900/30"
          to="/admin/developer-tickets?status=closed"
        />
      </div>

      {/* ─── Recent Tickets ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <FiTag  className="text-purple-500" />
            Recent Tickets
          </h3>
          <Link
            to="/employee/developer-tickets"
            className="text-sm text-purple-500 hover:text-purple-600 font-medium"
          >
            View All
          </Link>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : recentTickets.length > 0 ? (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">#</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Title</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Module</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Priority</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((ticket, index) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/admin/developer-tickets`}
                  >
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{index + 1}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[150px]">
                      {ticket.title || "Untitled"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {ticket.module?.name || ticket.module_id || "-"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ticket.priority === "high" 
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                          : ticket.priority === "medium"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      }`}>
                        {ticket.priority || "Medium"}
                      </span>
                    </td>
                    <td className="px-4 py-2">{getStatusBadge(ticket.status)}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(ticket.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="flex flex-col items-center gap-2">
                <i className="fas fa-ticket-alt text-4xl text-gray-300 dark:text-gray-600"></i>
                <p>No tickets found</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportAdminDashboard;