// src/shared/components/Header.jsx

import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { useAppTheme } from '../../../context/ThemeContext';
import { logoutUser } from '../../../store/slices/authSlice';
import { 
  fetchUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../../admin/store/slices/notificationSlice";
import { showToast } from '../../../components/common/Toast';
import ConfirmModal from '../../../admin/components/common/ConfirmModal';

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────
// Format user type for display
const formatUserType = (type) => {
  if (!type) return 'User';
  
  const typeMap = {
    'employee': 'Employee',
    'admin': 'Admin',
    'hr': 'HR',
    'manager': 'Manager',
    'team_lead': 'Team Lead',
    'teamlead': 'Team Lead',
    'team lead': 'Team Lead',
  };
  
  const lowerType = type.toLowerCase().trim();
  return typeMap[lowerType] || type;
};

// Get dashboard title based on user role
const getDashboardTitle = (userType) => {
  if (!userType) return 'Employee Portal';
  
  const lowerType = userType.toLowerCase().trim();
  
  const titleMap = {
    'admin': 'Admin Dashboard',
    'hr': 'HR Dashboard',
    'manager': 'Manager Dashboard',
    'team_lead': 'Team Lead Dashboard',
    'teamlead': 'Team Lead Dashboard',
    'team lead': 'Team Lead Dashboard',
  };
  
  return titleMap[lowerType] || 'Employee Portal';
};

// Format notification type - remove underscores and capitalize
const formatNotificationType = (type) => {
  if (!type) return "Notification";
  
  if (typeof type === 'string') {
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

const Header = ({ onMenuClick }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { themeMode, setThemeMode } = useAppTheme();
  const { notifications, unreadCount, loading } = useAppSelector(
    (state) => state.notifications || { notifications: [], unreadCount: 0, loading: false }
  );
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Fetch unread notifications on mount
  useEffect(() => {
    dispatch(fetchUnreadNotifications());
  }, [dispatch]);

  // Refresh unread notifications when dropdown is opened
  useEffect(() => {
    if (showNotifications) {
      dispatch(fetchUnreadNotifications());
    }
  }, [showNotifications, dispatch]);

  // Update date and time
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }));
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get user name and role
  const getUserName = () => {
    if (user?.employee?.name) return user.employee.name;
    if (user?.name) return user.name;
    if (user?.username) return user.username;
    return 'User';
  };

  const getUserEmail = () => {
    if (user?.email) return user.email;
    if (user?.username) return user.username;
    return '';
  };

  // Get raw user role from API
  const rawUserRole = user?.type || user?.role || 'employee';
  const userRole = formatUserType(rawUserRole);
  const dashboardTitle = getDashboardTitle(rawUserRole);
  
  const displayName = getUserName();
  const userEmail = getUserEmail();

  // Get user avatar
  const getUserAvatar = () => {
    if (avatarError) return null;
    
    const avatar = user?.avatar || user?.employee?.avatar;
    if (!avatar) return null;
    
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
    
    if (typeof avatar === 'object' && avatar.path) {
      return `${baseUrl}/storage/${avatar.path}`;
    }
    
    if (typeof avatar === 'string') {
      if (avatar.startsWith('http')) return avatar;
      if (avatar.startsWith('/storage/')) return `${baseUrl}${avatar}`;
      if (avatar.startsWith('storage/')) return `${baseUrl}/${avatar}`;
      return `${baseUrl}/storage/${avatar}`;
    }
    
    return null;
  };

  const userAvatar = getUserAvatar();
  const userInitials = displayName?.charAt(0)?.toUpperCase() || "U";

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
    setShowProfileMenu(false);
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

  // Get the base path for navigation
  const getBasePath = () => {
    const rawType = user?.type || user?.role || 'employee';
    return rawType === 'admin' || rawType === 'hr' ? '/admin' : '/employee';
  };

  // Check permissions for modules
  const hasAllPermissions = user?.permissions?.all === true;
  const userType = user?.type || "";

  const hasReadPermission = (slug) => {
    if (hasAllPermissions) return true;
    if (userType === 'admin') return true;
    
    const modulePermission = user?.permissions?.[slug];
    if (modulePermission) {
      return modulePermission.read === true;
    }
    
    const publicModules = ["dashboard", "my-leaves", "my-tasks", "task-reports", "my-wfh-requests", "my-profile"];
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

  // Get notification type icon with better detection
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
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-3 px-4 md:px-6 sticky top-0 z-40 flex items-center justify-between flex-wrap gap-3 shadow-sm">
        {/* Left section - Menu button (mobile) and title */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
          
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">
              {dashboardTitle}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Welcome back, {displayName}
            </p>
          </div>
        </div>
        
        {/* Right section - Date, Time, Theme toggle, Notifications, Profile */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date and Time */}
          <div className="hidden md:flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-4 py-1.5 rounded-full">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
              <i className="far fa-calendar-alt text-green-500"></i>
              <span>{currentDate}</span>
            </div>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
              <i className="far fa-clock text-green-500"></i>
              <span>{currentTime}</span>
            </div>
          </div>
          
          {/* Theme toggle */}
          <div className="theme-toggle flex bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setThemeMode('light')}
              className={`theme-btn w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                themeMode === 'light' 
                  ? 'bg-white dark:bg-gray-600 shadow-md text-green-500' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Light Mode"
            >
              <i className="fas fa-sun"></i>
            </button>
            <button
              onClick={() => setThemeMode('dark')}
              className={`theme-btn w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                themeMode === 'dark' 
                  ? 'bg-white dark:bg-gray-600 shadow-md text-green-500' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Dark Mode"
            >
              <i className="fas fa-moon"></i>
            </button>
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
                  <Link
                    to={`${getBasePath()}/notifications`}
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-green-500 hover:text-green-600 font-medium"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          {/* Profile Avatar */}
          <div className="relative" ref={profileRef}>
            <div 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 rounded-xl overflow-hidden cursor-pointer ring-2 ring-transparent hover:ring-green-500 transition-all duration-200 shadow-md"
            >
              {userAvatar ? (
                <img 
                  src={userAvatar} 
                  alt={displayName} 
                  className="w-full h-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-sm">
                  {userInitials}
                </div>
              )}
            </div>
            
            {showProfileMenu && (
              <div className="absolute top-[55px] right-0 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[9999]">
                <div className="profile-header flex gap-3 p-4 items-center border-b border-gray-200 dark:border-gray-700">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-r from-green-500 to-green-600 flex-shrink-0">
                    {userAvatar ? (
                      <img 
                        src={userAvatar} 
                        alt={displayName} 
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
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {displayName}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {userEmail}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 capitalize">
                      {userRole}
                    </p>
                  </div>
                </div>
                <Link 
                  to={`${getBasePath()}/profile`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 no-underline transition-colors"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <i className="fas fa-user text-green-500 w-5"></i> 
                  <span>My Profile</span>
                </Link>
                {showSettings && (
                  <Link 
                    to={`${getBasePath()}/settings`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 no-underline transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <i className="fas fa-cog text-gray-500 w-5"></i> 
                    <span>Settings</span>
                  </Link>
                )}
                <button 
                  onClick={handleLogoutClick}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 w-full text-left transition-colors border-t border-gray-200 dark:border-gray-700"
                >
                  <i className="fas fa-arrow-right-from-bracket text-red-500 w-5"></i> 
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        title="Logout Confirmation"
        message={`Are you sure you want to logout, ${displayName}? You will need to login again to access your account.`}
        confirmText="Logout"
        cancelText="Cancel"
        loading={logoutLoading}
      />
    </>
  );
};

export default Header;