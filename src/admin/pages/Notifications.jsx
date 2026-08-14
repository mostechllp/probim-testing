// src/pages/Notifications.jsx
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiX,
  FiCalendar,
  FiUser,
  FiBriefcase,
  FiEye,
} from "react-icons/fi";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  fetchNotificationById,
  clearSelectedNotification,
} from "../store/slices/notificationSlice";
import { showToast } from "../components/common/Toast";
import Pagination from "../components/common/Paginations";

const Notifications = () => {
  const dispatch = useDispatch();
  const { notifications, unreadCount, loading, selectedNotification } =
    useSelector((state) => state.notifications);

  const [filter, setFilter] = useState("all"); // all, unread, read
  const [searchTerm, setSearchTerm] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  // Filter notifications
  const getFilteredNotifications = () => {
    let filtered = [...notifications];

    // Apply status filter
    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.read);
    } else if (filter === "read") {
      filtered = filtered.filter((n) => n.read);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (n) =>
          n.title?.toLowerCase().includes(search) ||
          n.message?.toLowerCase().includes(search) ||
          n.type?.toLowerCase().includes(search),
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentNotifications = filteredNotifications.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleMarkAsRead = async (id) => {
    await dispatch(markNotificationAsRead(id)).unwrap();
    setShowViewModal(false);
    showToast("Notification marked as read", "success");
  };

  const handleMarkAllRead = async () => {
    await dispatch(markAllNotificationsAsRead()).unwrap();
    showToast("All notifications marked as read", "success");
  };

  const handleViewNotification = async (notification) => {
    try {
      const result = await dispatch(
        fetchNotificationById(notification.id),
      ).unwrap();
      setShowViewModal(true);
    } catch (error) {
      showToast("Failed to load notification details", "error");
    }
  };

  const handleCloseModal = () => {
    setShowViewModal(false);
    dispatch(clearSelectedNotification());
  };

  // ─── FORMAT NOTIFICATION TYPE ──────────────────────────────────────────
  const formatNotificationType = (type) => {
    if (!type) return "Notification";
    
    if (typeof type === 'string') {
      // Handle full class name like "App\\Notifications\\EmployeeSpecialDayNotification"
      const parts = type.split('\\');
      const lastPart = parts[parts.length - 1] || type;
      
      // Remove "Notification" suffix if present
      const cleanType = lastPart.replace(/Notification$/, '');
      
      // Handle underscore separated types
      return cleanType
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    return "Notification";
  };

  // ─── GET NOTIFICATION TYPE COLOR ───────────────────────────────────────
  const getNotificationTypeColor = (notification) => {
    const type = notification.type || notification.data?.type || "";
    const lowerType = String(type).toLowerCase();
    
    if (lowerType.includes('leave')) return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    if (lowerType.includes('attendance')) return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
    if (lowerType.includes('task')) return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
    if (lowerType.includes('document') || lowerType.includes('expiry')) return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
    if (lowerType.includes('probation')) return "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400";
    if (lowerType.includes('contract')) return "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400";
    if (lowerType.includes('special_day') || lowerType.includes('birthday') || lowerType.includes('special')) return "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400";
    if (lowerType.includes('wfh') || lowerType.includes('work from home')) return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
    if (lowerType.includes('onboarding')) return "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400";
    if (lowerType.includes('offboarding')) return "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400";
    if (lowerType.includes('payroll')) return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
    if (lowerType.includes('announcement')) return "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400";
    
    return "bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400";
  };

  const getNotificationIcon = (notification) => {
    const type = notification.type || notification.data?.type || "";
    const lowerType = String(type).toLowerCase();

    if (lowerType.includes("probation")) {
      return <FiClock className="text-orange-500" />;
    }
    if (lowerType.includes("leave")) {
      return <FiCalendar className="text-blue-500" />;
    }
    if (lowerType.includes("attendance")) {
      return <FiUser className="text-purple-500" />;
    }
    if (lowerType.includes("contract")) {
      return <FiBriefcase className="text-indigo-500" />;
    }
    if (lowerType.includes("task")) {
      return <FiCheckCircle className="text-green-500" />;
    }
    if (lowerType.includes("special_day") || lowerType.includes("birthday")) {
      return <FiBell className="text-rose-500" />;
    }
    if (lowerType.includes("document") || lowerType.includes("expiry")) {
      return <FiBell className="text-orange-500" />;
    }
    return <FiBell className="text-gray-500" />;
  };

  const getNotificationColor = (notification) => {
    const type = notification.type || notification.data?.type || "";
    const lowerType = String(type).toLowerCase();

    if (lowerType.includes("probation")) {
      return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
    }
    if (lowerType.includes("leave")) {
      return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    }
    if (lowerType.includes("attendance")) {
      return "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800";
    }
    if (lowerType.includes("contract")) {
      return "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800";
    }
    if (lowerType.includes("task")) {
      return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
    }
    if (lowerType.includes("special_day") || lowerType.includes("birthday")) {
      return "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800";
    }
    if (lowerType.includes("document") || lowerType.includes("expiry")) {
      return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
    }
    return "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatFullDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (notification) => {
    if (notification.read) {
      const readTime = notification.read_at
        ? new Date(notification.read_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Read";
      return (
        <span
          className="text-xs text-gray-400 flex items-center gap-1"
          title={`Read at ${readTime}`}
        >
          <FiCheck className="text-green-500" /> Read
        </span>
      );
    }
    return (
      <span className="text-xs text-green-500 flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
        Unread
      </span>
    );
  };
  
  // Reset to first page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">
            Loading notifications...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="flex items-center text-2xl font-bold">
            <FiBell className="mr-2" />
            <span className="bg-gradient-to-r from-gray-800 to-green-600 dark:from-gray-200 dark:to-green-400 bg-clip-text text-transparent">
              Notifications
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up! No unread notifications"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <FiCheckCircle className="text-sm" />
              Mark All as Read
            </button>
          )}
          <Link
            to="/admin/dashboard"
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-green-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            All
            <span className="ml-1 text-xs opacity-70">
              ({notifications.length})
            </span>
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "unread"
                ? "bg-green-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Unread
            <span className="ml-1 text-xs opacity-70">
              ({notifications.filter((n) => !n.read).length})
            </span>
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "read"
                ? "bg-green-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Read
            <span className="ml-1 text-xs opacity-70">
              ({notifications.filter((n) => n.read).length})
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {currentNotifications.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <FiBell className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No notifications found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || filter !== "all"
              ? "Try adjusting your filters or search terms"
              : "You're all caught up! Check back later for updates"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentNotifications.map((notification) => {
            const type = notification.type || notification.data?.type || "";
            const formattedType = formatNotificationType(type);
            const typeColor = getNotificationTypeColor(notification);
            
            return (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border transition-all ${
                  !notification.read
                    ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 shadow-sm"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`p-2 rounded-lg ${getNotificationColor(notification)}`}
                  >
                    {getNotificationIcon(notification)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColor}`}>
                            {formattedType}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">
                            {formatDate(notification.created_at)}
                          </span>
                          {getStatusBadge(notification)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleViewNotification(notification)}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors flex items-center gap-1"
                        >
                          <FiEye className="text-xs" />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filteredNotifications.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredNotifications.length}
          itemsPerPage={itemsPerPage}
        />
      )}

      {/* View Notification Modal */}
      {showViewModal && selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-slide-up">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${getNotificationColor(selectedNotification)}`}
                >
                  {getNotificationIcon(selectedNotification)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {selectedNotification.title}
                  </h3>
                  {(() => {
                    const type = selectedNotification.type || selectedNotification.data?.type || "";
                    const formattedType = formatNotificationType(type);
                    const typeColor = getNotificationTypeColor(selectedNotification);
                    return (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColor}`}>
                        {formattedType}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-4">
                {/* Message */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Message
                  </label>
                  <p className="text-gray-800 dark:text-gray-200 mt-1 text-sm leading-relaxed">
                    {selectedNotification.message}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">
                      {formatNotificationType(selectedNotification.type || selectedNotification.data?.type || "General")}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </label>
                    <div className="mt-1">
                      {selectedNotification.read ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <FiCheck className="text-green-500" /> Read
                          </span>
                          <span className="text-xs text-gray-400 mt-0.5">
                            Read at:{" "}
                            {selectedNotification.read_at
                              ? new Date(
                                  selectedNotification.read_at,
                                ).toLocaleString("en-US", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-green-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                          Unread
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Received
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">
                      {formatFullDate(selectedNotification.created_at)}
                    </p>
                  </div>
                </div>

                {/* Additional Data */}
                {selectedNotification.data &&
                  Object.keys(selectedNotification.data).length > 0 && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Additional Details
                      </label>
                      <div className="mt-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1">
                        {selectedNotification.data.employee && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Employee</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {selectedNotification.data.employee}
                              {selectedNotification.data.employee_id && (
                                <span className="text-gray-400 ml-1 text-xs">
                                  ({selectedNotification.data.employee_id})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        {selectedNotification.data.due_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Due Date</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {new Date(
                                selectedNotification.data.due_date,
                              ).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                        {selectedNotification.data.days_left !== undefined && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Days Left</span>
                            <span
                              className={`font-medium ${selectedNotification.data.days_left < 0 ? "text-red-500" : "text-green-500"}`}
                            >
                              {selectedNotification.data.days_left < 0
                                ? `${Math.abs(selectedNotification.data.days_left)} days overdue`
                                : `${selectedNotification.data.days_left} days remaining`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              {!selectedNotification.read ? (
                <button
                  onClick={() => handleMarkAsRead(selectedNotification.id)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <FiCheckCircle className="text-sm" />
                  Mark as Read
                </button>
              ) : (
                <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg text-sm font-semibold flex items-center gap-2">
                  <FiCheck className="text-green-500" />
                  Already Read
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;