// file: src/employee/components/modals/MissedPunchModal.jsx

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "../../../components/common/Toast";
import apiClient from "../../../utils/apiClient";
import { fetchDashboardData } from "../../store/slices/attendanceSlice";
import { TimeInputWorking } from "../common/TimeInputForWorkingHrs";

// Re-use the formatDateDisplay helper or import it
const formatDateDisplay = (dateString) => {
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

// Get browser timezone
const getBrowserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// Format hours and minutes
const formatHoursAndMinutes = (hours) => {
  if (!hours || hours <= 0) return "0h 0m";
  const hrs = Math.floor(hours);
  const mins = Math.round((hours - hrs) * 60);
  if (hrs === 0 && mins === 0) return "0h 0m";
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

// Format time display
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

// Convert 24-hour time to 12-hour format for display
const convertTo12Hour = (time24) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const MissedPunchModal = ({ 
  isOpen, 
  onClose, 
  selectedDate,
  onSuccess 
}) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const dashboardData = useSelector(
    (state) => state.EmpAttendance?.dashboardData,
  );

  const [punchInTime, setPunchInTime] = useState("");
  const [punchOutTime, setPunchOutTime] = useState("");
  const [reason, setReason] = useState("");
  // Request type is now fixed to "missed_punch_in" and disabled
  const [requestType] = useState("missed_punch_in");
  const [projects, setProjects] = useState([]);
  const [projectTimes, setProjectTimes] = useState({});
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timezone] = useState(getBrowserTimezone());
  const [maxWorkingHours, setMaxWorkingHours] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [confirmNoProjects, setConfirmNoProjects] = useState(false);

  // Get employee ID for fetching projects
  const employeeId = dashboardData?.employee?.id || user?.employee?.id;

  // Calculate working hours from punch in time and punch out time
  const calculateWorkingHours = (punchIn, punchOut, date) => {
    if (!punchIn || !punchOut) {
      setMaxWorkingHours(0);
      return;
    }

    let punchInDateObj, punchOutDateObj;
    const baseDate = date ? new Date(date) : new Date();

    try {
      // Parse punch in time
      if (punchIn.includes(":")) {
        const parts = punchIn.split(":");
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        punchInDateObj = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate(),
          hours,
          minutes,
          seconds,
        );
      } else {
        punchInDateObj = new Date(punchIn);
      }

      if (isNaN(punchInDateObj.getTime())) {
        console.warn("Invalid punch in time:", punchIn);
        setMaxWorkingHours(0);
        return;
      }
    } catch (error) {
      console.error("Error parsing punch in time:", error);
      setMaxWorkingHours(0);
      return;
    }

    try {
      // Parse punch out time
      if (punchOut.includes(":")) {
        const parts = punchOut.split(":");
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        punchOutDateObj = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate(),
          hours,
          minutes,
          seconds,
        );
      } else {
        punchOutDateObj = new Date(punchOut);
      }

      if (punchOutDateObj < punchInDateObj) {
        punchOutDateObj.setDate(punchOutDateObj.getDate() + 1);
      }
    } catch (error) {
      console.error("Error parsing punch out time:", error);
      punchOutDateObj = new Date();
    }

    const diffMs = punchOutDateObj - punchInDateObj;
    const diffHours = diffMs / (1000 * 60 * 60);
    const roundedHours = Math.round(diffHours * 100) / 100;
    const maxHours = Math.max(0, Math.min(roundedHours, 24));
    setMaxWorkingHours(maxHours);
  };

  // Recalculate working hours when punch in/out times change
  useEffect(() => {
    if (isOpen && punchInTime && punchOutTime) {
      calculateWorkingHours(punchInTime, punchOutTime, selectedDate);
    }
  }, [punchInTime, punchOutTime, selectedDate, isOpen]);

  // Fetch employee projects when modal opens
  useEffect(() => {
    if (isOpen && employeeId) {
      fetchProjects();
    }
  }, [isOpen, employeeId]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await apiClient.get(`/employee/project-assignments/${employeeId}`);
      
      let projectsData = [];
      if (
        response.data?.data?.projects &&
        Array.isArray(response.data.data.projects)
      ) {
        projectsData = response.data.data.projects;
      } else if (
        response.data?.projects &&
        Array.isArray(response.data.projects)
      ) {
        projectsData = response.data.projects;
      } else if (
        response.data?.data &&
        Array.isArray(response.data.data)
      ) {
        projectsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        projectsData = response.data;
      }
      setProjects(projectsData);
    } catch (error) {
      console.error("Error fetching projects:", error);
      showToast("Failed to load projects", "error");
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

  // Set default times when modal opens
  useEffect(() => {
    if (isOpen) {
      // Set default punch in time to 9:00 AM
      setPunchInTime("09:00");
      // Set default punch out time to 6:00 PM
      setPunchOutTime("18:00");
      // Reset project times
      setProjectTimes({});
      setConfirmNoProjects(false);
      setTotalHours(0);
      setMaxWorkingHours(0);
    }
  }, [isOpen]);

  // Reset form when modal opens with new date
  const handleClose = () => {
    setPunchInTime("");
    setPunchOutTime("");
    setReason("");
    setProjectTimes({});
    setProjects([]);
    setConfirmNoProjects(false);
    setTotalHours(0);
    setMaxWorkingHours(0);
    onClose();
  };

  // Handle time change for a project
  const handleTimeChange = (projectId, time) => {
    setProjectTimes((prev) => ({ ...prev, [projectId]: time }));
  };

  // Check if at least one project has hours entered
  const isAtLeastOneProjectFilled = () => {
    if (projects.length === 0) {
      return confirmNoProjects;
    }
    return projects.some((project) => {
      const time = projectTimes[project.id];
      return time && time.trim() !== "" && parseFloat(time) > 0;
    });
  };

  // Check if total hours is valid (not exceeding max working hours)
  const isTotalHoursValid = () => {
    if (projects.length === 0) return true;
    if (totalHours === 0) return false;
    if (maxWorkingHours > 0 && totalHours > maxWorkingHours) return false;
    return true;
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!selectedDate) {
      showToast("Please select a date", "error", "Validation Error");
      return;
    }
    
    if (!punchInTime) {
      showToast("Please enter punch-in time", "error", "Validation Error");
      return;
    }
    
    if (!punchOutTime) {
      showToast("Please enter punch-out time", "error", "Validation Error");
      return;
    }
    
    if (!reason || reason.trim().length < 5) {
      showToast("Please provide a valid reason (minimum 5 characters)", "error", "Validation Error");
      return;
    }

    // Check project time validation
    if (projects.length > 0) {
      const atLeastOneFilled = projects.some((project) => {
        const time = projectTimes[project.id];
        return time && time.trim() !== "" && parseFloat(time) > 0;
      });
      
      if (!atLeastOneFilled) {
        showToast("Please enter hours for at least one project", "error", "Validation Error");
        return;
      }
      
      if (totalHours === 0) {
        showToast("Total hours cannot be zero", "error", "Validation Error");
        return;
      }

      if (maxWorkingHours > 0 && totalHours > maxWorkingHours) {
        showToast(
          `Total hours (${formatHoursAndMinutes(totalHours)}) exceeds working hours (${formatHoursAndMinutes(maxWorkingHours)})`,
          "error", 
          "Validation Error"
        );
        return;
      }
    } else {
      if (!confirmNoProjects) {
        showToast("Please confirm you want to submit without projects", "error", "Validation Error");
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      // Build payload according to API requirements
      const payload = {
        type: requestType, // "missed_punch_in" - fixed
        request_date: selectedDate,
        reason: reason.trim(),
        timezone: timezone,
        punch_in_time: punchInTime,
        punch_out_time: punchOutTime,
      };

      // Add project times if any exist
      if (projects.length > 0 && Object.keys(projectTimes).length > 0) {
        const projectTimeEntries = Object.entries(projectTimes)
          .filter(([_, time]) => time && parseFloat(time) > 0)
          .map(([projectId, time]) => ({
            project_id: parseInt(projectId),
            time_minutes: Math.round(parseFloat(time) * 60)
          }));
        
        if (projectTimeEntries.length > 0) {
          payload.project_times = projectTimeEntries;
        }
      }

      const response = await apiClient.post('/employee/missed-punch', payload);
      
      showToast(
        `Missed punch request sent successfully for ${formatDateDisplay(selectedDate)}`,
        "success",
        "Request Sent"
      );
      
      // Reset form and close modal
      handleClose();
      
      // Refresh dashboard data
      await dispatch(fetchDashboardData()).unwrap();
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      let errorMessage = "Failed to submit request";
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Check for validation errors
      if (error?.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0]?.[0];
        if (firstError) {
          errorMessage = firstError;
        }
      }
      
      showToast(errorMessage, "error", "Request Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Check if submit should be disabled
  const isSubmitDisabled = () => {
    if (isSubmitting) return true;
    if (!punchInTime || !punchOutTime) return true;
    if (!reason || reason.trim().length < 5) return true;
    
    if (projects.length > 0) {
      const atLeastOneFilled = projects.some((project) => {
        const time = projectTimes[project.id];
        return time && time.trim() !== "" && parseFloat(time) > 0;
      });
      if (!atLeastOneFilled) return true;
      if (totalHours === 0) return true;
      if (maxWorkingHours > 0 && totalHours > maxWorkingHours) return true;
    } else {
      if (!confirmNoProjects) return true;
    }
    
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-[var(--surface)] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-slide-up">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-[var(--surface)] z-10 pb-2 border-b border-[var(--border)]">
          <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <i className="fas fa-clock text-orange-500"></i>
            Missed Punch Request
          </h3>
          <button
            onClick={handleClose}
            className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="space-y-4 mt-4">
          {/* Request Type - Disabled and prefilled */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Request Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value="Missed Punch In"
              disabled
              className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm cursor-not-allowed opacity-75"
            />
            <input type="hidden" value={requestType} />
          </div>

          {/* Date - Disabled */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              disabled
              className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm cursor-not-allowed opacity-75"
            />
          </div>

          {/* Punch In Time - Required */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Punch In Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={punchInTime}
              onChange={(e) => setPunchInTime(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              step="60"
              required
            />
          </div>

          {/* Punch Out Time - Required */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Punch Out Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={punchOutTime}
              onChange={(e) => setPunchOutTime(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              step="60"
              required
            />
          </div>

          {/* Working Hours Summary */}
          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-semibold text-[var(--text)]">
                  Punch In Time:
                </span>
                <span className="ml-2 text-sm text-[var(--text)]">
                  {punchInTime ? convertTo12Hour(punchInTime) : "—"}
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
                  className={`ml-2 text-lg font-bold ${
                    totalHours > maxWorkingHours && maxWorkingHours > 0
                      ? "text-red-500"
                      : totalHours === 0
                        ? "text-gray-400"
                        : "text-green-500"
                  }`}
                >
                  {formatHoursAndMinutes(totalHours)}
                </span>
              </div>
            </div>

            {maxWorkingHours > 0 && totalHours > 0 && (
              <div className="mt-2">
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      totalHours > maxWorkingHours ? "bg-red-500" : "bg-green-500"
                    }`}
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

          {/* Project Times - Required */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--text)]">
                Project Times <span className="text-red-500">*</span>
                <span className="text-xs text-[var(--muted)] ml-2 font-normal">
                  (At least one project required)
                </span>
              </label>
            </div>
            
            {loadingProjects ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
                <div className="text-sm text-[var(--muted)]">
                  Loading your projects...
                </div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-6 bg-[var(--surface2)] rounded-xl">
                <div className="text-sm text-[var(--muted)]">
                  No projects assigned to you
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <input
                    type="checkbox"
                    id="confirmNoProjects"
                    checked={confirmNoProjects}
                    onChange={(e) => setConfirmNoProjects(e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded border-[var(--border)] focus:ring-orange-500"
                  />
                  <label
                    htmlFor="confirmNoProjects"
                    className="text-sm text-[var(--text)]"
                  >
                    I confirm I want to submit without projects
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                {projects.map((project) => {
                  const timeValue = projectTimes[project.id] || "";
                  const isFilled = timeValue && parseFloat(timeValue) > 0;

                  return (
                    <div
                      key={project.id}
                      className={`flex items-center justify-between bg-[var(--surface2)] p-3 rounded-lg border transition-all ${
                        isFilled
                          ? "border-orange-500/30"
                          : "border-gray-300/30 dark:border-gray-600/30"
                      } hover:border-orange-500/50`}
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
                            value={timeValue}
                            onChange={(e) =>
                              handleTimeChange(project.id, e.target.value)
                            }
                            maxHours={maxWorkingHours || 24}
                            className="text-sm"
                          />
                        </div>
                        <span className="text-xs text-[var(--muted)] w-20 text-right">
                          {formatTimeDisplay(timeValue)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Validation Messages */}
          {projects.length > 0 && (
            <div className="mt-2 space-y-2">
              {!isAtLeastOneProjectFilled() && (
                <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20 flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle text-yellow-500"></i>
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">
                    Please enter hours for at least one project.
                  </span>
                </div>
              )}
              {totalHours === 0 && isAtLeastOneProjectFilled() && (
                <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20 flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle text-yellow-500"></i>
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">
                    Total hours cannot be zero.
                  </span>
                </div>
              )}
              {maxWorkingHours > 0 && totalHours > maxWorkingHours && (
                <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20 flex items-center gap-2">
                  <i className="fas fa-exclamation-circle text-red-500"></i>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    Total hours ({formatHoursAndMinutes(totalHours)}) exceeds 
                    working hours ({formatHoursAndMinutes(maxWorkingHours)})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Reason - Required */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a valid reason for this request (minimum 5 characters)..."
              rows="3"
              className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              <i className="fas fa-info-circle mr-1"></i>
              Minimum 5 characters required
            </p>
          </div>

          {/* Timezone (hidden) */}
          <input type="hidden" value={timezone} />

          {/* Buttons */}
          <div className="flex gap-3 pt-2 border-t border-[var(--border)] mt-4">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] font-medium text-sm hover:bg-[var(--surface3)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled()}
              className="flex-1 py-2.5 px-4 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Send Request
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissedPunchModal;