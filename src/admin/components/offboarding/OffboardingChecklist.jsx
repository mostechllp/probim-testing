import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Users,
  ShieldAlert,
  Monitor,
  ArrowRight,
  Save,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  X,
  FolderPlus,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "../common/Toast";
import OffboardingHeader from "./OffboardingHeader";
import OffboardingProgressBox from "./OffboardingProgressBox";
import { fetchOffboardingById, fetchOffboardingProgress } from "../../store/slices/offboardingSlice";
import { fetchEmployeeById } from "../../store/slices/employeeSlice";
import {
  fetchChecklists,
  createChecklist,
  updateChecklist,
  deleteChecklist,
  updateChecklistStatus,
  clearError,
} from "../../store/slices/checklistSlice";
import {
  fetchChecklistCategories,
  createChecklistCategory,
} from "../../store/slices/checklistCategorySlice";
import ConfirmModal from "../common/ConfirmModal";

// Assignee options
const ASSIGNEE_OPTIONS = [
  { id: "HR", label: "HR", color: "blue" },
  { id: "PRO", label: "PRO", color: "purple" },
  { id: "Finance", label: "Finance", color: "green" },
  { id: "IT", label: "IT", color: "orange" },
  { id: "Admin", label: "Admin", color: "gray" },
  { id: "Legal", label: "Legal", color: "red" },
];

// Helper function to get icon based on category name
const getCategoryIcon = (categoryName) => {
  const name = categoryName?.toLowerCase() || "";
  if (name.includes("hr") || name.includes("admin")) {
    return <Users size={18} className="text-gray-500 dark:text-gray-400" />;
  }
  if (name.includes("pro") || name.includes("government")) {
    return <ShieldAlert size={18} className="text-gray-500 dark:text-gray-400" />;
  }
  if (name.includes("finance") || name.includes("it")) {
    return <Monitor size={18} className="text-gray-500 dark:text-gray-400" />;
  }
  if (name.includes("asset") || name.includes("return")) {
    return <Monitor size={18} className="text-gray-500 dark:text-gray-400" />;
  }
  return <Users size={18} className="text-gray-500 dark:text-gray-400" />;
};

const OffboardingChecklist = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const offboardingId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  });
  const [formData, setFormData] = useState({
    task_name: "",
    responsible_role: "HR",
  });

  // Redux state
  const { currentOffboarding, loading: offboardingLoading, currentProgress } = useSelector(
    (state) => state.offboarding,
  );
  const { currentEmployee } = useSelector((state) => state.employees);
  const {
    checklists,
    loading: checklistLoading,
    error: checklistError,
  } = useSelector((state) => state.checklist);
  const { categories, loading: categoriesLoading } = useSelector(
    (state) => state.checklistCategory,
  );

  const [categorySections, setCategorySections] = useState([]);

  // Fetch categories and checklists on component mount
  useEffect(() => {
    if (offboardingId) {
      dispatch(fetchOffboardingById(offboardingId));
      dispatch(fetchOffboardingProgress(offboardingId));
      dispatch(fetchChecklistCategories());
      dispatch(fetchChecklists(offboardingId));
    } else {
      const storedOffboardingId = localStorage.getItem("offboarding_id");
      if (storedOffboardingId) {
        dispatch(fetchOffboardingById(storedOffboardingId));
        dispatch(fetchOffboardingProgress(storedOffboardingId));
        dispatch(fetchChecklistCategories());
        dispatch(fetchChecklists(storedOffboardingId));
      } else {
        setLoading(false);
        showToast(
          "No offboarding session found. Please start from initiation.",
          "warning",
        );
      }
    }
  }, [dispatch, offboardingId]);

  // Build category sections when categories and checklists are loaded
  // Filter out visa-related categories
  useEffect(() => {
    if (
      !categoriesLoading &&
      !checklistLoading
    ) {
      const safeCategories = categories || [];
      const safeChecklists = checklists || [];
      // Filter out categories that are visa-related
      const filteredCategories = safeCategories.filter((category) => {
        const name = category.name?.toLowerCase() || "";
        // Exclude visa cancellation, visa, cancellation related categories
        return !name.includes("visa") && !name.includes("cancellation");
      });

      const sections = filteredCategories.map((category) => ({
        id: category.id,
        title: category.name,
        icon: getCategoryIcon(category.name),
        tasks: safeChecklists
          .filter((task) => task.category_id === category.id)
          .map((task) => ({
            id: task.id,
            label: task.task_name,
            assignee: task.responsible_role,
            completed: task.status === "completed",
            notes: task.notes,
          })),
      }));
      setCategorySections(sections);
      setLoading(false);
    }
  }, [categories, checklists, categoriesLoading, checklistLoading]);

  // Load employee name
  useEffect(() => {
    if (currentOffboarding && !offboardingLoading) {
      if (currentOffboarding.employee_name) {
        setEmployeeName(currentOffboarding.employee_name);
      } else if (currentOffboarding.employee_id) {
        dispatch(fetchEmployeeById(currentOffboarding.employee_id));
      }
    }
  }, [currentOffboarding, offboardingLoading, dispatch]);

  useEffect(() => {
    if (currentEmployee) {
      setEmployeeName(
        `${currentEmployee.first_name} ${currentEmployee.last_name}`,
      );
    }
  }, [currentEmployee]);

  // Handle errors
  useEffect(() => {
    if (checklistError) {
      showToast(checklistError, "error");
      dispatch(clearError());
    }
  }, [checklistError, dispatch]);

  const resetForm = () => {
    setFormData({
      task_name: "",
      responsible_role: "HR",
    });
    setSelectedTask(null);
    setSelectedCategoryId(null);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: "",
      description: "",
      is_active: true,
    });
  };

  const handleAddCategory = async () => {
    if (!categoryFormData.name.trim()) {
      showToast("Please enter category name", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dispatch(
        createChecklistCategory(categoryFormData),
      ).unwrap();
      showToast("Category created successfully", "success");
      setShowCategoryModal(false);
      resetCategoryForm();
      dispatch(fetchChecklistCategories());
    } catch (err) {
      showToast(err?.message || "Failed to create category", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTask = async () => {
    if (!formData.task_name.trim()) {
      showToast("Please enter task name", "error");
      return;
    }
    if (!selectedCategoryId) {
      showToast("Please select a category", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(
        createChecklist({
          offboardingId: offboardingId || localStorage.getItem("offboarding_id"),
          checklistData: {
            category_id: selectedCategoryId,
            task_name: formData.task_name,
            responsible_role: formData.responsible_role,
            status: "pending",
            notes: null,
          },
        }),
      ).unwrap();

      showToast("Task added successfully", "success");
      setShowAddModal(false);
      resetForm();

      // Refresh checklists
      dispatch(
        fetchChecklists(
          offboardingId || localStorage.getItem("offboarding_id"),
        ),
      );
      // Refresh progress
      dispatch(
        fetchOffboardingProgress(
          offboardingId || localStorage.getItem("offboarding_id"),
        ),
      );
    } catch (err) {
      showToast(err || "Failed to add task", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTask = async () => {
    if (!formData.task_name.trim()) {
      showToast("Please enter task name", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(
        updateChecklist({
          checklistId: selectedTask.id,
          checklistData: {
            task_name: formData.task_name,
            responsible_role: formData.responsible_role,
          },
        }),
      ).unwrap();

      showToast("Task updated successfully", "success");
      setShowEditModal(false);
      resetForm();

      // Refresh checklists
      dispatch(
        fetchChecklists(
          offboardingId || localStorage.getItem("offboarding_id"),
        ),
      );
      // Refresh progress
      dispatch(
        fetchOffboardingProgress(
          offboardingId || localStorage.getItem("offboarding_id"),
        ),
      );
    } catch (err) {
      showToast(err || "Failed to update task", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTask = async (task) => {
    try {
      const newStatus = task.completed ? "pending" : "completed";
      await dispatch(
        updateChecklistStatus({
          checklistId: task.id,
          status: newStatus,
        }),
      ).unwrap();
      
      // Refresh progress after toggling
      dispatch(
        fetchOffboardingProgress(
          offboardingId || localStorage.getItem("offboarding_id"),
        ),
      );
    } catch (err) {
      showToast(err || "Failed to update task status", "error");
    }
  };

  const handleDeleteTask = async () => {
    setIsSubmitting(true);
    try {
      await dispatch(deleteChecklist(selectedTask.id)).unwrap();

      showToast("Task deleted successfully", "success");
      setShowDeleteConfirm(false);
      setSelectedTask(null);

      // Refresh checklists
      dispatch(
        fetchChecklists(
          offboardingId || localStorage.getItem("offboarding_id"),
        ),
      );
      // Refresh progress
      dispatch(
        fetchOffboardingProgress(
          offboardingId || localStorage.getItem("offboarding_id"),
        ),
      );
    } catch (err) {
      showToast(err || "Failed to delete task", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);

    try {
      showToast("Offboarding completed successfully!", "success");

      setTimeout(() => {
        navigate("/admin/employees/offboarding");
      }, 1000);
    } catch (error) {
      console.error("Save checklist error:", error);
      showToast(error || "Failed to save checklist. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate progress from API data
  const apiProgressPercentage = currentProgress?.progress_percentage || 0;
  const completedStepsFromApi = currentProgress?.completed_steps || 0;
  const totalStepsFromApi = currentProgress?.total_steps || 7;

  // Calculate local progress from tasks
  const allTasks = categorySections.flatMap((cat) => cat.tasks);
  const completedTasksCount = allTasks.filter((task) => task.completed).length;
  const totalTasks = allTasks.length;
  const localProgressPercentage =
    totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  // Use API progress if available, otherwise use local calculation
  const displayProgressPercentage = currentProgress ? apiProgressPercentage : localProgressPercentage;
  const displayCompletedSteps = currentProgress ? completedStepsFromApi : completedTasksCount;
  const displayTotalSteps = currentProgress ? totalStepsFromApi : totalTasks;

  const getAssigneeColor = (assignee) => {
    const colors = {
      HR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      PRO: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      Finance:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      IT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      Admin: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400",
      Legal: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[assignee] || colors.Admin;
  };

  // Loading state
  if (loading || offboardingLoading || checklistLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/40 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <OffboardingHeader currentStep={7} />
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400">
                Loading checklist...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <OffboardingHeader currentStep={7} />
        <OffboardingProgressBox currentStep={7} />

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-6 sm:p-8 space-y-8">
          {/* Header Title with Progress Summary */}
          <div className="space-y-4 border-b border-gray-100 dark:border-gray-700 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Offboarding checklist
                </h1>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">
                  {employeeName || "Employee"} checklist
                </p>
                {currentOffboarding && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Offboarding ID: {currentOffboarding.id}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold tracking-wider">
                  {displayCompletedSteps} of {displayTotalSteps} steps completed
                </span>
                <button
                  onClick={() => {
                    resetCategoryForm();
                    setShowCategoryModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 hover:bg-blue-600 transition-colors"
                >
                  <FolderPlus size={14} />
                  Add Category
                </button>
              </div>
            </div>


          </div>

          {/* Checklist Sections */}
          <div className="space-y-6">
            {categorySections.length > 0 ? (
              categorySections.map((category) => {
                const categoryCompleted = category.tasks.filter(
                  (t) => t.completed,
                ).length;
                const categoryTotal = category.tasks.length;
                const categoryProgress =
                  categoryTotal > 0
                    ? Math.round((categoryCompleted / categoryTotal) * 100)
                    : 0;

                return (
                  <section key={category.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                        {category.icon}
                        {category.title}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {categoryCompleted}/{categoryTotal} tasks
                        </span>
                        <button
                          onClick={() => {
                            resetForm();
                            setSelectedCategoryId(category.id);
                            setShowAddModal(true);
                          }}
                          className="p-1 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                          title="Add task"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Category Progress Bar */}
                    {categoryTotal > 0 && (
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 dark:bg-blue-600 transition-all duration-500 ease-out"
                          style={{ width: `${categoryProgress}%` }}
                        ></div>
                      </div>
                    )}

                    <div className="border border-gray-100 dark:border-gray-700/50 rounded-xl divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                      {category.tasks.length > 0 ? (
                        category.tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-center justify-between p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80 cursor-pointer ${task.completed ? "bg-gray-50/50 dark:bg-gray-800/40" : ""}`}
                          >
                            <div
                              className="flex items-center gap-3 flex-1"
                              onClick={() => handleToggleTask(task)}
                            >
                              <button
                                type="button"
                                className={`flex-shrink-0 transition-colors ${task.completed ? "text-green-500" : "text-gray-300 dark:text-gray-600 hover:text-green-500/50"}`}
                              >
                                {task.completed ? (
                                  <CheckCircle2
                                    size={20}
                                    className="fill-green-50 dark:fill-green-950/20"
                                  />
                                ) : (
                                  <Circle size={20} />
                                )}
                              </button>
                              <span
                                className={`text-sm font-medium transition-colors ${task.completed ? "text-gray-500 dark:text-gray-400 line-through decoration-gray-300 dark:decoration-gray-600" : "text-gray-900 dark:text-gray-100"}`}
                              >
                                {task.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pl-4">
                              <span
                                className={`px-2.5 py-1 rounded text-xs font-bold tracking-wide ${getAssigneeColor(task.assignee)}`}
                              >
                                {task.assignee}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedTask(task);
                                  setFormData({
                                    task_name: task.label,
                                    responsible_role: task.assignee,
                                  });
                                  setShowEditModal(true);
                                }}
                                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTask(task);
                                  setShowDeleteConfirm(true);
                                }}
                                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                          No tasks in this category. Click the "+" button to add
                          one.
                        </div>
                      )}
                    </div>
                  </section>
                );
              })
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
                <div className="flex flex-col items-center gap-4">
                  <p className="text-gray-500 dark:text-gray-400">
                    No checklist categories available. Please add categories
                    first.
                  </p>
                  <button
                    onClick={() => {
                      resetCategoryForm();
                      setShowCategoryModal(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold flex items-center gap-2 hover:bg-blue-600 transition-colors"
                  >
                    <FolderPlus size={16} />
                    Add Category
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          {categorySections.length > 0 && (
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => navigate("/admin/employees/offboarding")}
                className="px-6 py-2.5 rounded-full font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Complete Offboarding
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                Add Task
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={
                    categories.find((c) => c.id === selectedCategoryId)?.name ||
                    ""
                  }
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Task Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.task_name}
                  onChange={(e) =>
                    setFormData({ ...formData, task_name: e.target.value })
                  }
                  placeholder="Enter task description"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.responsible_role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      responsible_role: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  {ASSIGNEE_OPTIONS.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="px-4 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg font-semibold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Add Task"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                Edit Task
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Task Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.task_name}
                  onChange={(e) =>
                    setFormData({ ...formData, task_name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.responsible_role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      responsible_role: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  {ASSIGNEE_OPTIONS.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="px-4 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleEditTask}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg font-semibold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedTask(null);
        }}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Are you sure you want to delete "${selectedTask?.task_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={isSubmitting}
      />

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                Create New Category
              </h2>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  resetCategoryForm();
                }}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g., HR & Admin, Asset Return, IT Setup"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Description
                </label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Enter category description..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryFormData.is_active}
                    onChange={(e) =>
                      setCategoryFormData({
                        ...categoryFormData,
                        is_active: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active
                  </span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  resetCategoryForm();
                }}
                className="px-4 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg font-semibold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Create Category"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffboardingChecklist;