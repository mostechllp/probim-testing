import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  UserPlus,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  FileText,
  ShieldCheck,
  Briefcase,
  Calendar,
  UserCheck,
  Timer,
  DollarSign,
  Loader,
  Trash2,
  Eye,
  Play,
  ListChecks,
  RefreshCw,
} from "lucide-react";
import { showToast } from "../../components/common/Toast";
import { fetchEmployees } from "../store/slices/employeeSlice";
import {
  fetchAllOnboarding,
  deleteOnboardingRecord,
  fetchOnboardingById,
} from "../store/slices/onboardingSlice";

const OnboardingDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Get data from Redux store
  const { employees, loading: employeesLoading } = useSelector(
    (state) => state.employees || { employees: [], loading: false },
  );
  const { onboardingRecords, loading: onboardingLoading } = useSelector(
    (state) => state.onboarding || { onboardingRecords: [], loading: false },
  );

  // Build employee lookup map
  const employeeMap = React.useMemo(() => {
    const map = new Map();
    if (employees && employees.length > 0) {
      employees.forEach((emp) => {
        map.set(String(emp.id), emp);
        if (emp.employee_id) {
          map.set(String(emp.employee_id), emp);
        }
        if (emp.raw?.employee_id) {
          map.set(String(emp.raw.employee_id), emp);
        }
      });
    }
    return map;
  }, [employees]);

  // Fetch onboarding data and employees
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await dispatch(fetchEmployees());
        await dispatch(fetchAllOnboarding());
      } catch (error) {
        console.error("Failed to fetch data:", error);
        showToast("Failed to load onboarding data", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dispatch]);

  // Helper to get employee name
  const getEmployeeName = (onboarding) => {
    if (onboarding.employee_name) return onboarding.employee_name;

    const employeeId =
      onboarding.employee_id || onboarding.user_id || onboarding.id;
    const employee = employeeMap.get(String(employeeId));

    if (employee) {
      return (
        employee.name ||
        `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
        employee.employee_id ||
        "Unknown"
      );
    }

    if (onboarding.first_name) {
      return `${onboarding.first_name || ""} ${onboarding.last_name || ""}`.trim();
    }

    return "Unknown Employee";
  };

  // Helper to get designation
  const getDesignation = (onboarding) => {
    if (onboarding.designation) return onboarding.designation;
    if (onboarding.user?.designation?.name)
      return onboarding.user.designation.name;

    const employee = employeeMap.get(String(onboarding.employee_id));
    if (employee && employee.designation) {
      return employee.designation;
    }

    if (onboarding.user?.designation) {
      return onboarding.user.designation.name || onboarding.user.designation;
    }

    return "-";
  };

  // Helper to get department
  const getDepartment = (onboarding) => {
    if (onboarding.department) return onboarding.department;
    if (onboarding.user?.department?.name)
      return onboarding.user.department.name;

    const employee = employeeMap.get(String(onboarding.employee_id));
    if (employee && employee.department) {
      return employee.department;
    }

    if (onboarding.user?.department) {
      return onboarding.user.department.name || onboarding.user.department;
    }

    return "-";
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
      case "pending_onboarding":
        return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
      case "onboarding":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case "in_progress":
      case "in-progress":
        return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "completed":
      case "active":
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status) => {
    if (!status) return "Pending";
    const map = {
      pending: "Pending",
      pending_onboarding: "Pending Onboarding",
      onboarding: "Onboarding",
      in_progress: "In Progress",
      "in-progress": "In Progress",
      completed: "Completed",
      active: "Active",
    };
    return map[status.toLowerCase()] || status;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not set";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleDeleteClick = (onboarding) => {
    setSelectedOnboarding(onboarding);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedOnboarding) return;

    setDeleting(true);
    try {
      await dispatch(deleteOnboardingRecord(selectedOnboarding.id)).unwrap();
      showToast("Onboarding record deleted successfully", "success");
      setShowDeleteModal(false);
      setSelectedOnboarding(null);
      await dispatch(fetchAllOnboarding());
    } catch (error) {
      console.error("Delete error:", error);
      showToast(error.message || "Failed to delete onboarding record", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ─── HANDLE RESUME ──────────────────────────────────────────────────────
  const handleResume = async (onboarding) => {
    try {
      // Store the onboarding ID
      localStorage.setItem("onboarding_id", String(onboarding.id));
      localStorage.setItem(
        "onboarding_employee_id",
        String(onboarding.employee_id || onboarding.user_id),
      );

      // Fetch the full onboarding data to pre-fill the form
      await dispatch(fetchOnboardingById(onboarding.id)).unwrap();

      // Navigate to the initiate page with resume flag
      navigate("/admin/employees/onboarding/initiate", {
        state: {
          onboardingId: onboarding.id,
          employeeId: onboarding.employee_id || onboarding.user_id,
          isResume: true,
          isEdit: true,
        },
      });
    } catch (error) {
      console.error("Failed to fetch onboarding data:", error);
      showToast("Failed to load onboarding data. Please try again.", "error");
    }
  };

  const handleView = (onboarding) => {
    navigate(`/admin/employees/onboarding/view/${onboarding.id}`);
  };

  if (loading || onboardingLoading) {
    return (
      <div className="w-full overflow-x-hidden">
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const recentOnboarding = onboardingRecords || [];

  // Check if status is pending onboarding
  const isPendingOnboarding = (status) => {
    return (
      status?.toLowerCase() === "pending_onboarding" ||
      status?.toLowerCase() === "pending"
    );
  };

  return (
    <div className="w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-gray-800 to-green-600 dark:from-gray-200 dark:to-green-400 bg-clip-text text-transparent">
          Onboarding
        </h2>
        <button
          className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
          onClick={() => {
            // ─── CLEAR ALL ONBOARDING DATA FOR FRESH START ──────────────────────
            // Clear localStorage items
            localStorage.removeItem("onboarding_id");
            localStorage.removeItem("onboarding_employee_id");
            localStorage.removeItem("onboarding-draft");
            localStorage.removeItem("employeeId");
            localStorage.removeItem("employeeUserId");
            localStorage.removeItem("onboardingEmployeeUserId");

            // Reset Redux state (will be handled by the initiate page)
            // Navigate to fresh onboarding
            navigate("/admin/employees/onboarding/initiate", {
              state: {
                isFreshStart: true,
              },
            });
          }}
        >
          <UserPlus size={16} />
          Initiate Now
        </button>
      </div>

      {/* Recent Onboarding Section */}
      <div className="mt-6 md:mt-8">
        <div className="flex flex-wrap justify-between items-center mb-4 md:mb-5">
          <h2 className="text-sm md:text-base font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <FileText size={18} className="text-gray-500" />
            Recent Onboarding Requests
          </h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Total: {recentOnboarding.length} records
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-soft">
          <div className="min-w-[900px] md:min-w-0">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Sl.No.
                  </th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Employee
                  </th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Designation
                  </th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Department
                  </th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Joining Date
                  </th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-right text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOnboarding.length > 0 ? (
                  recentOnboarding.map((item, idx) => {
                    const status = item.user?.status || item.status;
                    const isPending = isPendingOnboarding(status);

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
                          {idx + 1}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <div>
                            <p className="text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {getEmployeeName(item)}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                          {getDesignation(item)}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                          {getDepartment(item)}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <div className="flex items-center gap-1 md:gap-2">
                            <Calendar size={12} className="text-gray-400" />
                            <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {formatDate(item.joining_date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <span
                            className={`inline-flex px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold ${getStatusColor(status)} whitespace-nowrap`}
                          >
                            {getStatusLabel(status)}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* ─── VIEW BUTTON ────────────────────────────── */}
                            <button
                              onClick={() => handleView(item)}
                              title="View"
                              className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors flex items-center justify-center"
                            >
                              <Eye size={16} />
                            </button>

                            {/* ─── RESUME BUTTON (only for pending) ────────── */}
                            {isPending && (
                              <button
                                onClick={() => handleResume(item)}
                                title="Resume"
                                className="p-2 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600 transition-colors flex items-center justify-center"
                              >
                                <Play size={16} />
                              </button>
                            )}

                            {/* ─── DELETE BUTTON ───────────────────────────── */}
                            <button
                              onClick={() => handleDeleteClick(item)}
                              title="Delete"
                              className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors flex items-center justify-center"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No onboarding requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Tips Section */}
      <div className="mt-6 p-3 md:p-4 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-100 dark:border-green-900/50">
        <div className="flex items-start gap-2 md:gap-3">
          <ShieldCheck
            size={18}
            className="text-green-600 dark:text-green-400 mt-0.5"
          />
          <div>
            <h4 className="text-xs md:text-sm font-bold text-green-900 dark:text-green-300">
              Onboarding Best Practices
            </h4>
            <p className="text-[10px] md:text-xs text-green-700 dark:text-green-400 mt-1">
              Ensure all required documents are uploaded and verified. Complete
              salary configuration and bank details before the employee's
              joining date.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle
                    size={20}
                    className="text-red-600 dark:text-red-400"
                  />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Delete Onboarding Record
                </h3>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete the onboarding record for{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {getEmployeeName(selectedOnboarding)}
                </span>
                ? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedOnboarding(null);
                  }}
                  className="px-4 py-2 rounded-lg font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingDashboard;
