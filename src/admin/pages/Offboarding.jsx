import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ClipboardList,
  Package,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  Laptop,
  FileText,
  ShieldCheck,
  Briefcase,
  Calendar,
  UserCheck,
  Timer,
  DollarSign,
  Loader,
  AlertCircleIcon,
  Trash2,
  Play,
} from "lucide-react";
import { showToast } from "../../components/common/Toast";
import { fetchEmployees } from "../store/slices/employeeSlice";
import {
  deleteOffboarding,
  fetchAllOffboarding,
  fetchOffboardingById,
  fetchOffboardingProgress,
} from "../store/slices/offboardingSlice";

// Helper function to get step name
const getStepName = (stepKey) => {
  const stepMap = {
    initiation: "Initiation",
    visa_cancellation: "Visa Cancellation",
    checklist: "General Checklist",
    assets: "Asset Return",
    exit_interview: "Exit Interview",
    settlement: "Final Settlement",
    letters: "Letters & Documents",
  };
  return stepMap[stepKey] || stepKey || "Unknown";
};

const getStepIcon = (stepKey) => {
  switch (stepKey) {
    case "initiation":
      return <UserPlus size={14} />;
    case "visa_cancellation":
      return <ShieldCheck size={14} />;
    case "checklist":
      return <ClipboardList size={14} />;
    case "assets":
      return <Package size={14} />;
    case "exit_interview":
      return <MessageSquareIcon size={14} />;
    case "settlement":
      return <DollarSign size={14} />;
    case "letters":
      return <FileText size={14} />;
    default:
      return <Timer size={14} />;
  }
};

const MessageSquareIcon = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const OffboardingDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [stats, setStats] = useState({
    activeOffboarding: 0,
    pendingTasks: 0,
    completedThisMonth: 0,
    assetsToCollect: 0,
  });

  const [recentOffboarding, setRecentOffboarding] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState({});

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOffboarding, setSelectedOffboarding] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { categories } = useSelector((state) => state.checklistCategory);
  const { offboardings, loading: offboardingLoading } = useSelector(
    (state) => state.offboarding,
  );
  const { employees, loading: employeesLoading } = useSelector(
    (state) => state.employees,
  );

  // Build employee lookup map
  const employeeMap = React.useMemo(() => {
    const map = new Map();
    if (employees && employees.length > 0) {
      employees.forEach((emp) => {
        // Store by both id and employee_id
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

  // Handle delete click
  const handleDeleteClick = (offboarding) => {
    setSelectedOffboarding(offboarding);
    setShowDeleteModal(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedOffboarding) return;

    setDeleting(true);
    try {
      await dispatch(deleteOffboarding(selectedOffboarding.id)).unwrap();
      setShowDeleteModal(false);
      setSelectedOffboarding(null);
      // Refresh the list
      dispatch(fetchAllOffboarding({ page: 1, perPage: 50 }));
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeleting(false);
    }
  };

  // Fetch employees and offboarding data
  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchAllOffboarding({ page: 1, perPage: 50 }));
  }, [dispatch]);

  // Fetch progress for each offboarding record
  useEffect(() => {
    const fetchProgressForAll = async () => {
      if (offboardings && offboardings.length > 0) {
        const progressMap = {};
        for (const offboarding of offboardings) {
          try {
            const result = await dispatch(
              fetchOffboardingProgress(offboarding.id),
            ).unwrap();
            if (result) {
              progressMap[offboarding.id] = result;
            }
          } catch (error) {
            console.error(
              `Failed to fetch progress for offboarding ${offboarding.id}:`,
              error,
            );
          }
        }
        setProgressData(progressMap);
      }
    };

    fetchProgressForAll();
  }, [offboardings, dispatch]);

  // Process offboarding data
  useEffect(() => {
    if (!offboardingLoading && offboardings) {
      // Calculate stats
      const activeCount = offboardings.filter(
        (off) => off.status !== "completed" && off.status !== "cancelled",
      ).length;

      const completedCount = offboardings.filter(
        (off) => off.status === "completed",
      ).length;

      setStats({
        activeOffboarding: activeCount,
        pendingTasks: activeCount * 3,
        completedThisMonth: completedCount,
        assetsToCollect: activeCount * 2,
      });

      // Format recent offboarding data with employee names
      const formattedOffboardings = offboardings.map((off) => {
        // Try to find employee by various ID fields
        let employee = null;
        if (off.employee_id) {
          employee = employeeMap.get(String(off.employee_id));
        }

        // Get employee name from employee data or fallback to offboarding data
        let employeeName = "Unknown Employee";
        if (employee) {
          employeeName =
            employee.name || `${employee.first_name} ${employee.last_name}`;
        } else if (off.employee_name) {
          employeeName = off.employee_name;
        }

        // Get department
        let department = off.department || "-";
        if (employee && employee.department) {
          department = employee.department;
        }

        const progress = progressData[off.id];

        return {
          id: off.id,
          name: employeeName,
          employeeId: off.employee_id,
          department: department,
          lastDay: off.last_working_day,
          status: off.status,
          currentStep: off.current_step || "initiation",
          progressPercentage: progress?.progress_percentage || 0,
          completedSteps: progress?.completed_steps || 0,
          totalSteps: progress?.total_steps || 7,
          steps: progress?.steps || [],
        };
      });

      setRecentOffboarding(formattedOffboardings);
      setLoading(false);
    }
  }, [offboardings, offboardingLoading, employeeMap, progressData]);

  const offboardingCards = [
    {
      id: "initiate",
      title: "Initiate Offboarding",
      description:
        "Start the offboarding process for an employee. Fill in employee details, last working day, and separation type.",
      icon: <UserPlus size={28} />,
      path: "/admin/employees/offboarding-initiation",
      color: "blue",
      bgClass:
        "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
      buttonClass:
        "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50",
      stats: "Start new process",
      buttonText: "Initiate Now",
    },
    /*
    {
      id: "categories",
      title: "Checklist Categories",
      description:
        "Manage offboarding checklist categories. Create, edit, and organize tasks by categories.",
      icon: <ClipboardList size={28} />,
      path: "/admin/employees/checklist-categories",
      color: "green",
      bgClass:
        "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400",
      buttonClass:
        "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50",
      stats: `${categories?.length || 0} categories`,
      buttonText: "Manage Categories",
    },
    */
  ];

  const quickStats = [
    {
      label: "Active Offboarding",
      value: stats.activeOffboarding,
      icon: <Briefcase size={20} />,
      color: "blue",
      bgClass: "bg-blue-100 dark:bg-blue-900/30",
      textClass: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Pending Tasks",
      value: stats.pendingTasks,
      icon: <Clock size={20} />,
      color: "orange",
      bgClass: "bg-orange-100 dark:bg-orange-900/30",
      textClass: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Completed (Month)",
      value: stats.completedThisMonth,
      icon: <CheckCircle2 size={20} />,
      color: "green",
      bgClass: "bg-green-100 dark:bg-green-900/30",
      textClass: "text-green-600 dark:text-green-400",
    },
    {
      label: "Assets Pending",
      value: stats.assetsToCollect,
      icon: <Laptop size={20} />,
      color: "purple",
      bgClass: "bg-purple-100 dark:bg-purple-900/30",
      textClass: "text-purple-600 dark:text-purple-400",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "initiated":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case "in-progress":
      case "pending_visa":
      case "pending_checklist":
      case "pending_assets":
      case "pending_interview":
      case "pending_settlement":
      case "pending_letters":
        return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
      case "completed":
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status) => {
    if (status === "initiated") return "Initiated";
    if (status === "in-progress") return "In Progress";
    if (status === "pending_visa") return "Visa Pending";
    if (status === "pending_checklist") return "Checklist Pending";
    if (status === "pending_assets") return "Assets Pending";
    if (status === "pending_interview") return "Interview Pending";
    if (status === "pending_settlement") return "Settlement Pending";
    if (status === "pending_letters") return "Letters Pending";
    if (status === "completed") return "Completed";
    return status || "Unknown";
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

  const handleContinue = async (offboarding) => {
    // First fetch the offboarding progress to know which step to go to
    try {
      // Fetch progress to get current step
      const progress = await dispatch(
        fetchOffboardingProgress(offboarding.id),
      ).unwrap();

      if (progress) {
        // Determine which step is currently in progress or pending
        const steps = progress.steps || [];

        // Find the first step that is not completed (in_progress or pending)
        let currentStepKey = "initiation"; // default

        for (const step of steps) {
          if (step.status === "in_progress") {
            currentStepKey = step.key;
            break;
          }
        }

        // If no step is in_progress, find the first pending step
        if (currentStepKey === "initiation") {
          for (const step of steps) {
            if (step.status === "pending") {
              currentStepKey = step.key;
              break;
            }
          }
        }

        console.log("Current step to navigate:", currentStepKey);
        console.log("Progress steps:", steps);

        // Fetch full offboarding data
        const result = await dispatch(
          fetchOffboardingById(offboarding.id),
        ).unwrap();

        if (result) {
          // Navigate based on the current step from progress
          navigateToStep(currentStepKey, offboarding.id, result);
        }
      } else {
        // Fallback: use offboarding.currentStep if progress fetch fails
        const step = offboarding.currentStep || "initiation";
        const result = await dispatch(
          fetchOffboardingById(offboarding.id),
        ).unwrap();
        if (result) {
          navigateToStep(step, offboarding.id, result);
        }
      }
    } catch (error) {
      console.error("Failed to fetch offboarding details:", error);
      showToast("Failed to load offboarding details", "error");
    }
  };

  // Helper function to navigate to the correct step
  const navigateToStep = (stepKey, offboardingId, offboardingData) => {
    const basePath = "/admin/employees";
    const state = { offboardingData, id: offboardingId, isEdit: true };

    switch (stepKey) {
      case "initiation":
      case "initiated":
        navigate(`${basePath}/offboarding-initiation`, { state });
        break;
      case "visa":
      case "visa_cancellation":
        navigate(`${basePath}/visa-cancellation`, { state });
        break;
      case "checklist":
      case "general_checklist":
        navigate(`${basePath}/offboarding-checklist`, { state });
        break;
      case "assets":
      case "asset_return":
        navigate(`${basePath}/asset-return`, { state });
        break;
      case "interview":
      case "exit_interview":
        navigate(`${basePath}/exit-interview`, { state });
        break;
      case "settlement":
      case "final_settlement":
        navigate(`${basePath}/final-settlement`, { state });
        break;
      case "letters":
      case "letters_documents":
        navigate(`${basePath}/letters-and-clearance`, { state });
        break;
      default:
        // Default to initiation page
        navigate(`${basePath}/offboarding-initiation`, { state });
        break;
    }
  };

  if (loading || offboardingLoading) {
    return (
      <div className="w-full overflow-x-hidden">
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden">
      {/* Stats Cards */}
      <div className="stats-grid grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-5 mb-6">
        {quickStats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-5 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft"
          >
            <div className="flex justify-between items-start mb-2 md:mb-3">
              <div
                className={`w-10 h-10 md:w-12 md:h-12 ${stat.bgClass} rounded-xl flex items-center justify-center`}
              >
                {stat.icon}
              </div>
              <span
                className={`text-2xl md:text-3xl font-extrabold ${stat.textClass}`}
              >
                {stat.value}
              </span>
            </div>
            <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-lg md:text-2xl font-bold gradient-heading bg-clip-text text-transparent">
          Offboarding
        </h2>
      </div>

      {/* Main Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
        {offboardingCards.map((card) => (
          <div
            key={card.id}
            className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-soft transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            onClick={() => navigate(card.path)}
          >
            <div className="p-4 md:p-6">
              <div
                className={`w-12 h-12 md:w-14 md:h-14 ${card.bgClass} rounded-xl flex items-center justify-center mb-3 md:mb-4`}
              >
                {card.icon}
              </div>
              <h3 className="text-base md:text-xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">
                {card.title}
              </h3>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3 md:mb-4">
                {card.description}
              </p>
              <div className="flex items-center justify-between mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-100 dark:border-gray-700">
                <span className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {card.stats}
                </span>
                <button
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg ${card.buttonClass} font-semibold text-xs md:text-sm flex items-center gap-1 md:gap-2 transition-all group-hover:gap-2 md:group-hover:gap-3`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (card.path === "/admin/employees/offboarding-initiation") {
                      localStorage.removeItem("offboarding_id");
                      localStorage.removeItem("offboarding_draft");
                    }
                    navigate(card.path);
                  }}
                >
                  {card.buttonText}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Offboarding Section */}
      <div className="mt-6 md:mt-8">
        <div className="flex flex-wrap justify-between items-center mb-4 md:mb-5">
          <h2 className="text-sm md:text-base font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <FileText size={18} className="text-gray-500" />
            Recent Offboarding Requests
          </h2>
          <button
            onClick={() => {
              localStorage.removeItem("offboarding_id");
              localStorage.removeItem("offboarding_draft");
              navigate("/admin/employees/offboarding-initiation");
            }}
            className="text-xs md:text-sm font-semibold text-green-600 dark:text-green-400 hover:text-green-700 flex items-center gap-1"
          >
            View all
            <ArrowRight size={12} />
          </button>
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
                    Department
                  </th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Last Working Day
                  </th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Current Step
                  </th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Progress
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
                {recentOffboarding.length > 0 ? (
                  recentOffboarding.map((item, idx) => (
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
                            {item.name}
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
                            ID: {item.employeeId}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                        {item.department}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <div className="flex items-center gap-1 md:gap-2">
                          <Calendar size={12} className="text-gray-400" />
                          <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {formatDate(item.lastDay)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <div className="flex items-center gap-1 md:gap-2">
                          {getStepIcon(item.currentStep)}
                          <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {getStepName(item.currentStep)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <div className="flex flex-col gap-1 min-w-[100px]">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-500">
                              {item.completedSteps}/{item.totalSteps}
                            </span>
                            <span className="text-green-600">
                              {item.progressPercentage}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all duration-300"
                              style={{ width: `${item.progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <span
                          className={`inline-flex px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold ${getStatusColor(item.status)} whitespace-nowrap`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.status !== "completed" && (
                            <button
                              onClick={() => handleContinue(item)}
                              title="Continue"
                              className="p-2 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600 transition-colors flex items-center justify-center"
                            >
                              <Play size={16} className="ml-0.5" />
                            </button>
                          )}
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
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No offboarding requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Tips Section */}
      <div className="mt-6 p-3 md:p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50">
        <div className="flex items-start gap-2 md:gap-3">
          <ShieldCheck
            size={18}
            className="text-blue-600 dark:text-blue-400 mt-0.5"
          />
          <div>
            <h4 className="text-xs md:text-sm font-bold text-blue-900 dark:text-blue-300">
              Offboarding Best Practices
            </h4>
            <p className="text-[10px] md:text-xs text-blue-700 dark:text-blue-400 mt-1">
              Ensure all checklists are completed before final settlement.
              Assets must be returned and visa cancelled within 30 days of last
              working day as per UAE labor law.
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
                  <AlertCircleIcon
                    size={20}
                    className="text-red-600 dark:text-red-400"
                  />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Delete Offboarding Request
                </h3>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete the offboarding request for{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {selectedOffboarding?.name}
                </span>
                ? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedOffboarding(null);
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

export default OffboardingDashboard;
