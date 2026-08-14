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
import apiClient from "../../utils/apiClient";
import { fetchEmployees } from "../store/slices/employeeSlice";
import {
  deleteOffboarding,
  fetchAllOffboarding,
  fetchOffboardingById,
  fetchOffboardingProgress,
} from "../store/slices/offboardingSlice";

// Helper function to get step name
// Helper function to get step name
const getStepName = (stepKey) => {
  if (!stepKey) return "Unknown";

  const key = String(stepKey).toLowerCase();

  const stepMap = {
    initiation: "Initiation",
    initiated: "Initiation",
    asset: "Assets",
    assets: "Assets",
    asset_return: "Assets",
    settlement: "Settlement",
    final_settlement: "Settlement",
    visa: "Visa Cancel",
    visa_cancellation: "Visa Cancel",
    interview: "Interview",
    exit_interview: "Interview",
    letters: "Letters",
    letters_documents: "Letters",
    final_clearance: "Final Clearance",
    clearance: "Final Clearance",
    verification: "Final Clearance",
    checklist: "General Checklist",
    general_checklist: "General Checklist",
    completed: "Completed",
    // Additional step keys
    pending_visa: "Visa Cancel",
    pending_checklist: "General Checklist",
    pending_assets: "Assets",
    pending_interview: "Interview",
    pending_settlement: "Settlement",
    pending_letters: "Letters",
    "in-progress": "In Progress",
  };
  return stepMap[key] || stepKey;
};

const getStepIcon = (stepKey) => {
  if (!stepKey) return <Timer size={14} />;

  const key = String(stepKey).toLowerCase();

  if (["initiation", "initiated"].includes(key)) return <UserPlus size={14} />;
  if (["asset", "assets", "asset_return"].includes(key))
    return <Package size={14} />;
  if (["settlement", "final_settlement"].includes(key))
    return <DollarSign size={14} />;
  if (["visa", "visa_cancellation"].includes(key))
    return <ShieldCheck size={14} />;
  if (["interview", "exit_interview"].includes(key))
    return <MessageSquareIcon size={14} />;
  if (["letters", "letters_documents"].includes(key))
    return <FileText size={14} />;
  if (["final_clearance", "clearance", "verification"].includes(key))
    return <CheckCircle2 size={14} />;
  if (["checklist", "general_checklist"].includes(key))
    return <ClipboardList size={14} />;
  if (key === "completed") return <CheckCircle2 size={14} />;

  return <Timer size={14} />;
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
    total_offboarding: 0,
    pending_initiation: 0,
    in_progress: 0,
    completed_offboarding: 0,
    pending_asset_return: 0,
    pending_final_settlement: 0,
    pending_visa_cancellation: 0,
    pending_exit_interview: 0,
    pending_letters_documents: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get("/admin/offboarding/stats");
        if (
          response.data &&
          response.data.status === "success" &&
          response.data.data
        ) {
          setStats(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };
    fetchStats();
  }, []);

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

  // Track which offboarding IDs we have fetched progress for
  // Track which offboarding IDs we have fetched progress for
const fetchedProgressIds = React.useRef(new Set());

// Fetch progress for each offboarding record
useEffect(() => {
  const fetchProgressForAll = async () => {
    // ✅ FIX: Define progressMap inside the function
    const progressMap = {};
    
    if (offboardings && offboardings.length > 0) {
      for (const offboarding of offboardings) {
        try {
          // Check if we already have progress for this offboarding to avoid re-fetching
          if (fetchedProgressIds.current.has(offboarding.id)) continue;
          
          // Mark as fetching/fetched
          fetchedProgressIds.current.add(offboarding.id);

          const result = await dispatch(
            fetchOffboardingProgress(offboarding.id),
          ).unwrap();
          
          if (result) {
            // Create a new object instead of modifying the read-only result
            let processedResult = { ...result };

            // If steps is not an array, create a steps array
            if (!Array.isArray(processedResult.steps)) {
              // If steps is a number, create a default steps array
              const totalSteps = processedResult.steps || 7;
              const stepOrder = [
                "initiation",
                "checklist",
                "visa",
                "assets",
                "interview",
                "settlement",
                "letters",
              ];
              const currentStatus =
                processedResult.current_status || "initiation";
              const currentIndex = stepOrder.indexOf(currentStatus);

              processedResult.steps = stepOrder.map((stepKey, index) => {
                let status = "pending";
                if (index < currentIndex) {
                  status = "completed";
                } else if (index === currentIndex) {
                  status = "in_progress";
                }
                return {
                  key: stepKey,
                  status: status,
                  name: getStepName(stepKey),
                };
              });

              // Update total_steps if needed
              if (!processedResult.total_steps) {
                processedResult.total_steps = stepOrder.length;
              }
            }

            progressMap[offboarding.id] = processedResult;
          }
        } catch (error) {
          // Remove from set if failed so it can be retried if needed
          fetchedProgressIds.current.delete(offboarding.id);
          console.error(
            `Failed to fetch progress for offboarding ${offboarding.id}:`,
            error,
          );
          // Set default progress
          progressMap[offboarding.id] = {
            steps: [],
            progress_percentage: 0,
            completed_steps: 0,
            total_steps: 7,
            current_status: "initiation",
          };
        }
      }
    }
    
    // ✅ FIX: Set progress data after all fetches are complete
    setProgressData(progressMap);
  };

  fetchProgressForAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [offboardings, dispatch]);

  // Process offboarding data
  useEffect(() => {
    if (!offboardingLoading && offboardings) {
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

        const combinedStatus = progress?.status ?? off.status;
        let calculatedCurrentStep = off.current_step || "initiation";

        // ✅ FIX: Check if progress and steps exist and is an array
        if (progress && progress.steps) {
          // If steps is an array, use it
          if (Array.isArray(progress.steps) && progress.steps.length > 0) {
            const inProgressStep = progress.steps.find(
              (s) => s.status === "in_progress",
            );
            if (inProgressStep) {
              calculatedCurrentStep = inProgressStep.key;
            } else {
              const pendingStep = progress.steps.find(
                (s) => s.status === "pending",
              );
              if (pendingStep) {
                calculatedCurrentStep = pendingStep.key;
              } else if (
                progress.progress_percentage === 100 ||
                off.status === "completed"
              ) {
                calculatedCurrentStep = "Completed";
              }
            }
          } else if (typeof progress.steps === "number") {
            // If steps is a number, use current_status
            if (progress.current_status) {
              calculatedCurrentStep = progress.current_status;
            }
          }
        } else {
           if (progress?.progress_percentage === 100 || combinedStatus === "completed") calculatedCurrentStep = "Completed";
           else if (combinedStatus?.includes("visa")) calculatedCurrentStep = "visa";
           else if (combinedStatus?.includes("checklist")) calculatedCurrentStep = "checklist";
           else if (combinedStatus?.includes("asset")) calculatedCurrentStep = "assets";
           else if (combinedStatus?.includes("interview")) calculatedCurrentStep = "interview";
           else if (combinedStatus?.includes("settlement")) calculatedCurrentStep = "settlement";
           else if (combinedStatus?.includes("letter")) calculatedCurrentStep = "letters";
        }

        // Determine completed steps count
        let completedSteps = progress?.completed_steps || 0;
        let totalSteps = progress?.total_steps || 7;
        let progressPercentage = progress?.progress_percentage || 0;

        // If steps is a number and we have completed steps from progress
        if (typeof progress?.steps === "number" && progress?.completed_steps) {
          totalSteps = progress.steps;
          completedSteps = progress.completed_steps;
          progressPercentage = Math.round((completedSteps / totalSteps) * 100);
        }

        return {
          id: off.id,
          name: employeeName,
          employeeId: off.employee_id,
          department: department,
          lastDay: off.last_working_day,
          status: progress?.status ?? off.status,
          currentStep: calculatedCurrentStep,
          progressPercentage: progressPercentage,
          completedSteps: completedSteps,
          totalSteps: totalSteps,
          steps: Array.isArray(progress?.steps) ? progress.steps : [],
        };
      });

      setRecentOffboarding(formattedOffboardings);
      setLoading(false);
    }
  }, [offboardings, offboardingLoading, employeeMap, progressData]);

  const quickStats = [
    {
      label: "Total Offboarding",
      value: stats.total_offboarding,
      icon: <Briefcase size={20} />,
      bgClass: "bg-blue-100 dark:bg-blue-900/30",
      textClass: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Pending Initiation",
      value: stats.pending_initiation,
      icon: <UserPlus size={20} />,
      bgClass: "bg-orange-100 dark:bg-orange-900/30",
      textClass: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "In Progress",
      value: stats.in_progress,
      icon: <TrendingUp size={20} />,
      bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
      textClass: "text-yellow-600 dark:text-yellow-400",
    },
    {
      label: "Completed Offboarding",
      value: stats.completed_offboarding,
      icon: <CheckCircle2 size={20} />,
      bgClass: "bg-green-100 dark:bg-green-900/30",
      textClass: "text-green-600 dark:text-green-400",
    },
    {
      label: "Pending Asset Return",
      value: stats.pending_asset_return,
      icon: <Laptop size={20} />,
      bgClass: "bg-purple-100 dark:bg-purple-900/30",
      textClass: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Pending Final Settlement",
      value: stats.pending_final_settlement,
      icon: <DollarSign size={20} />,
      bgClass: "bg-teal-100 dark:bg-teal-900/30",
      textClass: "text-teal-600 dark:text-teal-400",
    },
    {
      label: "Pending Visa Cancellation",
      value: stats.pending_visa_cancellation,
      icon: <ShieldCheck size={20} />,
      bgClass: "bg-red-100 dark:bg-red-900/30",
      textClass: "text-red-600 dark:text-red-400",
    },
    {
      label: "Pending Exit Interview",
      value: stats.pending_exit_interview,
      icon: <MessageSquareIcon size={20} />,
      bgClass: "bg-indigo-100 dark:bg-indigo-900/30",
      textClass: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Pending Letters & Documents",
      value: stats.pending_letters_documents,
      icon: <FileText size={20} />,
      bgClass: "bg-pink-100 dark:bg-pink-900/30",
      textClass: "text-pink-600 dark:text-pink-400",
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
        // ✅ FIX: Create a copy of progress to work with
        let steps = [];

        // If steps is an array, use it
        if (Array.isArray(progress.steps)) {
          steps = progress.steps;
        }
        // If steps is a number (total steps), we need to construct steps array
        else if (typeof progress.steps === "number") {
          // Create a steps array based on the total steps
          const totalSteps = progress.steps || 7;
          // Get the current status to determine which step is active
          const currentStatus = progress.current_status || "initiation";

          // Define step order
          const stepOrder = [
            "initiation",
            "checklist",
            "visa",
            "assets",
            "interview",
            "settlement",
            "letters",
          ];

          // Find the index of the current step
          const currentIndex = stepOrder.indexOf(currentStatus);

          // Build steps array with statuses
          steps = stepOrder.map((stepKey, index) => {
            let status = "pending";
            if (index < currentIndex) {
              status = "completed";
            } else if (index === currentIndex) {
              status = "in_progress";
            }
            return {
              key: stepKey,
              status: status,
              name: getStepName(stepKey),
            };
          });
        } else {
          // Fallback: use default steps
          steps = [
            { key: "initiation", status: "pending", name: "Initiation" },
            { key: "checklist", status: "pending", name: "General Checklist" },
            { key: "visa", status: "pending", name: "Visa Cancel" },
            { key: "assets", status: "pending", name: "Assets" },
            { key: "interview", status: "pending", name: "Interview" },
            { key: "settlement", status: "pending", name: "Settlement" },
            { key: "letters", status: "pending", name: "Letters" },
          ];

          // If we have a current_status, update the steps
          if (progress.current_status) {
            const currentStatus = progress.current_status;
            let foundActive = false;
            for (const step of steps) {
              if (step.key === currentStatus) {
                step.status = "in_progress";
                foundActive = true;
              } else if (!foundActive) {
                step.status = "completed";
              }
            }
          }
        }

        console.log("Progress data:", progress);
        console.log("Steps array:", steps);

        // Determine which step is currently in progress or pending
        let currentStepKey = "initiation"; // default

        // Find the first step that is not completed (in_progress or pending)
        for (const step of steps) {
          if (step.status === "in_progress") {
            currentStepKey = step.key;
            break;
          }
        }

        // If no step is in_progress, find the first pending step
        if (currentStepKey === "initiation" && steps.length > 0) {
          for (const step of steps) {
            if (step.status === "pending") {
              currentStepKey = step.key;
              break;
            }
          }
        }

        // If still no step found, use the current_status from API
        if (currentStepKey === "initiation" && progress.current_status) {
          currentStepKey = progress.current_status;
        }

        console.log("Current step to navigate:", currentStepKey);

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
      <div className="stats-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5 mb-6">
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
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg md:text-2xl font-bold gradient-heading bg-clip-text text-transparent">
          Offboarding
        </h2>
        <button
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
          onClick={() => {
            localStorage.removeItem("offboarding_id");
            localStorage.removeItem("offboarding_draft");
            navigate("/admin/employees/offboarding-initiation");
          }}
        >
          <UserPlus size={16} />
          Initiate Now
        </button>
      </div>

      {/* Recent Offboarding Section */}
      <div className="mt-6 md:mt-8">
        <div className="flex flex-wrap justify-between items-center mb-4 md:mb-5">
          <h2 className="text-sm md:text-base font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <FileText size={18} className="text-gray-500" />
            Recent Offboarding Requests
          </h2>
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
