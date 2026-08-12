import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  punchIn,
  punchOut,
  fetchDashboardData,
} from "../store/slices/attendanceSlice";
import { fetchMyProjects } from "../store/slices/employeeProjectSlice";
import { fetchEmployees } from "../../admin/store/slices/employeeSlice";
import { fetchProjects } from "../../admin/store/slices/projectSlice";
import {
  fetchDashboard,
  fetchMonthlyHoursByProject,
  clearMonthlyHours,
} from "../../admin/store/slices/dashboardSlice";
import { fetchAssignments } from "../../admin/store/slices/projectAssignmentSlice";
import PunchOutModal from "../components/modals/PunchOutModal";
import MapView from "../components/common/MapView";
import LocationModal from "../components/modals/LocationModal";
import ErrorToast from "../../components/common/ErrorToast";
import useErrorHandler from "../../hooks/useErrorHandler";

// Admin Dashboard Components
import { StatsCard } from "../../admin/components/dashboard/StatsCard";
import { ProjectAllocationChart } from "../../admin/components/dashboard/ProjectAllocationChart";
import { ProjectHoursChart } from "../../admin/components/dashboard/ProjectHoursChart";
import { WeeklyAttendanceChart } from "../../admin/components/dashboard/WeeklyAttendanceChart";
import { TodayStatusChart } from "../../admin/components/dashboard/TodayStatsChart";
import { AvgPunchTimeCard } from "../../admin/components/dashboard/AvgPunchTimeCrd";
import { RecentPunchesList } from "../../admin/components/dashboard/RecentPunchesList";
import { PunchDistributionChart } from "../../admin/components/dashboard/PunchDistributionChart";
import { ProjectHoursModal } from "../../admin/components/dashboard/ProjectHoursModal";
import { showToast } from "../../components/common/Toast";

// ─── COLOR PALETTE ──────────────────────────────────────────────────────
export const COLORS = {
  blue: "#2a78d6",
  aqua: "#1baf7a",
  yellow: "#eda100",
  violet: "#4a3aa7",
  red: "#e34948",
  green: "#008300",
  orange: "#f97316",
  purple: "#8b5cf6",
  pink: "#ec4899",
  cyan: "#06b6d4",
};

export const STATUS_COLORS = {
  "On time": "#2a78d6",
  Late: "#eda100",
  Absent: "#e34948",
  WFH: "#1baf7a",
  Leave: "#4a3aa7",
};

export const CHART_COLORS = [
  "#2a78d6",
  "#1baf7a",
  "#eda100",
  "#e34948",
  "#4a3aa7",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#14b8a6",
];

// ─── HELPERS ──────────────────────────────────────────────────────────────
const formatTime = (minutes) => {
  if (!minutes || minutes === 0) return "0h";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const getStatusBadge = (status) => {
  const statusMap = {
    on_time: { label: "On time", className: "badge-success" },
    "on-time": { label: "On time", className: "badge-success" },
    ontime: { label: "On time", className: "badge-success" },
    late: { label: "Late", className: "badge-warn" },
    absent: { label: "Absent", className: "badge-danger" },
    wfh: { label: "WFH", className: "badge-blue" },
    leave: { label: "Leave", className: "badge-violet" },
  };
  return statusMap[status] || { label: status, className: "badge-gray" };
};

export const formatDateDisplay = (dateString) => {
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

// Helper function to get avatar URL
const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;

  if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
    return avatarPath;
  }

  const baseUrl =
    import.meta.env.VITE_API_URL?.replace("/api", "") || window.location.origin;

  if (avatarPath.startsWith("avatars/")) {
    return `${baseUrl}/storage/${avatarPath}`;
  }
  if (avatarPath.startsWith("storage/")) {
    return `${baseUrl}/${avatarPath}`;
  }
  if (avatarPath.startsWith("/storage/")) {
    return `${baseUrl}${avatarPath}`;
  }

  return `${baseUrl}/storage/${avatarPath}`;
};

// Helper to get leave status color
const getLeaveStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    case "approved":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
    case "rejected":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
  }
};

// Helper to get leave type icon
const getLeaveTypeIcon = (type) => {
  const typeMap = {
    "sick leave": "fa-notes-medical",
    "annual leave": "fa-umbrella-beach",
    "casual leave": "fa-smile",
    "maternity leave": "fa-baby",
    "paternity leave": "fa-child",
    "unpaid leave": "fa-money-bill-wave",
    "public holiday": "fa-calendar-day",
    "work from home": "fa-home",
  };
  return typeMap[type?.toLowerCase()] || "fa-calendar-alt";
};

// ─── THEME AWARE GRADIENT ──────────────────────────────────────────────
const getWelcomeBannerGradient = (isDark) => {
  if (isDark) {
    return "bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950 border border-gray-700";
  }
  return "bg-gradient-to-br from-green-600 to-green-500";
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { loading: attendanceLoading, dashboardData } = useSelector(
    (state) => state.EmpAttendance,
  );
  const {
    projects: employeeProjects,
    stats,
    loading: projectsLoading,
  } = useSelector(
    (state) =>
      state.employeeProjects || { projects: [], stats: {}, loading: false },
  );

  // Admin dashboard data
  const { employees } = useSelector((state) => state.employees || {});
  const {
    stats: adminStats,
    charts,
    loading: adminLoading,
  } = useSelector(
    (state) => state.dashboard || { stats: {}, charts: {}, loading: false },
  );
  const { projects: allProjects, loading: allProjectsLoading } = useSelector(
    (state) => state.projects || { projects: [], loading: false },
  );
  const { assignments } = useSelector(
    (state) => state.projectAssignments || { assignments: [], loading: false },
  );

  // Use custom error handler
  const { error, handleError, clearError, withErrorHandling } =
    useErrorHandler();

  // Check if user is HR or HR Manager
  const isHR =
    user?.role?.name === "HR Manager" ||
    user?.role?.name === "HR" ||
    user?.type === "hr";
  const isAdmin = user?.type === "admin";

  // Show admin graphs if user is HR or Admin
  const showAdminGraphs = isHR || isAdmin;

  // Use dashboard data as source of truth (not Redux isPunchedIn)
  const todayAttendance = dashboardData?.today_attendance || {};
  const isActuallyPunchedIn =
    todayAttendance.punched_in === true && todayAttendance.punched_out !== true;
  const punchInTimeFromApi = todayAttendance.punch_in_time;
  const canPunch = dashboardData?.can_punch ?? true;

  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [showPunchOutModal, setShowPunchOutModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [punchType, setPunchType] = useState("punch-in");
  const [punchOutData, setPunchOutData] = useState(null);
  const [showLocationHistory, setShowLocationHistory] = useState(false);
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);

  const [showPendingErrorModal, setShowPendingErrorModal] = useState(false);
  const [pendingPunchOutDate, setPendingPunchOutDate] = useState("");
  const [showBlockedErrorModal, setShowBlockedErrorModal] = useState(false);
  const [blockedErrorMessage, setBlockedErrorMessage] = useState("");

  // Admin graphs states
  const [showProjectHoursModal, setShowProjectHoursModal] = useState(false);
  const [selectedProjectForModal, setSelectedProjectForModal] = useState(null);
  const [modalMonth, setModalMonth] = useState(new Date().getMonth() + 1);
  const [modalYear, setModalYear] = useState(new Date().getFullYear());

  // Theme state - check if dark mode is active
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    // Observe changes to dark mode class
    const observer = new MutationObserver(() => {
      checkDarkMode();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Show toast notification
  const showToastMessage = (message, type = "success", title = "") => {
    setToast({ message, type, title });
    setTimeout(() => setToast(null), 5000);
  };

  // Get employee avatar URL
  const employeeAvatar = dashboardData?.employee?.avatar
    ? getAvatarUrl(dashboardData.employee.avatar)
    : null;

  // Get employee name
  const getEmployeeName = () => {
    if (dashboardData?.employee) {
      return `${dashboardData.employee.first_name} ${dashboardData.employee.last_name}`;
    }
    return user?.name || "User";
  };

  const getEmployeeRole = () => {
    if (dashboardData?.employee) {
      return `Employee ID: ${dashboardData.employee.employee_id}`;
    }
    return user?.role?.name || user?.role || "Employee";
  };

  // Fetch dashboard data and projects on component mount
  useEffect(() => {
    const fetchData = async () => {
      await withErrorHandling(
        async () => {
          await dispatch(fetchDashboardData()).unwrap();
        },
        {
          onLogin: () => (window.location.href = "/login"),
        },
      );
    };
    fetchData();
  }, [dispatch]);

  // Fetch admin dashboard data if user is HR
  useEffect(() => {
    if (showAdminGraphs) {
      dispatch(fetchDashboard());
      dispatch(fetchProjects());
      dispatch(fetchAssignments());
      dispatch(fetchEmployees());
    }
  }, [dispatch, showAdminGraphs]);

  // Separate useEffect to fetch projects when dashboard data loads
  useEffect(() => {
    if (dashboardData?.employee?.id) {
      dispatch(fetchMyProjects(dashboardData.employee.id));
    }
  }, [dashboardData]);

  // Update date and time
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      );
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Punch In/Out
  const handlePunch = async () => {
    if (!isActuallyPunchedIn) {
      if (!canPunch) {
        showToastMessage(
          "You cannot punch in at this time",
          "error",
          "Outside Working Hours",
        );
        return;
      }
      setPunchType("punch-in");
      setShowLocationModal(true);
    } else {
      setPunchType("punch-out");
      setShowPunchOutModal(true);
    }
  };

  // Handle location confirmation
  // In Dashboard.jsx, update the handleLocationConfirm function

  const handleLocationConfirm = async (locationData) => {
    setShowLocationModal(false);
    setIsSubmitting(true);

    if (punchType === "punch-in") {
      try {
        await withErrorHandling(
          async () => {
            const result = await dispatch(
              punchIn({ location: locationData }),
            ).unwrap();
            showToastMessage("Punched in successfully!", "success", "Success");
            await dispatch(fetchDashboardData()).unwrap();
            return result;
          },
          {
            // Custom error handler for punch-in specific errors
            onError: (err) => {
              // Extract error message from various formats
              let errorMsg = "";
              if (typeof err === "string") {
                errorMsg = err;
              } else if (err?.payload?.message) {
                errorMsg = err.payload.message;
              } else if (err?.message) {
                errorMsg = err.message;
              } else if (err?.response?.data?.message) {
                errorMsg = err.response.data.message;
              } else {
                errorMsg = String(err);
              }

              // Check for pending punch-out error
              if (
                errorMsg.includes("pending punch-out") ||
                errorMsg.includes("punch out for that day") ||
                errorMsg.includes("Please punch out first")
              ) {
                clearError();
                const match = errorMsg.match(/for (\d{4}-\d{2}-\d{2})/);
                const date = match ? match[1] : "that day";
                setPendingPunchOutDate(date);
                setShowPendingErrorModal(true);
                return true; // Indicates error was handled
              }

              // Check for late punch-in with HR approval
              if (
                errorMsg.includes("Punch-in blocked") ||
                errorMsg.includes("pending HR approval") ||
                errorMsg.includes("late check-in request")
              ) {
                // This will be displayed by the ErrorToast
                // Return false to let the error handler show the toast
                return false;
              }

              return false; // Let the error handler show the toast
            },
          },
        );
      } catch (err) {
        // Error is already handled by withErrorHandling
        console.error("Punch in error:", err);
      }
    } else if (punchOutData) {
      const isPastDatePunchOut = punchType === "punch-out-then-punchin";
      await withErrorHandling(async () => {
        const result = await dispatch(
          punchOut({
            ...punchOutData,
            location: locationData,
          }),
        ).unwrap();
        showToastMessage(
          isPastDatePunchOut
            ? `Punched out for ${pendingPunchOutDate}! Now punch in for today.`
            : "Punched out successfully!",
          "success",
          "Success",
        );
        setShowPunchOutModal(false);
        setPunchOutData(null);
        await dispatch(fetchDashboardData()).unwrap();

        if (isPastDatePunchOut) {
          setPendingPunchOutDate("");
          setPunchType("punch-in");
          setTimeout(() => setShowLocationModal(true), 800);
        } else {
          setPendingPunchOutDate("");
        }
        return result;
      });
    }

    setIsSubmitting(false);
  };

  const handlePunchOutSubmit = async (data) => {
    setPunchOutData({
      ...data,
      punch_out_time: data.punch_out_time || null,
    });
    setShowPunchOutModal(false);
    setPunchType(pendingPunchOutDate ? "punch-out-then-punchin" : "punch-out");
    setShowLocationModal(true);
  };

  const formatPunchTime = (time) => {
    if (!time) return "00:00";
    try {
      let date;
      if (typeof time === "string" && time.match(/^\d{2}:\d{2}:\d{2}$/)) {
        const now = new Date();
        const [hours, minutes, seconds] = time.split(":");
        date = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          parseInt(hours),
          parseInt(minutes),
          parseInt(seconds),
        );
      } else if (typeof time === "string" && time.includes("T")) {
        date = new Date(time);
      } else if (time instanceof Date) {
        date = time;
      } else {
        date = new Date(time);
      }

      if (isNaN(date.getTime())) return time;
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return time;
    }
  };

  const isButtonDisabled = () => {
    if (attendanceLoading || isSubmitting) return true;
    if (!isActuallyPunchedIn && !canPunch) return true;
    return false;
  };

  const getButtonText = () => {
    if (attendanceLoading || isSubmitting) return "Processing...";
    return isActuallyPunchedIn ? "Punch Out" : "Punch In";
  };

  const getStatusDisplay = () => {
    if (isActuallyPunchedIn) {
      return { text: "Punched In ✓", color: "text-green-500" };
    }
    if (todayAttendance.punched_out === true) {
      return { text: "Punched Out ✓", color: "text-blue-500" };
    }
    return { text: "Not Punched In", color: "text-red-500" };
  };

  const statusDisplay = getStatusDisplay();
  const displayPunchTime = punchInTimeFromApi || todayAttendance.punch_in_time;

  // Get priority badge color
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "on hold":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  // Helper function to normalize location data from different formats
  const normalizeLocation = (locationData) => {
    if (!locationData) return null;

    if (locationData.latitude && locationData.longitude) {
      return {
        latitude: parseFloat(locationData.latitude),
        longitude: parseFloat(locationData.longitude),
        address:
          locationData.address ||
          `${locationData.latitude}, ${locationData.longitude}`,
      };
    }

    if (locationData.punch_in_latitude || locationData.latitude) {
      return {
        latitude: parseFloat(
          locationData.punch_in_latitude || locationData.latitude,
        ),
        longitude: parseFloat(
          locationData.punch_in_longitude || locationData.longitude,
        ),
        address:
          locationData.punch_in_address ||
          locationData.address ||
          "Location recorded",
      };
    }

    return null;
  };

  // Admin graphs handlers
  const handleNavigate = (route) => {
    const basePath = "/employee";
    navigate(`${basePath}${route}`);
  };

  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const projectData = data.activePayload[0].payload;
      const projectName =
        projectData.fullName || projectData.name || projectData.displayName;
      const matchedProject = allProjects.find((p) => p.name === projectName);
      const projectId =
        matchedProject?.id || projectData.id || projectData.projectId;

      if (projectId) {
        setSelectedProjectForModal({
          id: projectId,
          name: projectName,
          projectId: projectId,
        });
        setModalMonth(new Date().getMonth() + 1);
        setModalYear(new Date().getFullYear());
        setShowProjectHoursModal(true);
      } else {
        showToast("Project ID not found", "error");
      }
    }
  };

  // Admin dashboard calculations
  const totalEmployees = employees?.length || 0;
  const activeProjects = allProjects.filter(
    (p) => p.status === "Active",
  ).length;
  const totalAssignments = assignments.length;
  const totalTaggedEmployees = assignments.reduce(
    (sum, a) => sum + (a.projectIds?.length || 0),
    0,
  );

  const onTimeCount = charts?.today_status?.["On time"] || 0;
  const lateCount = charts?.today_status?.Late || 0;
  const absentCount = charts?.today_status?.Absent || 0;
  const totalPresent = onTimeCount + lateCount;
  const attendanceRate =
    totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0;

  const todayStatus = charts?.today_status || {};
  const punchedInToday =
    Object.values(todayStatus).reduce((a, b) => a + b, 0) ||
    adminStats?.today?.punched_in ||
    0;
  const lateArrivals = todayStatus.Late || adminStats?.today?.late || 0;
  const absentToday = todayStatus.Absent || adminStats?.today?.absent || 0;

  const projectStats = charts?.project_stats || {};
  const totalProjects = projectStats.total_projects || allProjects.length;
  const activeProjectsCount = projectStats.active_projects || activeProjects;
  const totalAssignmentsCount =
    projectStats.total_assignments || totalAssignments;
  const employeesAssigned =
    projectStats.employees_assigned || totalTaggedEmployees;

  const allocationData = charts?.project_allocation || [];
  const hoursData = charts?.project_hours || [];

  // Leave data from dashboard
  const recentLeaves = dashboardData?.recent_leaves || [];
  const leaveStats = dashboardData?.leave_stats || {};

  // ─── NEW COMPACT STATS CARDS ──────────────────────────────────────────

  // Leave Stats Card - matches image style
  const LeaveStatsCard = () => (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <i className="fas fa-calendar-alt text-green-500"></i>
          Leave Status
        </h3>
        {recentLeaves.length > 0 && (
          <button
            onClick={() => navigate("/employee/leaves")}
            className="text-xs text-green-500 hover:text-green-600 font-medium"
          >
            View All
          </button>
        )}
      </div>

      {/* Stats Row - Three columns like the image */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {leaveStats.allocated || 0}
          </div>
          <div className="text-xs text-blue-600/80 dark:text-blue-400/80 font-medium mt-0.5">
            Allocated
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center border border-orange-200 dark:border-orange-800">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {leaveStats.total_taken || 0}
          </div>
          <div className="text-xs text-orange-600/80 dark:text-orange-400/80 font-medium mt-0.5">
            Taken
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {leaveStats.balance || 0}
          </div>
          <div className="text-xs text-green-600/80 dark:text-green-400/80 font-medium mt-0.5">
            Balance
          </div>
        </div>
      </div>

      {/* Recent Leave Requests - Optional, shown when there are pending requests */}
      {recentLeaves.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--muted)] mb-2">
            Recent Requests
          </div>
          <div className="space-y-1.5">
            {recentLeaves.slice(0, 2).map((leave, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs p-2 bg-[var(--surface2)] rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getLeaveStatusColor(leave.status)}`}
                  >
                    {leave.status || "Pending"}
                  </span>
                  <span className="text-[var(--text)] truncate max-w-[100px]">
                    {leave.leave_type?.name || leave.type || "Leave"}
                  </span>
                </div>
                <span className="text-[var(--muted)] text-[10px]">
                  {formatDateDisplay(leave.start_date || leave.from_date)}
                </span>
              </div>
            ))}
          </div>
          {recentLeaves.length > 2 && (
            <button
              onClick={() => navigate("/employee/leaves")}
              className="text-xs text-green-500 hover:text-green-600 font-medium mt-1.5 block"
            >
              + {recentLeaves.length - 2} more
            </button>
          )}
        </div>
      )}

      {/* No recent leaves message - matches image style */}
      {recentLeaves.length === 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--text-secondary)] text-center">
            No recent leave requests
          </div>
          <button
            onClick={() => navigate("/employee/request-leave")}
            className="text-xs text-green-500 hover:text-green-600 font-medium mt-1.5 block text-center w-full"
          >
            + Request
          </button>
        </div>
      )}
    </div>
  );

  // Projects Stats Card - matches image style
  const ProjectsStatsCard = () => (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <i className="fas fa-project-diagram text-blue-500"></i>
          Project Status
        </h3>
        {employeeProjects.length > 0 && (
          <button
            onClick={() => navigate("/employee/projects")}
            className="text-xs text-blue-500 hover:text-blue-600 font-medium"
          >
            View All
          </button>
        )}
      </div>

      {/* Stats Row - Two columns like the image */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center border border-purple-200 dark:border-purple-800">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {stats.totalProjects || employeeProjects.length || 0}
          </div>
          <div className="text-xs text-purple-600/80 dark:text-purple-400/80 font-medium mt-0.5">
            Total Projects
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center border border-green-200 dark:border-green-800">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.activeProjects ||
              employeeProjects.filter((p) => p.status === "Active").length ||
              0}
          </div>
          <div className="text-xs text-green-600/80 dark:text-green-400/80 font-medium mt-0.5">
            Active Projects
          </div>
        </div>
      </div>

      {/* Project list preview - shown when there are projects */}
      {employeeProjects.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div className="space-y-1.5">
            {employeeProjects.slice(0, 2).map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between text-xs p-2 bg-[var(--surface2)] rounded-lg cursor-pointer hover:bg-[var(--surface3)] transition-colors"
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      project.status === "Active"
                        ? "bg-green-500"
                        : project.status === "Completed"
                          ? "bg-blue-500"
                          : "bg-gray-400"
                    }`}
                  ></span>
                  <span className="text-[var(--text)] truncate max-w-[120px]">
                    {project.name}
                  </span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getPriorityColor(project.priority)}`}
                >
                  {project.priority || "Medium"}
                </span>
              </div>
            ))}
          </div>
          {employeeProjects.length > 2 && (
            <button
              onClick={() => navigate("/employee/projects")}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium mt-1.5 block"
            >
              + {employeeProjects.length - 2} more projects
            </button>
          )}
        </div>
      )}

      {/* No projects message */}
      {employeeProjects.length === 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--text-secondary)] text-center">
            No projects assigned yet
          </div>
        </div>
      )}
    </div>
  );

  // Render location info - compact
  const renderLocationInfo = () => {
    const punchInLocation = normalizeLocation(
      todayAttendance.punch_in_location,
    );
    const punchOutLocation = normalizeLocation(
      todayAttendance.punch_out_location,
    );

    if (!punchInLocation && !punchOutLocation) return null;

    const handleShowMap = (location) => {
      setSelectedMapLocation(location);
      setShowLocationHistory(true);
    };

    return (
      <div className="location-info bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <i className="fas fa-map-marker-alt text-green-500"></i>
            Locations
          </h3>
          {punchInLocation && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-500 font-medium">IN:</span>
              <span className="text-[var(--muted)] truncate max-w-[200px]">
                {punchInLocation.address?.substring(0, 30) || "📍"}
              </span>
              <button
                onClick={() => handleShowMap(punchInLocation)}
                className="text-blue-500 hover:text-blue-600 text-xs"
              >
                <i className="fas fa-map"></i>
              </button>
            </div>
          )}
          {punchOutLocation && punchOutLocation.latitude && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-red-500 font-medium">OUT:</span>
              <span className="text-[var(--muted)] truncate max-w-[200px]">
                {punchOutLocation.address?.substring(0, 30) || "📍"}
              </span>
              <button
                onClick={() => handleShowMap(punchOutLocation)}
                className="text-blue-500 hover:text-blue-600 text-xs"
              >
                <i className="fas fa-map"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render map modal
  const renderMapModal = () => {
    if (!showLocationHistory || !selectedMapLocation) return null;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--surface)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold">
              <i className="fas fa-map-marker-alt text-green-500 mr-2"></i>
              Location Map
            </h3>
            <button
              onClick={() => {
                setShowLocationHistory(false);
                setSelectedMapLocation(null);
              }}
              className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          <div className="p-4">
            <p className="text-sm text-[var(--text)] mb-3">
              {selectedMapLocation.address ||
                `${selectedMapLocation.latitude}, ${selectedMapLocation.longitude}`}
            </p>
            <MapView
              latitude={parseFloat(selectedMapLocation.latitude)}
              longitude={parseFloat(selectedMapLocation.longitude)}
              address={selectedMapLocation.address}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowLocationHistory(false);
                  setSelectedMapLocation(null);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 px-4 md:px-6 lg:px-8 pb-8">
      {/* Welcome Banner - Compact */}
      <div
        className={`welcome-banner rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-3 shadow-lg ${getWelcomeBannerGradient(isDarkMode)}`}
      >
        <div className="welcome-left flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-lg bg-white flex items-center justify-center flex-shrink-0">
            {employeeAvatar ? (
              <img
                src={employeeAvatar}
                alt={getEmployeeName()}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.parentElement.innerHTML = `<i class="fas fa-user text-green-600 text-2xl"></i>`;
                }}
              />
            ) : (
              <i className="fas fa-user text-green-600 text-2xl"></i>
            )}
          </div>
          <div className="welcome-text">
            <h2
              className={`text-base md:text-lg font-bold ${isDarkMode ? "text-white" : "text-white"}`}
            >
              Welcome, {getEmployeeName()}! 👋
            </h2>
            <p
              className={`${isDarkMode ? "text-gray-300" : "text-white/90"} text-xs`}
            >
              {getEmployeeRole()}
            </p>
          </div>
        </div>
        <div className="datetime-info text-center md:text-right">
          <div
            className={`text-xl md:text-2xl font-bold ${isDarkMode ? "text-white" : "text-white"}`}
          >
            {currentTime}
          </div>
          <div
            className={`text-xs ${isDarkMode ? "text-gray-400" : "text-white/80"}`}
          >
            {currentDate}
          </div>
        </div>
      </div>

      {/* Location Info */}
      {renderLocationInfo()}

      {/* Punch Card - Compact */}
      <div className="punch-card bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col md:flex-row justify-between items-center gap-3 mb-4">
        <div className="punch-stats flex gap-6 md:gap-8 flex-wrap justify-center">
          <div className="punch-item text-center">
            <div className="punch-label text-[10px] text-[var(--muted)]">
              Date
            </div>
            <div className="punch-value text-sm font-semibold text-[var(--text)]">
              {currentDate.split(",")[0]}
            </div>
          </div>
          <div className="punch-item text-center">
            <div className="punch-label text-[10px] text-[var(--muted)]">
              Punch In
            </div>
            <div
              className={`punch-value text-xl font-bold ${isActuallyPunchedIn ? "text-green-500" : "text-[var(--text)]"}`}
            >
              {formatPunchTime(displayPunchTime)}
            </div>
          </div>
          <div className="punch-item text-center">
            <div className="punch-label text-[10px] text-[var(--muted)]">
              Status
            </div>
            <div
              className={`punch-value text-base font-bold ${statusDisplay.color}`}
            >
              {statusDisplay.text}
              {isActuallyPunchedIn && (
                <span className="ml-1.5 text-xs animate-pulse">●</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={handlePunch}
          disabled={isButtonDisabled()}
          className={`punch-btn border-none text-white py-2 px-6 rounded-full font-semibold text-sm cursor-pointer transition-all flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${isActuallyPunchedIn ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
        >
          <i className="fas fa-fingerprint"></i>
          {getButtonText()}
        </button>
      </div>

      {/* ─── LEAVE & PROJECTS STATS CARDS ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <LeaveStatsCard />
        <ProjectsStatsCard />
      </div>

      {/* ─── ADMIN/HR GRAPHS ──────────────────────────────────────────────── */}
      {showAdminGraphs && (
        <>
          {/* ─── ROW 1: Overview (4 columns) ────────────────────── */}
          <div className="section-label text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-2 mb-2">
            Overview
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatsCard
              title="Total Employees"
              value={totalEmployees}
              icon="fas fa-users"
              color="green"
              route="/employees"
              onClick={() => handleNavigate("/employees")}
            />
            <StatsCard
              title="Punched In"
              value={punchedInToday}
              icon="fas fa-fingerprint"
              color="blue"
              route="/attendance"
              onClick={() => handleNavigate("/attendance")}
            />
            <StatsCard
              title="Late"
              value={lateArrivals}
              icon="fas fa-clock"
              color="amber"
              route="/attendance"
              onClick={() => handleNavigate("/attendance")}
            />
            <StatsCard
              title="Absent"
              value={absentToday}
              icon="fas fa-user-slash"
              color="red"
              route="/attendance"
              onClick={() => handleNavigate("/attendance")}
            />
          </div>

          {/* ─── ROW 2: Projects Stats (4 columns) ───────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <StatsCard
              title="Total Projects"
              value={totalProjects}
              icon="fas fa-project-diagram"
              color="purple"
              route="/projects"
              onClick={() => handleNavigate("/projects")}
            />
            <StatsCard
              title="Active"
              value={activeProjectsCount}
              icon="fas fa-play-circle"
              color="green"
              route="/projects"
              onClick={() => handleNavigate("/projects")}
            />
            <StatsCard
              title="Assignments"
              value={totalAssignmentsCount}
              icon="fas fa-link"
              color="orange"
              route="/project-assignments"
              onClick={() => handleNavigate("/project-assignments")}
            />
            <StatsCard
              title="Assigned"
              value={employeesAssigned}
              icon="fas fa-user-check"
              color="blue"
              route="/project-assignments"
              onClick={() => handleNavigate("/project-assignments")}
            />
          </div>

          {/* ─── ROW 3: Project Charts ────────────────────────────────────────── */}
          <div className="section-label text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-4 mb-2">
            Project Overview
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 min-h-[220px]">
              <ProjectAllocationChart data={allocationData} />
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 min-h-[220px]">
              <ProjectHoursChart data={hoursData} onBarClick={handleBarClick} />
            </div>
          </div>

          {/* ─── ROW 4: Attendance Analytics ──────────────────────────────────── */}
          <div className="section-label text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-4 mb-2">
            Attendance Analytics
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 min-h-[200px]">
              <WeeklyAttendanceChart data={charts?.weekly_attendance} />
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 min-h-[200px]">
              <TodayStatusChart data={charts?.today_status} />
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 min-h-[200px]">
              <AvgPunchTimeCard data={charts?.avg_punch_time} />
            </div>
          </div>

          {/* ─── ROW 5: Punch Activity ────────────────────────────────────────── */}
          <div className="section-label text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-4 mb-2">
            Today's Activity
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 min-h-[200px]">
              <RecentPunchesList
                punches={charts?.recent_punches || []}
                employees={employees}
                compact
              />
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 min-h-[200px]">
              <PunchDistributionChart data={charts?.punch_distribution || []} />
            </div>
          </div>

          {/* ─── PROJECT HOURS DETAIL MODAL ───────────────────────────────── */}
          <ProjectHoursModal
            isOpen={showProjectHoursModal}
            onClose={() => {
              setShowProjectHoursModal(false);
              setSelectedProjectForModal(null);
              dispatch(clearMonthlyHours());
            }}
            project={selectedProjectForModal}
            month={modalMonth}
            year={modalYear}
            employees={employees}
          />
        </>
      )}

      {/* ─── EMPLOYEE PROJECTS SECTION ──────────────────────────────────── */}
      {!showAdminGraphs && employeeProjects.length > 0 && (
        <div className="projects-section bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <i className="fas fa-project-diagram text-green-500"></i>
              My Projects
              <span className="text-xs text-[var(--muted)] font-normal">
                ({employeeProjects.length})
              </span>
            </h3>
            <button
              onClick={() => navigate("/employee/projects")}
              className="text-xs text-green-500 hover:text-green-600 font-medium"
            >
              View All
            </button>
          </div>

          {projectsLoading ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {employeeProjects.slice(0, 4).map((project) => (
                <div
                  key={project.id}
                  className="project-card bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-3 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <h4 className="font-semibold text-[var(--text)] text-sm truncate max-w-[120px]">
                      {project.name}
                    </h4>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getPriorityColor(project.priority)}`}
                    >
                      {project.priority || "Med"}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-1">
                    {project.description || "No description"}
                  </p>

                  <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                    <i className="fas fa-user-tie text-green-500"></i>
                    <span className="truncate">
                      {project.managerName || "N/A"}
                    </span>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-[var(--border)] flex justify-between items-center">
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(project.status)}`}
                    >
                      {project.status || "Active"}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">
                      {project.assignedDate?.split("-")[0] || ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {employeeProjects.length > 4 && (
            <div className="text-center mt-2">
              <button
                onClick={() => navigate("/employee/projects")}
                className="text-xs text-green-500 hover:text-green-600 font-medium"
              >
                + {employeeProjects.length - 4} more projects
              </button>
            </div>
          )}
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--text)]">
                <i className="fas fa-project-diagram text-green-500 mr-2"></i>
                {selectedProject.name}
              </h3>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="mb-5">
                <p className="text-[var(--text-secondary)] text-sm mb-4">
                  {selectedProject.description || "No description provided"}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-[var(--surface2)] rounded-lg p-3">
                    <label className="text-xs text-[var(--muted)] flex items-center gap-1 mb-2">
                      <i className="fas fa-user-tie text-green-500"></i> Project
                      Manager
                    </label>
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {selectedProject.managerName}
                    </p>
                  </div>

                  <div className="bg-[var(--surface2)] rounded-lg p-3">
                    <label className="text-xs text-[var(--muted)] flex items-center gap-1 mb-2">
                      <i className="fas fa-users text-blue-500"></i> Team Lead
                    </label>
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {selectedProject.teamLeadName}
                    </p>
                  </div>

                  <div className="bg-[var(--surface2)] rounded-lg p-3">
                    <label className="text-xs text-[var(--muted)] flex items-center gap-1 mb-2">
                      <i className="fas fa-flag"></i> Priority
                    </label>
                    <p>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(selectedProject.priority)}`}
                      >
                        {selectedProject.priority || "Medium"}
                      </span>
                    </p>
                  </div>

                  <div className="bg-[var(--surface2)] rounded-lg p-3">
                    <label className="text-xs text-[var(--muted)] flex items-center gap-1 mb-2">
                      <i className="fas fa-chart-line"></i> Status
                    </label>
                    <p>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedProject.status)}`}
                      >
                        {selectedProject.status || "Active"}
                      </span>
                    </p>
                  </div>

                  <div className="bg-[var(--surface2)] rounded-lg p-3 md:col-span-2">
                    <label className="text-xs text-[var(--muted)] flex items-center gap-1 mb-2">
                      <i className="fas fa-calendar-alt text-purple-500"></i>{" "}
                      Assigned On
                    </label>
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {selectedProject.assignedDate}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Section - Compact */}
      {dashboardData?.attendance_history &&
        dashboardData.attendance_history.length > 0 && (
          <div className="recent-activity mt-6 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                <i className="fas fa-history"></i> Recent Activity
              </h3>
              <span className="text-[10px] text-[var(--muted)]">
                {dashboardData.attendance_history.length} records
              </span>
            </div>

            <div className="w-full overflow-auto max-h-[200px]">
              <div className="min-w-[500px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[var(--surface)] z-10">
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-2 px-2 text-[var(--muted)] font-semibold">
                        Date
                      </th>
                      <th className="text-left py-2 px-2 text-[var(--muted)] font-semibold">
                        In
                      </th>
                      <th className="text-left py-2 px-2 text-[var(--muted)] font-semibold">
                        Location
                      </th>
                      <th className="text-left py-2 px-2 text-[var(--muted)] font-semibold">
                        Out
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.attendance_history.map(
                      (attendance, index) => {
                        const locationAddress = attendance.punch_in_address;

                        return (
                          <tr
                            key={index}
                            className="border-b border-[var(--border)] hover:bg-[var(--surface2)] transition-colors"
                          >
                            <td className="py-3 px-2 text-[var(--text)] whitespace-nowrap">
                              {attendance.log_date}
                            </td>
                            <td className="py-3 px-2 text-[var(--text)] whitespace-nowrap">
                              {attendance.punch_in
                                ? formatPunchTime(attendance.punch_in)
                                : "-"}
                            </td>
                            <td className="py-3 px-2">
                              {locationAddress ? (
                                <div className="text-[10px] text-[var(--muted)] flex items-start gap-1">
                                  <i className="fas fa-map-marker-alt text-green-500 text-[10px] mt-0.5 flex-shrink-0"></i>
                                  <span className="break-words">
                                    {locationAddress.length > 40
                                      ? locationAddress.substring(0, 40) + "..."
                                      : locationAddress}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-[var(--muted)]">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-[var(--text)] whitespace-nowrap">
                              {attendance.punch_out
                                ? formatPunchTime(attendance.punch_out)
                                : "-"}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {/* Modals */}
      <LocationModal
        isOpen={showLocationModal}
        onClose={() => {
          setShowLocationModal(false);
          setPunchOutData(null);
        }}
        onConfirm={handleLocationConfirm}
        type={punchType}
      />

      <PunchOutModal
        isOpen={showPunchOutModal}
        onClose={() => {
          setShowPunchOutModal(false);
          setPunchOutData(null);
          setPendingPunchOutDate("");
        }}
        onSubmit={handlePunchOutSubmit}
        loading={isSubmitting}
        punchOutDate={pendingPunchOutDate}
      />

      {/* Pending Punch Out Error Modal */}
      {showPendingErrorModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-[var(--surface)] rounded-xl max-w-md w-full p-6 shadow-2xl animate-slide-up">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center text-3xl mb-4">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h3 className="text-xl font-bold text-[var(--text)] mb-2">
                Pending Punch Out
              </h3>
              <p className="text-[var(--text-secondary)] mb-6 text-sm">
                You didn't punch out on{" "}
                <span className="font-bold text-[var(--text)]">
                  {pendingPunchOutDate}
                </span>
                . You have to complete the previous day's punch out. After that
                you can punch in for today.
              </p>

              <div className="flex w-full gap-3">
                <button
                  onClick={() => {
                    setShowPendingErrorModal(false);
                    setPendingPunchOutDate("");
                  }}
                  className="flex-1 py-2.5 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] font-medium text-sm hover:bg-[var(--surface3)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPendingErrorModal(false);
                    setPunchType("punch-out");
                    setShowPunchOutModal(true);
                  }}
                  className="flex-1 py-2.5 px-4 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 transition-colors"
                >
                  Continue to Punch Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Punch-In Error Modal */}
      {showBlockedErrorModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-[var(--surface)] rounded-xl max-w-md w-full p-6 shadow-2xl animate-slide-up">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-500 rounded-full flex items-center justify-center text-3xl mb-4">
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <h3 className="text-xl font-bold text-[var(--text)] mb-2">
                Punch-In Blocked
              </h3>
              <p className="text-[var(--text-secondary)] mb-6 text-sm">
                {blockedErrorMessage}
              </p>

              <div className="flex w-full">
                <button
                  onClick={() => setShowBlockedErrorModal(false)}
                  className="flex-1 py-2.5 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] font-medium text-sm hover:bg-[var(--surface3)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {renderMapModal()}

      {/* Error Toast */}
      {error && (
        <ErrorToast
          error={error}
          onClose={clearError}
          onAction={(actionType) => {
            if (actionType === "login") {
              window.location.href = "/login";
            } else if (actionType === "retry") {
              window.location.reload();
            } else if (actionType === "contact") {
              window.location.href = "mailto:support@company.com";
            } else if (actionType === "punch_out") {
              setShowPunchOutModal(true);
              clearError();
            } else if (actionType === "wait") {
              clearError();
              // Optionally show a message that they're waiting
              showToastMessage(
                "We'll notify you when HR approves your request",
                "info",
              );
            }
            clearError();
          }}
        />
      )}

      {/* Success Toast */}
      {toast && (
        <ErrorToast
          error={{
            type: toast.type,
            title: toast.title || "Success",
            message: toast.message,
          }}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
