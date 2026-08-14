import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  fetchUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearSelectedNotification,
} from "../../store/slices/notificationSlice";
import { logoutUser } from "../../../store/slices/authSlice";
import ConfirmModal from "./ConfirmModal";
import { showToast } from "../common/Toast";

const Header = ({ onMenuClick }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [avatarError, setAvatarError] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { notifications, unreadCount, loading } = useSelector(
    (state) => state.notifications,
  );

  // Get user's display name
  const getUserName = () => {
    if (user?.name) return user.name;
    if (user?.employee?.name) return user.employee.name;
    if (user?.username) return user.username;
    return "HR Admin";
  };

  // Get user's email
  const getUserEmail = () => {
    if (user?.email) return user.email;
    if (user?.username) return user.username;
    return "admin@example.com";
  };

  // Get user's avatar
  const getUserAvatar = () => {
    if (avatarError) return null;

    const avatar = user?.avatar;
    if (!avatar) return null;

    const baseUrl =
      import.meta.env.VITE_API_URL?.replace("/api", "") ||
      window.location.origin;

    if (typeof avatar === "object" && avatar.path) {
      return `${baseUrl}/storage/${avatar.path}`;
    }

    if (typeof avatar === "string") {
      if (avatar.startsWith("http")) return avatar;
      if (avatar.startsWith("/storage/")) return `${baseUrl}${avatar}`;
      if (avatar.startsWith("storage/")) return `${baseUrl}/${avatar}`;
      return `${baseUrl}/storage/${avatar}`;
    }

    return null;
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    const name = getUserName();
    if (name && name !== "HR Admin") {
      return name.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Get page title based on current route
  const getPageTitle = () => {
    const path = window.location.pathname;
    const routeMap = {
      '/admin/dashboard': 'Dashboard',
      '/admin/employees': 'Employees',
      '/admin/projects': 'Projects',
      '/admin/leaves': 'Leaves',
      '/admin/attendances': 'Attendance',
      '/admin/settings': 'Settings',
      '/admin/reports': 'Reports',
      '/employee/dashboard': 'Employee Dashboard',
      '/employee/leaves': 'My Leaves',
      '/employee/tasks': 'My Tasks',
      '/employee/task-reports': 'Task Reports',
      '/employee/wfh-requests': 'WFH Requests',
      '/employee/profile': 'My Profile',
    };
    return routeMap[path] || 'Dashboard';
  };

  // Fetch only unread notifications
  useEffect(() => {
    dispatch(fetchUnreadNotifications());
  }, [dispatch]);

  // Refresh unread notifications when the dropdown is opened
  useEffect(() => {
    if (showNotifications) {
      dispatch(fetchUnreadNotifications());
    }
  }, [showNotifications, dispatch]);

  useEffect(() => {
    const updateDate = () => {
      setCurrentDate(
        new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      );
    };
    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle marking a single notification as read
  const handleMarkAsRead = async (id) => {
    if (markingId === id) return;
    
    setMarkingId(id);
    try {
      await dispatch(markNotificationAsRead(id)).unwrap();
      showToast("Notification marked as read", "success");
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      showToast("Failed to mark notification as read", "error");
    } finally {
      setMarkingId(null);
    }
  };

  // Handle marking all notifications as read
  const handleMarkAllRead = async () => {
    if (markingAll) return;
    
    setMarkingAll(true);
    try {
      await dispatch(markAllNotificationsAsRead()).unwrap();
      showToast("All notifications marked as read", "success");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      showToast("Failed to mark all as read", "error");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleLogoutClick = () => {
    setShowProfile(false);
    setShowLogoutConfirm(true);
  };

const handleConfirmLogout = async () => {
  setLogoutLoading(true);
  try {
    await dispatch(logoutUser()).unwrap();
    setShowLogoutConfirm(false);
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 100);
  } catch (err) {
    console.error("Logout failed", err);
    setLogoutLoading(false);
  }
};

  const userAvatar = getUserAvatar();
  const userInitials = getUserInitials();
  const userName = getUserName();
  const userEmail = getUserEmail();

  // Check permissions for modules
  const hasAllPermissions = user?.permissions?.all === true;
  const userType = user?.type || "";

  const hasReadPermission = (slug) => {
    if (hasAllPermissions) return true;
    if (userType === "admin") return true;

    const modulePermission = user?.permissions?.[slug];
    if (modulePermission) {
      return modulePermission.read === true;
    }

    const publicModules = [
      "dashboard",
      "my-leaves",
      "my-tasks",
      "task-reports",
      "my-wfh-requests",
      "my-profile",
    ];
    if (publicModules.includes(slug)) return true;

    return false;
  };

  const showSettings = hasReadPermission("settings");

  // Format time for display
  const formatNotificationTime = (dateString) => {
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
    });
  };

  // Format notification type - remove underscores and capitalize
  const formatNotificationType = (type) => {
    if (!type) return "Notification";
    
    if (typeof type === 'string') {
      // Handle underscore separated types like "special_day"
      return type
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    return "Notification";
  };

  // Get notification type icon
  const getNotificationIcon = (notification) => {
    const type = notification.type || notification.data?.type || "";
    const lowerType = String(type).toLowerCase();
    
    if (lowerType.includes("probation")) {
      return "fa-clock text-orange-500";
    }
    if (lowerType.includes("leave")) {
      return "fa-calendar-check text-blue-500";
    }
    if (lowerType.includes("attendance")) {
      return "fa-fingerprint text-purple-500";
    }
    if (lowerType.includes("contract")) {
      return "fa-file-contract text-indigo-500";
    }
    if (lowerType.includes("task")) {
      return "fa-tasks text-green-500";
    }
    if (lowerType.includes("special_day") || lowerType.includes("birthday") || lowerType.includes("special")) {
      return "fa-gift text-rose-500";
    }
    if (lowerType.includes("document") || lowerType.includes("expiry") || lowerType.includes("employee_document")) {
      return "fa-file-alt text-orange-500";
    }
    if (lowerType.includes("wfh") || lowerType.includes("work from home")) {
      return "fa-home text-amber-500";
    }
    return "fa-bell text-gray-500";
  };

  // Get notification type color class
  const getNotificationTypeColor = (notification) => {
    const type = notification.type || notification.data?.type || "";
    const lowerType = String(type).toLowerCase();
    
    if (lowerType.includes("leave")) return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    if (lowerType.includes("attendance")) return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
    if (lowerType.includes("task")) return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
    if (lowerType.includes("document") || lowerType.includes("expiry") || lowerType.includes("employee_document")) return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
    if (lowerType.includes("probation")) return "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400";
    if (lowerType.includes("contract")) return "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400";
    if (lowerType.includes("special_day") || lowerType.includes("birthday") || lowerType.includes("special")) return "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400";
    if (lowerType.includes("wfh") || lowerType.includes("work from home")) return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
    
    return "bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400";
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 md:px-6 py-2 md:py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="md:hidden w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center"
              aria-label="Toggle menu"
            >
              <i className="fas fa-bars text-gray-600 dark:text-gray-300 text-lg"></i>
            </button>

            <div>
              <h1 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:block bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-full text-xs font-medium">
              <i className="far fa-calendar-alt mr-2"></i>
              <span>{currentDate}</span>
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative w-9 h-9 md:w-10 md:h-10 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <i className="fas fa-bell text-gray-600 dark:text-gray-300 text-sm md:text-base"></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-12 right-0 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-soft-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <i className="fas fa-bell text-green-500"></i>
                      Notifications
                      {unreadCount > 0 && (
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                          {unreadCount} unread
                        </span>
                      )}
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        disabled={markingAll}
                        className="text-xs text-green-500 hover:text-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {markingAll ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : null}
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {loading && notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                        <p>Loading notifications...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <i className="fas fa-bell-slash text-3xl mb-2 opacity-50"></i>
                        <p>All caught up!</p>
                        <p className="text-xs mt-1">No unread notifications</p>
                      </div>
                    ) : (
                      notifications.map((notification) => {
                        // Get the type from notification data
                        const type = notification.data?.type || notification.type || "";
                        const formattedType = formatNotificationType(type);
                        const typeColor = getNotificationTypeColor(notification);
                        const iconClass = getNotificationIcon(notification);
                        const message = notification.data?.message || notification.message || '';
                        
                        return (
                          <div
                            key={notification.id}
                            className={`p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                              !notification.read ? "bg-green-50 dark:bg-green-900/20" : ""
                            } ${markingId === notification.id ? "opacity-50" : ""}`}
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <div className="flex items-start gap-3">
                              {/* Notification icon */}
                              <div className="flex-shrink-0 mt-0.5">
                                <i className={`fas ${iconClass}`}></i>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColor}`}>
                                    {formattedType}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 leading-relaxed">
                                  {message}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <small className="text-xs text-gray-400">
                                    {formatNotificationTime(notification.created_at)}
                                  </small>
                                  {!notification.read && markingId !== notification.id && (
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 animate-pulse"></span>
                                  )}
                                  {markingId === notification.id && (
                                    <i className="fas fa-spinner fa-spin text-xs text-green-500"></i>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center bg-gray-50 dark:bg-gray-700/50">
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        navigate("/admin/notifications");
                      }}
                      className="text-xs text-green-500 hover:text-green-600 font-medium"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden shadow-md ring-2 ring-transparent hover:ring-green-500 transition-all"
              >
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-sm">
                    {userInitials}
                  </div>
                )}
              </button>

              {showProfile && (
                <div className="absolute top-12 right-0 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-soft-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                  <div className="p-4 flex gap-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-green-500 to-green-600 flex-shrink-0">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={userName}
                          className="w-full h-full object-cover"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                          {userInitials}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {userName}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {userEmail}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <p className="mb-1">
                        <span className="font-semibold">Role:</span>{" "}
                        {user?.type === "admin" ? "Administrator" : "Employee"}
                      </p>
                    </div>
                  </div>
                  {showSettings && (
                    <NavLink
                      to="/admin/settings"
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setShowProfile(false)}
                    >
                      <i className="fas fa-user text-green-500 w-5"></i>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Account Settings
                      </span>
                    </NavLink>
                  )}
                  <div>
                    <button
                      onClick={handleLogoutClick}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <i className="fas fa-arrow-right-from-bracket text-red-500 w-5"></i>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Sign out
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        title="Logout Confirmation"
        message={`Are you sure you want to logout, ${userName}? You will need to login again to access your account.`}
        confirmText="Logout"
        cancelText="Cancel"
        loading={logoutLoading}
      />
    </>
  );
};

export default Header;