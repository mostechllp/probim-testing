import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployeeDetails, fetchMonthlyHoursByProject } from "../../store/slices/dashboardSlice";
import { showToast } from "../../../components/common/Toast";
import { formatDateDisplay, getInitials } from "../../pages/Dashboard";

export const ProjectHoursModal = ({
  isOpen,
  onClose,
  project,
  month,
  year,
  employees,
}) => {
  const dispatch = useDispatch();
  const { data: monthlyData, loading } = useSelector(
    (state) => state.dashboard.monthlyHours,
  );
  const employeeDetails = useSelector(
    (state) => state.dashboard.employeeDetails,
  );
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  // Create a map for quick employee lookup
  const employeeMap = {};
  if (employees && Array.isArray(employees)) {
    employees.forEach(emp => {
      if (emp.id) employeeMap[emp.id] = emp;
      if (emp.user_id) employeeMap[emp.user_id] = emp;
      if (emp.employee_id) employeeMap[emp.employee_id] = emp;
    });
  }

  // ─── FIX: Get avatar from API data first, fallback to employees prop ───
  const getEmployeeAvatar = (employeeId, apiEmployeeData) => {
    // 1. Try to get avatar from the API data directly (most reliable)
    if (apiEmployeeData?.avatar) {
      const avatarValue = apiEmployeeData.avatar;
      if (typeof avatarValue === "string") {
        if (avatarValue.startsWith("http")) return avatarValue;
        const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
        if (avatarValue.startsWith("/storage/")) return `${baseUrl}${avatarValue}`;
        if (avatarValue.startsWith("avatars/")) return `${baseUrl}/storage/${avatarValue}`;
        return `${baseUrl}/storage/${avatarValue}`;
      }
      if (typeof avatarValue === "object" && avatarValue.path) {
        const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
        return `${baseUrl}/storage/${avatarValue.path}`;
      }
    }

    // 2. Fallback: Try to get avatar from the employees prop
    const emp = employeeMap[employeeId] || employeeMap[String(employeeId)];
    if (!emp) return null;
    
    const avatarValue = emp.avatar || emp.avatar_path;
    if (!avatarValue) return null;
    
    if (typeof avatarValue === "object" && avatarValue.path) {
      const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
      return `${baseUrl}/storage/${avatarValue.path}`;
    }
    if (typeof avatarValue === "string") {
      if (avatarValue.startsWith("http")) return avatarValue;
      const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
      if (avatarValue.startsWith("/storage/")) return `${baseUrl}${avatarValue}`;
      if (avatarValue.startsWith("avatars/")) return `${baseUrl}/storage/${avatarValue}`;
      return `${baseUrl}/storage/${avatarValue}`;
    }
    return null;
  };

  // ─── FIX: Get employee name from API data first ──────────────────────
  const getEmployeeNameFromData = (item) => {
    if (item.name) return item.name;
    
    const employeeId = item.user_id || item.id;
    const emp = employeeMap[employeeId] || employeeMap[String(employeeId)];
    if (!emp) return `Employee #${employeeId}`;
    return emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_id || `Employee #${employeeId}`;
  };

  useEffect(() => {
    if (isOpen && project) {
      dispatch(
        fetchMonthlyHoursByProject({
          projectId: project.id || project.projectId,
        }),
      );
    }
  }, [isOpen, project, dispatch]);

  const employeesData = monthlyData?.employees || [];

  const uniqueEmployees = employeesData.map((item) => ({
    id: item.user_id || item.id,
    name: item.name || `Employee #${item.user_id || item.id}`,
  }));

  const filteredData =
    employeeFilter === "all"
      ? employeesData
      : employeesData.filter(
          (item) =>
            String(item.user_id) === String(employeeFilter) ||
            String(item.id) === String(employeeFilter),
        );

  // ─── FIX: Calculate total hours with full precision ──────────────────
  const totalHours = filteredData.reduce(
    (sum, item) => sum + (parseFloat(item.total_hours) || 0),
    0,
  );
  
  // Format total hours to show full precision
  const formattedTotalHours = totalHours.toFixed(2);

  const totalEmployees = filteredData.length;

  const handleEmployeeClick = async (employeeId) => {
    try {
      const matchedEmployee = employees.find(
        (e) =>
          String(e.user_id) === String(employeeId) ||
          String(e.id) === String(employeeId),
      );

      const employeeRecordId = matchedEmployee?.id || employeeId;

      if (!employeeDetails[employeeRecordId]) {
        await dispatch(fetchEmployeeDetails(employeeRecordId)).unwrap();
      }
      setSelectedEmployee(employeeRecordId);
      setShowEmployeeModal(true);
    } catch (error) {
      console.error("Failed to load employee details:", error);
      showToast("Failed to load employee details", "error");
    }
  };

  const periodInfo =
    monthlyData?.period ||
    (month && year
      ? `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1]} ${year}`
      : "Current Month");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              <i className="fas fa-project-diagram text-indigo-500 mr-2"></i>
              {project?.name || project?.fullName || "Project"} - Monthly Hours
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {periodInfo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <i className="fas fa-times text-gray-500"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[75vh]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            </div>
          ) : employeesData.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <i className="fas fa-clock text-4xl mb-3 text-gray-300"></i>
              <p>No hours logged for this project this month</p>
            </div>
          ) : (
            <>
              {/* ─── STATS CARDS ────────────────────────────────────────────── */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-center">
                  {/* ─── FIX: Show full precision total hours ──────────────── */}
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {formattedTotalHours}h
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Total Hours
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {totalEmployees}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Employees
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {filteredData.length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Entries
                  </div>
                </div>
              </div>

              {/* Filter */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <i className="fas fa-filter text-indigo-500 mr-1"></i> Filter:
                </label>
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Employees</option>
                  {uniqueEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredData.length} entries
                </span>
                {employeeFilter !== "all" && (
                  <button
                    onClick={() => setEmployeeFilter("all")}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    <i className="fas fa-times mr-1"></i> Clear
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                        #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Employee
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Hours
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Projects
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, idx) => {
                      const hours = parseFloat(item.total_hours) || 0;
                      const projects = item.projects || [];
                      const projectNames = projects
                        .map((p) => p.project_name)
                        .join(", ");
                      const employeeId = item.user_id || item.id;
                      
                      const employeeName = item.name || getEmployeeNameFromData(item);
                      const avatarUrl = getEmployeeAvatar(employeeId, item);
                      const initials = getInitials(employeeName);

                      return (
                        <tr
                          key={idx}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2.5">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={employeeName}
                                  className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-600 flex-shrink-0"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    const fallback = e.target.parentElement.querySelector(`.avatar-fallback-${idx}`);
                                    if (fallback) fallback.style.display = "flex";
                                  }}
                                />
                              ) : null}
                              <div 
                                className={`w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-medium text-indigo-600 dark:text-indigo-400 flex-shrink-0 avatar-fallback-${idx}`} 
                                style={{ display: avatarUrl ? 'none' : 'flex' }}
                              >
                                {initials}
                              </div>
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {employeeName}
                              </span>
                            </div>
                          </td>
                          {/* ─── FIX: Show total_hours with full precision ─── */}
                          <td className="px-4 py-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            {hours.toFixed(2)}h
                          </td>
                          <td
                            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate"
                            title={projectNames}
                          >
                            {projectNames || "-"}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() =>
                                handleEmployeeClick(item.user_id || item.id)
                              }
                              className="px-3 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1"
                            >
                              <i className="fas fa-user text-[10px]"></i> View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-info-circle mr-1"></i>
            Click "View" to see employee details
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Employee Details Modal */}
      {showEmployeeModal && selectedEmployee && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowEmployeeModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                <i className="fas fa-user text-indigo-500 mr-2"></i>
                Employee Details
              </h3>
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <i className="fas fa-times text-gray-500"></i>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {(() => {
                const emp = employeeDetails[selectedEmployee];
                if (!emp) {
                  return (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <i className="fas fa-spinner fa-spin text-2xl mb-3"></i>
                      <p>Loading employee details...</p>
                    </div>
                  );
                }

                const name =
                  `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
                  emp.employee_id ||
                  `Employee #${emp.id}`;
                const user = emp.user || {};

                const avatarValue = emp.avatar || emp.avatar_path;
                let avatarUrl = null;
                if (avatarValue) {
                  if (typeof avatarValue === "object" && avatarValue.path) {
                    const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
                    avatarUrl = `${baseUrl}/storage/${avatarValue.path}`;
                  } else if (typeof avatarValue === "string") {
                    if (avatarValue.startsWith("http")) avatarUrl = avatarValue;
                    else {
                      const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
                      if (avatarValue.startsWith("/storage/")) avatarUrl = `${baseUrl}${avatarValue}`;
                      else if (avatarValue.startsWith("avatars/")) avatarUrl = `${baseUrl}/storage/${avatarValue}`;
                      else avatarUrl = `${baseUrl}/storage/${avatarValue}`;
                    }
                  }
                }

                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-800"
                          onError={(e) => {
                            e.target.style.display = "none";
                            const fallback = e.target.parentElement.querySelector('.avatar-fallback-detail');
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-400 avatar-fallback-detail`} 
                        style={{ display: avatarUrl ? 'none' : 'flex' }}
                      >
                        {name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200">{name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user.designation?.name || "No Designation"} •{" "}
                          {user.department?.name || "No Department"}
                        </p>
                        <p className="text-xs text-gray-400">
                          Employee ID: {emp.employee_id || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Email
                        </div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {emp.company_email || user.email || "N/A"}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Phone
                        </div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {emp.company_mobile_number || "N/A"}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Joining Date
                        </div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {formatDateDisplay(emp.joining_date)}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Status
                        </div>
                        <div className="text-sm font-medium">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              user.status === "active" 
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {user.status || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};