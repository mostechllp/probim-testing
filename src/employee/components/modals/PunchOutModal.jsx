import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiX,
  FiCheckCircle,
  FiClock,
  FiSave,
  FiCalendar,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle,
  FiFileText,
  FiTarget,
  FiMessageSquare,
  FiWatch,
  FiInfo,
} from "react-icons/fi";
import { showToast } from "../common/Toast";
import apiClient from "../../../utils/apiClient";
import {
  fetchTaskReports,
  setTaskReportsPagination,
  setTaskReportsSearch,
  clearTaskReportsError,
  saveTaskReport,
} from "../../store/slices/taskReportsSlice";
import { TimeInput } from "../common/TimeInput";
import { TimeInputWorking } from "../common/TimeInputForWorkingHrs";

// Helper to convert 24-hour time to 12-hour format for display
const convertTo12Hour = (time24) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

// Punch Out Modal Component
// PunchOutModal.jsx - Updated with frontend calculation

const PunchOutModal = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  punchOutDate,
}) => {
  const dispatch = useDispatch();
  const [projects, setProjects] = useState([]);
  const [projectTimes, setProjectTimes] = useState({});
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [totalHours, setTotalHours] = useState(0);
  const [confirmNoProjects, setConfirmNoProjects] = useState(false);
  const [maxWorkingHours, setMaxWorkingHours] = useState(0);

  // Punch out time state - stored as 24-hour time string
  const [punchOutTime, setPunchOutTime] = useState("");

  // Task report states
  const [tasksCompleted, setTasksCompleted] = useState("");
  const [planTomorrow, setPlanTomorrow] = useState("");
  const [remarks, setRemarks] = useState("");
  const [savingTaskReport, setSavingTaskReport] = useState(false);

  const { user } = useSelector((state) => state.auth);
  const dashboardData = useSelector(
    (state) => state.EmpAttendance?.dashboardData,
  );

  // Get today's attendance data
  const todayAttendance = dashboardData?.today_attendance || {};
  const punchInTime = todayAttendance.punch_in_time;
  const punchInDate = todayAttendance.date;

  // Calculate working hours when modal opens or punch out time changes
  useEffect(() => {
    if (isOpen) {
      calculateWorkingHours();
      fetchProjects();
    }
    return () => {
      setConfirmNoProjects(false);
      setTasksCompleted("");
      setPlanTomorrow("");
      setRemarks("");
      setPunchOutTime("");
      setTotalHours(0);
      setMaxWorkingHours(0);
    };
  }, [isOpen]);

  // Recalculate when punch out time changes
  useEffect(() => {
    if (isOpen && punchOutTime) {
      calculateWorkingHours();
    }
  }, [punchOutTime, isOpen]);

  // Calculate working hours from punch in time and punch out time
  // Calculate working hours from punch in time and punch out time
  const calculateWorkingHours = () => {
    if (!punchInTime) {
      setMaxWorkingHours(0);
      return;
    }

    let punchInDateObj, punchOutDateObj;

    // Parse punch in time
    try {
      if (typeof punchInTime === "string") {
        if (punchInTime.includes("T")) {
          punchInDateObj = new Date(punchInTime);
        } else if (punchInTime.includes(":")) {
          // Format: "09:00:00" or "09:00" or "01:04 PM"
          // Check if it's in 12-hour format with AM/PM
          if (
            punchInTime.toLowerCase().includes("am") ||
            punchInTime.toLowerCase().includes("pm")
          ) {
            // Parse 12-hour format: "01:04 PM"
            const [time, meridian] = punchInTime.split(" ");
            let [hours, minutes] = time.split(":").map(Number);
            if (meridian.toLowerCase() === "pm" && hours !== 12) hours += 12;
            if (meridian.toLowerCase() === "am" && hours === 12) hours = 0;

            const now = new Date();
            punchInDateObj = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              hours,
              minutes || 0,
              0,
            );
          } else {
            // 24-hour format: "09:00:00" or "09:00"
            const parts = punchInTime.split(":");
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]) || 0;
            const seconds = parseInt(parts[2]) || 0;

            const now = new Date();
            punchInDateObj = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              hours,
              minutes,
              seconds,
            );
          }
        } else {
          punchInDateObj = new Date(punchInTime);
        }
      } else if (punchInTime instanceof Date) {
        punchInDateObj = punchInTime;
      } else {
        punchInDateObj = new Date(punchInTime);
      }

      // If no valid date, return
      if (isNaN(punchInDateObj.getTime())) {
        console.warn("Invalid punch in time:", punchInTime);
        setMaxWorkingHours(0);
        return;
      }
    } catch (error) {
      console.error("Error parsing punch in time:", error);
      setMaxWorkingHours(0);
      return;
    }

    // Determine punch out time
    let punchOutTimeStr = punchOutTime;
    if (!punchOutTimeStr && todayAttendance.punch_out_time) {
      punchOutTimeStr = todayAttendance.punch_out_time;
    }

    if (!punchOutTimeStr) {
      // If no punch out time yet, use current time
      punchOutDateObj = new Date();
    } else {
      // Parse punch out time
      try {
        if (punchOutTimeStr.includes("T")) {
          punchOutDateObj = new Date(punchOutTimeStr);
        } else if (punchOutTimeStr.includes(":")) {
          // Format: "18:00" (24-hour)
          const parts = punchOutTimeStr.split(":");
          const hours = parseInt(parts[0]);
          const minutes = parseInt(parts[1]) || 0;
          const seconds = parseInt(parts[2]) || 0;

          // Use the same date as punch in for consistency
          punchOutDateObj = new Date(
            punchInDateObj.getFullYear(),
            punchInDateObj.getMonth(),
            punchInDateObj.getDate(),
            hours,
            minutes,
            seconds,
          );
        } else {
          punchOutDateObj = new Date(punchOutTimeStr);
        }

        // If punch out is before punch in (next day), add 24 hours
        if (punchOutDateObj < punchInDateObj) {
          punchOutDateObj.setDate(punchOutDateObj.getDate() + 1);
        }
      } catch (error) {
        console.error("Error parsing punch out time:", error);
        // Use current time as fallback
        punchOutDateObj = new Date();
      }
    }

    // Calculate difference in hours
    const diffMs = punchOutDateObj - punchInDateObj;
    const diffHours = diffMs / (1000 * 60 * 60);

    // Round to 2 decimal places
    const roundedHours = Math.round(diffHours * 100) / 100;

    // Ensure minimum 0 and maximum reasonable (e.g., 24 hours)
    const maxHours = Math.max(0, Math.min(roundedHours, 24));
    setMaxWorkingHours(maxHours);

  };

  // Fetch projects
  const fetchProjects = async () => {
    const employeeId =
      dashboardData?.employee?.id || user?.employee?.id || user?.id;

    if (!employeeId) {
      console.warn("No employee ID available for projects");
      setProjects([]);
      return;
    }

    setLoadingProjects(true);
    try {
      const res = await apiClient.get(
        `/admin/project-assignments/${employeeId}`,
      );
      let projectsData = [];

      if (res.data?.data?.projects && Array.isArray(res.data.data.projects)) {
        projectsData = res.data.data.projects;
      } else if (res.data?.projects && Array.isArray(res.data.projects)) {
        projectsData = res.data.projects;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        projectsData = res.data.data;
      } else if (Array.isArray(res.data)) {
        projectsData = res.data;
      }

      setProjects(projectsData);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      showToast("Failed to load projects", "error");
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Calculate total hours whenever project times change
  useEffect(() => {
    let total = 0;
    Object.values(projectTimes).forEach((time) => {
      if (time) {
        const num = parseFloat(time);
        if (!isNaN(num)) total += num;
      }
    });
    const roundedTotal = Math.round(total * 100) / 100;
    setTotalHours(roundedTotal);
  }, [projectTimes]);

  // Set default punch out time when modal opens
  useEffect(() => {
    if (isOpen) {
      if (punchOutDate) {
        // For past date, default to 6:00 PM (18:00)
        setPunchOutTime("18:00");
      } else {
        // For today, use current time
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        setPunchOutTime(`${hours}:${minutes}`);
      }
    }
  }, [isOpen, punchOutDate]);

  const handleTimeChange = (projectId, time) => {
    setProjectTimes((prev) => ({ ...prev, [projectId]: time }));
  };

  // Handle saving task report
  const handleSaveTaskReport = async () => {
    const hasTaskReport =
      tasksCompleted.trim() || planTomorrow.trim() || remarks.trim();
    if (!hasTaskReport) return true;

    setSavingTaskReport(true);
    try {
      const result = await dispatch(
        saveTaskReport({
          tasks_completed: tasksCompleted,
          plan_tomorrow: planTomorrow,
          remarks: remarks,
        }),
      ).unwrap();

      if (result) {
        showToast("Task report saved successfully!", "success");
        return true;
      }
      return false;
    } catch (error) {
      showToast(error || "Failed to save task report", "error");
      return false;
    } finally {
      setSavingTaskReport(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate total hours against max working hours
    if (maxWorkingHours > 0 && totalHours > maxWorkingHours) {
      showToast(
        `Total hours (${totalHours}) exceeds your working hours (${maxWorkingHours})`,
        "error",
      );
      return;
    }

    // Validate punch out time for past date
    if (punchOutDate && (!punchOutTime || punchOutTime === "00:00")) {
      showToast("Please enter the punch out time for " + punchOutDate, "error");
      return;
    }

    // First, save the task report
    const taskReportSaved = await handleSaveTaskReport();
    if (!taskReportSaved) return;

    // Create full datetime with timezone
    let punchOutDateTime = null;
    if (punchOutTime && punchOutDate) {
      const dateStr = `${punchOutDate}T${punchOutTime}:00+05:30`;
      punchOutDateTime = dateStr;
    }

    // If no projects assigned
    if (projects.length === 0) {
      if (!confirmNoProjects) {
        setConfirmNoProjects(true);
        return;
      }
      onSubmit({
        project_times: {},
        total_hours: 0,
        no_projects: true,
        punch_out_date: punchOutDate || null,
        punch_out_time: punchOutDateTime,
        task_report: {
          tasks_completed: tasksCompleted,
          plan_tomorrow: planTomorrow,
          remarks: remarks,
        },
      });
      return;
    }

    onSubmit({
      project_times: projectTimes,
      total_hours: totalHours,
      max_working_hours: maxWorkingHours,
      punch_out_date: punchOutDate || null,
      punch_out_time: punchOutDateTime,
      task_report: {
        tasks_completed: tasksCompleted,
        plan_tomorrow: planTomorrow,
        remarks: remarks,
      },
    });
  };

  const handleClearAll = () => {
    setProjectTimes({});
  };

  const formatTimeDisplay = (time) => {
    if (!time) return "0 hrs";
    const num = parseFloat(time);
    if (isNaN(num) || num === 0) return "0 hrs";

    const hours = Math.floor(num);
    const minutes = Math.round((num - hours) * 60);

    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
    return `${hours} hr ${minutes} min`;
  };

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Helper to format punch time
  const formatPunchTime = (time) => {
    if (!time) return "—";
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

  // Update the formatWorkingHours function to handle the display better
  const formatWorkingHours = (hours) => {
    if (!hours || hours <= 0) return "0 hrs";

    const hrs = Math.floor(hours);
    const mins = Math.round((hours - hrs) * 60);

    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs} hr${hrs > 1 ? "s" : ""}`;
    return `${hrs} hr ${mins} min`;
  };

  // In PunchOutModal.jsx, update the useEffect that handles cleanup

useEffect(() => {
  if (isOpen) {
    calculateWorkingHours();
    fetchProjects();
  }
  return () => {
    // Reset all state when modal is closed/cancelled
    setConfirmNoProjects(false);
    setTasksCompleted("");
    setPlanTomorrow("");
    setRemarks("");
    setPunchOutTime("");
    setTotalHours(0);
    setMaxWorkingHours(0);
    setProjectTimes({}); 
    setProjects([]);
  };
}, [isOpen]);

  // Add a new function to format decimal hours to hours and minutes for display
  const formatHoursAndMinutes = (hours) => {
    if (!hours || hours <= 0) return "0h 0m";

    const hrs = Math.floor(hours);
    const mins = Math.round((hours - hrs) * 60);

    if (hrs === 0 && mins === 0) return "0h 0m";
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  // Update the Working Hours Summary section in the return statement

  // Helper to convert 24-hour time to 12-hour format for display
  const convertTo12Hour = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--surface)] rounded-xl w-full max-w-2xl mx-4 shadow-2xl animate-slide-up max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-[var(--border)]">
          <div>
            <h3 className="text-xl font-bold text-[var(--text)]">
              {punchOutDate
                ? `Punch Out for ${formatDisplayDate(punchOutDate)}`
                : "Punch Out"}
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1">
              {punchOutDate
                ? `Record your work and tasks for ${formatDisplayDate(punchOutDate)}`
                : "Record your work and tasks for today"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto">
          {/* Punch Out Time Field */}
          <div
            className={`mb-6 p-4 ${punchOutDate ? "bg-yellow-500/10 border-yellow-500/20" : "bg-blue-500/10 border-blue-500/20"} rounded-xl border`}
          >
            <label className="block text-sm font-semibold text-[var(--text)] mb-2">
              <FiWatch
                className={`inline mr-2 ${punchOutDate ? "text-yellow-500" : "text-blue-500"}`}
              />
              Punch Out Time
              {punchOutDate && (
                <span className="text-yellow-500 text-xs ml-1">
                  (for {formatDisplayDate(punchOutDate)})
                </span>
              )}
              {punchOutDate && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex items-center gap-3">
              <div className="w-40">
                <TimeInput
                  value={punchOutTime}
                  onChange={(e) => setPunchOutTime(e.target.value)}
                  className="text-sm"
                  required={!!punchOutDate}
                />
              </div>
              <span className="text-xs text-[var(--muted)]">
                {punchOutTime
                  ? `12-hour: ${convertTo12Hour(punchOutTime)}`
                  : "Select your punch out time"}
              </span>
            </div>
            <div className="mt-2 text-xs text-[var(--muted)]">
              Select the time you punched out (24-hour format)
            </div>
          </div>

          {/* Task Report Section */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[var(--text)] mb-3">
              <FiFileText className="inline mr-2 text-green-500" />
              Task Report
            </label>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1">
                  Tasks Completed
                </label>
                <textarea
                  value={tasksCompleted}
                  onChange={(e) => setTasksCompleted(e.target.value)}
                  placeholder="What tasks did you complete today?"
                  rows="3"
                  className="w-full px-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1">
                  Plan for Tomorrow
                </label>
                <textarea
                  value={planTomorrow}
                  onChange={(e) => setPlanTomorrow(e.target.value)}
                  placeholder="What are your plans for tomorrow?"
                  rows="2"
                  className="w-full px-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1">
                  Remarks (Optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any additional remarks or comments..."
                  rows="2"
                  className="w-full px-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[var(--surface)] text-[var(--muted)]">
                Project Time Tracking
              </span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-[var(--text)] mb-2">
              <FiClock className="inline mr-2 text-green-500" />
              Time Worked on Projects
            </label>

            {/* Working Hours Summary */}
            {/* Working Hours Summary */}
            <div className="mb-4 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-semibold text-[var(--text)]">
                    Punch In Time:
                  </span>
                  <span className="ml-2 text-sm text-[var(--text)]">
                    {punchInTime ? formatPunchTime(punchInTime) : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-[var(--text)]">
                    Punch Out Time:
                  </span>
                  <span className="ml-2 text-sm text-[var(--text)]">
                    {punchOutTime ? convertTo12Hour(punchOutTime) : "—"}
                  </span>
                </div>
              </div>

              {/* Display the actual times used for calculation */}
              <div className="mt-2 text-xs text-[var(--muted)] flex justify-between">
                <span>Raw Punch In: {punchInTime || "—"}</span>
                <span>Raw Punch Out: {punchOutTime || "—"}</span>
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-500/20">
                <div>
                  <span className="text-sm font-semibold text-[var(--text)]">
                    Total Working Hours:
                  </span>
                  <span className="ml-2 text-lg font-bold text-blue-500">
                    {maxWorkingHours > 0
                      ? formatHoursAndMinutes(maxWorkingHours)
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-[var(--text)]">
                    Allocated:
                  </span>
                  <span
                    className={`ml-2 text-lg font-bold ${totalHours > maxWorkingHours ? "text-red-500" : "text-green-500"}`}
                  >
                    {formatHoursAndMinutes(totalHours)}
                  </span>
                </div>
              </div>

              {maxWorkingHours > 0 && (
                <div className="mt-2">
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${totalHours > maxWorkingHours ? "bg-red-500" : "bg-green-500"}`}
                      style={{
                        width: `${Math.min((totalHours / maxWorkingHours) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {totalHours > maxWorkingHours
                      ? `⚠️ Over by ${formatHoursAndMinutes(totalHours - maxWorkingHours)}`
                      : `${formatHoursAndMinutes(maxWorkingHours - totalHours)} remaining`}
                  </div>
                </div>
              )}
            </div>

            {projects.length > 0 && (
              <p className="text-xs text-[var(--muted)] mb-3">
                Enter the time you spent working on each project (max{" "}
                {formatWorkingHours(maxWorkingHours)} hours total)
              </p>
            )}
          </div>

          <div className="mb-6">
            {loadingProjects ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-3"></div>
                <div className="text-sm text-[var(--muted)]">
                  Loading your projects...
                </div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 bg-[var(--surface2)] rounded-xl">
                <FiAlertCircle className="text-4xl text-[var(--muted)] mx-auto mb-2" />
                <div className="text-sm text-[var(--muted)]">
                  No projects assigned to you
                </div>
                <div className="text-xs text-[var(--muted)] mt-1">
                  You can punch out without recording project time
                </div>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <input
                    type="checkbox"
                    id="confirmNoProjects"
                    checked={confirmNoProjects}
                    onChange={(e) => setConfirmNoProjects(e.target.checked)}
                    className="w-4 h-4 text-green-500 rounded border-[var(--border)] focus:ring-green-500"
                  />
                  <label
                    htmlFor="confirmNoProjects"
                    className="text-sm text-[var(--text)]"
                  >
                    I confirm I want to punch out (no projects assigned)
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between bg-[var(--surface2)] p-4 rounded-xl border border-[var(--border)] hover:border-green-500/30 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-[var(--text)] truncate block">
                        {project.name}
                      </span>
                      {project.description && (
                        <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="w-36">
                        <TimeInputWorking
                          value={projectTimes[project.id] || ""}
                          onChange={(e) =>
                            handleTimeChange(project.id, e.target.value)
                          }
                          maxHours={maxWorkingHours}
                          className="text-sm"
                        />
                      </div>
                      <span className="text-xs text-[var(--muted)] w-20 text-right">
                        {formatTimeDisplay(projectTimes[project.id])}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warning for no projects */}
          {projects.length === 0 && !confirmNoProjects && (
            <div className="mb-6 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <div className="flex items-center gap-2">
                <FiAlertCircle className="text-yellow-500" />
                <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                  Please confirm you want to punch out
                </span>
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">
                You have no projects assigned. Check the confirmation box above
                to proceed.
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-8 bg-[var(--surface2)] border border-[var(--border)] rounded-full text-[var(--text)] font-semibold text-sm hover:bg-[var(--surface3)] hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                savingTaskReport ||
                (projects.length === 0 && !confirmNoProjects) ||
                (maxWorkingHours > 0 && totalHours > maxWorkingHours)
              }
              className="flex-1 bg-green-500 border-none text-white py-3 px-8 rounded-full font-semibold text-sm cursor-pointer transition-all flex items-center justify-center gap-2 hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || savingTaskReport ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {savingTaskReport ? "Saving Report..." : "Processing..."}
                </>
              ) : (
                <>
                  <FiSave />
                  {punchOutDate
                    ? `Confirm Punch Out for ${formatDisplayDate(punchOutDate)}`
                    : "Confirm Punch Out"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Task Reports List Component
const TaskReportsList = () => {
  const dispatch = useDispatch();
  const taskReportsState = useSelector((state) => state.EmpTaskReports) || {};
  const {
    taskReports = [],
    loading = false,
    pagination = { currentPage: 1, perPage: 10 },
    search = "",
    error = null,
  } = taskReportsState;

  // Fetch task reports on component mount
  useEffect(() => {
    dispatch(fetchTaskReports());
  }, [dispatch]);
  

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast(error, "error");
      dispatch(clearTaskReportsError());
    }
  }, [error, dispatch]);

  // Filter and paginate reports
  const filteredReports = Array.isArray(taskReports)
    ? taskReports.filter((report) => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
          (report.tasks_completed || "").toLowerCase().includes(searchLower) ||
          (report.plan_tomorrow || "").toLowerCase().includes(searchLower) ||
          (report.remarks || "").toLowerCase().includes(searchLower)
        );
      })
    : [];

  const perPage = pagination?.perPage || 10;
  const currentPage = pagination?.currentPage || 1;
  const totalPages = Math.ceil(filteredReports.length / perPage);
  const start = (currentPage - 1) * perPage;
  const currentReports = filteredReports.slice(start, start + perPage);

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
      return "-";
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      dispatch(
        setTaskReportsPagination({ currentPage: page, perPage: perPage }),
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSearchChange = (e) => {
    dispatch(setTaskReportsSearch(e.target.value));
  };

  const handleEntriesChange = (e) => {
    dispatch(
      setTaskReportsPagination({
        currentPage: 1,
        perPage: parseInt(e.target.value),
      }),
    );
  };

  if (loading && taskReports.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">
            Loading task reports...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-reports-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-7">
        <h2 className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-[var(--text)] to-green-600 bg-clip-text text-transparent">
          My Task Reports
        </h2>
      </div>

      {/* Action Bar */}
      <div className="files-actions flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div className="entries-select flex items-center gap-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-full px-3.5 py-1.5 text-xs text-[var(--text-secondary)]">
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
            <FiSearch className="text-[var(--muted)] text-xs" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search reports..."
              className="border-none outline-none bg-transparent text-xs text-[var(--text)] w-36 sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* Task Reports Table */}
      <div className="task-reports-table-wrapper bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-x-auto shadow-sm">
        <table className="task-reports-table w-full border-collapse text-xs min-w-[800px]">
          <thead>
            <tr className="bg-[var(--surface2)] border-b border-[var(--border)]">
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)]">
                #
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)]">
                Date
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)]">
                Tasks Completed
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)]">
                Plan for Tomorrow
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--muted)]">
                Remarks
              </th>
            </tr>
          </thead>
          <tbody>
            {currentReports.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="text-center py-8 text-[var(--muted)]"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FiClock className="text-4xl text-[var(--muted)]" />
                    <p>No task reports found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              currentReports.map((report, idx) => (
                <tr
                  key={report.id}
                  className="hover:bg-[var(--surface2)] transition-colors border-b border-[var(--border)]"
                >
                  <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                    {start + idx + 1}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="text-[var(--muted)] text-xs" />
                      <span className="text-[var(--text)] text-xs whitespace-nowrap">
                        {formatDate(report.date)}
                      </span>
                    </div>
                  </td>
                  <td
                    className="py-3.5 px-4 text-[var(--text-secondary)] max-w-[250px] truncate"
                    title={report.tasks_completed}
                  >
                    {report.tasks_completed || "-"}
                  </td>
                  <td
                    className="py-3.5 px-4 text-[var(--text-secondary)] max-w-[250px] truncate"
                    title={report.plan_tomorrow}
                  >
                    {report.plan_tomorrow || "-"}
                  </td>
                  <td
                    className="py-3.5 px-4 text-[var(--text-secondary)] max-w-[150px] truncate"
                    title={report.remarks}
                  >
                    {report.remarks || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredReports.length > 0 && (
        <div className="pagination-container flex flex-col sm:flex-row justify-between items-center gap-3 mt-5">
          <div className="text-xs text-[var(--muted)]">
            Showing {start + 1} to{" "}
            {Math.min(start + perPage, filteredReports.length)} of{" "}
            {filteredReports.length} entries
          </div>
          <div className="page-buttons flex gap-1.5 flex-wrap">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
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
              className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text)]"
            >
              <FiChevronRight className="mx-auto" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { PunchOutModal, TaskReportsList };
export default PunchOutModal;
