import { COLORS, getInitials, getStatusBadge } from "../../pages/Dashboard";

export const RecentPunchesList = ({ punches, employees }) => {
  const safePunches = Array.isArray(punches) ? punches : [];
  const employeeMap = {};

  // Create a map of employee names to their avatar
  if (employees && Array.isArray(employees)) {
    employees.forEach(emp => {
      if (emp.name) {
        employeeMap[emp.name.toLowerCase()] = emp;
      }
      // Also map by employee_id
      if (emp.employee_id) {
        employeeMap[emp.employee_id] = emp;
      }
    });
  }

  // Helper to get employee avatar
  const getEmployeeAvatar = (name) => {
    if (!name) return null;
    
    // Try to find by name
    const emp = employeeMap[name.toLowerCase()];
    if (emp) {
      // Check if avatar exists
      const avatarValue = emp.avatar || emp.avatar_path;
      if (avatarValue) {
        // Handle object type avatar
        if (typeof avatarValue === "object" && avatarValue.path) {
          const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
          return `${baseUrl}/storage/${avatarValue.path}`;
        }
        // Handle string paths
        if (typeof avatarValue === "string") {
          if (avatarValue.startsWith("http")) return avatarValue;
          const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
          if (avatarValue.startsWith("/storage/")) return `${baseUrl}${avatarValue}`;
          return `${baseUrl}/storage/${avatarValue}`;
        }
      }
    }
    return null;
  };

  if (safePunches.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-[280px] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          No punch-in data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <i className="fas fa-login text-gray-500 dark:text-gray-400"></i>
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Recent punch-ins
        </h3>
      </div>
      <div className="max-h-[210px] overflow-y-auto">
        {safePunches.slice(0, 8).map((punch, index) => {
          const status = punch.status || "unknown";
          const badge = getStatusBadge(status);
          const dotColor =
            {
              on_time: COLORS.aqua,
              "on-time": COLORS.aqua,
              ontime: COLORS.aqua,
              late: COLORS.yellow,
              absent: COLORS.red,
              wfh: COLORS.blue,
              leave: COLORS.violet,
            }[status] || COLORS.blue;

          // Get avatar URL for this employee
          const avatarUrl = getEmployeeAvatar(punch.name);
          const initials = getInitials(punch.name);

          return (
            <div
              key={index}
              className="flex items-center gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: dotColor }}
              />
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={punch.name || "Unknown"}
                  className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-gray-600 flex-shrink-0"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.querySelector(`.avatar-fallback-${index}`).style.display = "flex";
                  }}
                />
              ) : null}
              <div className={`w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 flex-shrink-0 avatar-fallback-${index}`} style={{ display: avatarUrl ? 'none' : 'flex' }}>
                {initials}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                {(punch.name || "Unknown").toUpperCase()}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {punch.time || "—"}
              </span>
              <span className={`badge ${badge.className}`}>{badge.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};