// src/admin/components/dashboard/AttendanceEmployeesModal.jsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAttendanceStats } from "../../store/slices/attendanceSlice";

const CONFIG = {
  total: {
    title: "Total Employees",
    icon: "fas fa-users",
    accent: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    listKey: "totalEmployeesList",
  },
  punched_in: {
    title: "Punched In Today",
    icon: "fas fa-fingerprint",
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    listKey: "punchedInEmployees",
  },
  late: {
    title: "Late Arrivals",
    icon: "fas fa-clock",
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    listKey: "lateEmployees",
  },
  absent: {
    title: "Absent Today",
    icon: "fas fa-user-slash",
    accent: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    listKey: "absentEmployees",
  },
};

export const AttendanceEmployeesModal = ({ isOpen, onClose, type }) => {
  const dispatch = useDispatch();
  const { stats } = useSelector((state) => state.attendance || {});

  useEffect(() => {
    if (isOpen) {
      // Refresh in case the data is stale
      dispatch(fetchAttendanceStats());
    }
  }, [isOpen, dispatch]);

  if (!isOpen || !type) return null;

  const cfg = CONFIG[type];
  if (!cfg) return null;

  const employees = stats?.[cfg.listKey] || [];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center`}
            >
              <i className={`${cfg.icon} ${cfg.accent}`}></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                {cfg.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {employees.length} {employees.length === 1 ? "employee" : "employees"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <i className="fas fa-times text-gray-500"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {employees.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <i className={`${cfg.icon} text-4xl mb-3 text-gray-300`}></i>
              <p>No employees in this category</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {employees.map((emp, idx) => {
                const name =
                  emp.name ||
                  emp.employee_name ||
                  `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
                  emp.employee_id ||
                  `Employee #${emp.id || idx}`;

                const meta =
                  emp.designation?.name ||
                  emp.designation ||
                  emp.department?.name ||
                  emp.department ||
                  emp.employee_id ||
                  "";

                const initials = name
                  .split(" ")
                  .map((n) => n[0])
                  .filter(Boolean)
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <li
                    key={emp.id || idx}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-medium text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                      {initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {name.toUpperCase()}
                      </p>
                      {meta && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {meta}
                        </p>
                      )}
                    </div>
                    {emp.punch_in && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        <i className="fas fa-sign-in-alt mr-1"></i>
                        {emp.punch_in}
                      </span>
                    )}
                    {emp.punch_out && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        <i className="fas fa-sign-out-alt mr-1"></i>
                        {emp.punch_out}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};