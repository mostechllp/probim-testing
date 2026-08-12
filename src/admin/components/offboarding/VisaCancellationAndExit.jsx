import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Circle, ShieldAlert, ArrowRight, Save, Info, AlertTriangle, Plus, Edit2, Trash2, X, Check, FolderPlus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "../common/Toast";
import OffboardingHeader from "./OffboardingHeader";
import OffboardingProgressBox from "./OffboardingProgressBox";
import { fetchEmployeeById } from "../../store/slices/employeeSlice";
import { fetchOffboardingById, updateVisaStatus } from "../../store/slices/offboardingSlice";
import { fetchChecklists, createChecklist, updateChecklist, deleteChecklist, updateChecklistStatus, clearError } from "../../store/slices/checklistSlice";
import { fetchChecklistCategories } from "../../store/slices/checklistCategorySlice";
import ConfirmModal from "../common/ConfirmModal";

// Assignee options
const ASSIGNEE_OPTIONS = [
  { id: "PRO", label: "PRO", color: "purple" },
  { id: "HR", label: "HR", color: "blue" },
  { id: "Finance", label: "Finance", color: "green" },
  { id: "IT", label: "IT", color: "orange" },
  { id: "Admin", label: "Admin", color: "gray" },
  { id: "Legal", label: "Legal", color: "red" },
];

// Fixed category ID for visa cancellation - This should match your database
// Based on your earlier data, visa cancellation category has id: 2
const VISA_CATEGORY_ID = "1";

const VisaCancellationAndExit = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const offboardingId = searchParams.get("id");
  
  const [loading, setLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState(null);
  const [offboardingData, setOffboardingData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedCategoryId] = useState(VISA_CATEGORY_ID); // Fixed, not changeable
  const [formData, setFormData] = useState({
    task_name: "",
    responsible_role: "PRO",
  });
  
  // Redux state
  const { currentEmployee, loading: employeeLoading } = useSelector((state) => state.employees);
  const { currentOffboarding, loading: offboardingLoading } = useSelector((state) => state.offboarding);
  const { checklists, loading: checklistLoading, error: checklistError } = useSelector((state) => state.checklist);
  const { categories, loading: categoriesLoading } = useSelector((state) => state.checklistCategory);

  // Fetch offboarding details and checklists on component mount
  useEffect(() => {
    if (offboardingId) {
      dispatch(fetchOffboardingById(offboardingId));
      dispatch(fetchChecklists(offboardingId));
      dispatch(fetchChecklistCategories());
    } else {
      const storedOffboardingId = localStorage.getItem("offboarding_id");
      if (storedOffboardingId) {
        dispatch(fetchOffboardingById(storedOffboardingId));
        dispatch(fetchChecklists(storedOffboardingId));
        dispatch(fetchChecklistCategories());
      } else {
        setLoading(false);
        showToast("No offboarding session found. Please start from initiation.", "warning");
      }
    }
  }, [dispatch, offboardingId]);

  // After fetching checklists, add this useEffect
useEffect(() => {
  if (checklists && checklists.length > 0) {
    console.log("=== ALL CHECKLISTS FETCHED ===");
    console.log("Total checklists:", checklists.length);
    console.log("All checklists:", checklists);
    
    console.log("=== CATEGORY FILTERING ===");
    console.log("VISA_CATEGORY_ID:", VISA_CATEGORY_ID);
    
    const visaTasks = checklists.filter(task => String(task.category_id) === VISA_CATEGORY_ID);
    console.log("Visa tasks count:", visaTasks.length);
    console.log("Visa tasks:", visaTasks);
    
    const otherTasks = checklists.filter(task => String(task.category_id) !== VISA_CATEGORY_ID);
    console.log("Other tasks count:", otherTasks.length);
    console.log("Other tasks by category:", otherTasks.reduce((acc, task) => {
      const catId = task.category_id;
      if (!acc[catId]) acc[catId] = [];
      acc[catId].push(task);
      return acc;
    }, {}));
  }
}, [checklists]);

  // Load employee and offboarding data
  useEffect(() => {
    if (currentOffboarding && !offboardingLoading) {
      setOffboardingData(currentOffboarding);
      
      const employeeId = currentOffboarding.employee_id || localStorage.getItem("offboarding_employee_id");
      if (employeeId) {
        dispatch(fetchEmployeeById(employeeId));
      } else {
        setLoading(false);
      }
    }
  }, [currentOffboarding, offboardingLoading, dispatch]);

  // Update local state when employee data is loaded
  useEffect(() => {
    if (currentEmployee && !employeeLoading) {
      setEmployeeData(currentEmployee);
      setLoading(false);
    } else if (!employeeLoading && !currentEmployee && !offboardingLoading) {
      setLoading(false);
    }
  }, [currentEmployee, employeeLoading, offboardingLoading]);

  // Handle errors
  useEffect(() => {
    if (checklistError) {
      showToast(checklistError, "error");
      dispatch(clearError());
    }
  }, [checklistError, dispatch]);

  // Filter checklists for fixed visa category (id: 2)
  const visaChecklists = checklists.filter(task => {
    return String(task.category_id) === VISA_CATEGORY_ID;
  });

  // Calculate progress
  const completedTasks = visaChecklists.filter(t => t.status === "completed").length;
  const progressPercentage = visaChecklists.length > 0 ? Math.round((completedTasks / visaChecklists.length) * 100) : 0;

  // Get the visa category name for display
  const visaCategoryName = categories.find(c => String(c.id) === VISA_CATEGORY_ID)?.name || "Visa Cancellation";

  const resetForm = () => {
    setFormData({
      task_name: "",
      responsible_role: "PRO",
    });
    setSelectedTask(null);
  };

  const handleAddTask = async () => {
    if (!formData.task_name.trim()) {
      showToast("Please enter task name", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(createChecklist({
        offboardingId: offboardingId || localStorage.getItem("offboarding_id"),
        checklistData: {
          category_id: VISA_CATEGORY_ID,
          task_name: formData.task_name,
          responsible_role: formData.responsible_role,
          status: "pending",
          notes: null
        }
      })).unwrap();
      
      showToast("Task added successfully", "success");
      setShowAddModal(false);
      resetForm();
      
      // Refresh checklists
      dispatch(fetchChecklists(offboardingId || localStorage.getItem("offboarding_id")));
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
      await dispatch(updateChecklist({
        checklistId: selectedTask.id,
        checklistData: {
          task_name: formData.task_name,
          responsible_role: formData.responsible_role,
        }
      })).unwrap();
      
      showToast("Task updated successfully", "success");
      setShowEditModal(false);
      resetForm();
      
      // Refresh checklists
      dispatch(fetchChecklists(offboardingId || localStorage.getItem("offboarding_id")));
    } catch (err) {
      showToast(err || "Failed to update task", "error");
    } finally {
      setIsSubmitting(false);
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
      dispatch(fetchChecklists(offboardingId || localStorage.getItem("offboarding_id")));
    } catch (err) {
      showToast(err || "Failed to delete task", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTask = async (task) => {
    try {
      const newStatus = task.status === "completed" ? "pending" : "completed";
      await dispatch(updateChecklistStatus({
        checklistId: task.id,
        status: newStatus
      })).unwrap();
    } catch (err) {
      showToast(err || "Failed to update task status", "error");
    }
  };

  const handleUpdateVisaStatus = async () => {
    setIsSubmitting(true);
    
    try {
      const visaStatusData = {
        visa_tasks: visaChecklists.reduce((acc, task) => {
          acc[`task_${task.id}`] = task.status === "completed";
          return acc;
        }, {}),
        visa_status: visaChecklists.every(t => t.status === "completed") ? "completed" : "in_progress",
        updated_at: new Date().toISOString()
      };

      const result = await dispatch(updateVisaStatus({ 
        id: offboardingId || localStorage.getItem("offboarding_id"), 
        visaData: visaStatusData 
      })).unwrap();

      console.log("Visa status updated:", result);
      showToast("Visa status updated successfully", "success");
      
      setTimeout(() => {
        navigate(`/admin/employees/exit-interview?id=${offboardingId || localStorage.getItem("offboarding_id")}`);
      }, 1000);
    } catch (error) {
      console.error("Update visa status error:", error);
      showToast(error || "Failed to update visa status. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not available";
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const hasVisaDetails = employeeData?.visa_number || employeeData?.visa_expiry_date;
  const hasEidDetails = employeeData?.eid_number || employeeData?.eid_expiry_date;

  const getAssigneeColor = (assignee) => {
    const colors = {
      PRO: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      HR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      Finance: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      IT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      Admin: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400",
      Legal: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[assignee] || colors.Admin;
  };

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        <OffboardingHeader currentStep={2} />
        <OffboardingProgressBox currentStep={2} />

        {/* Warning Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start gap-3 shadow-sm">
          <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">Important Legal Notice</h3>
            <p className="text-sm text-amber-700 dark:text-amber-500 mt-1 font-medium">
              UAE law requires employer to cancel the work visa within 30 days of last working day. Failure may result in fines.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {(loading || offboardingLoading || employeeLoading || checklistLoading || categoriesLoading) ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading employee visa details...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-6 sm:p-8 space-y-8">
            
            {/* Header Title */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Visa cancellation & exit
                </h1>
                {employeeData && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Employee: {employeeData.first_name} {employeeData.last_name} ({employeeData.employee_id})
                  </p>
                )}
                {offboardingData && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Offboarding ID: {offboardingData.id}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 rounded text-xs font-bold">
                  {progressPercentage}% Complete
                </div>
                <span className="px-3 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/60 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  Action required
                </span>
              </div>
            </div>

            {/* Category Display (Non-editable) */}
            <div className="bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/50 rounded-xl p-4">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Category
              </label>
              <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-purple-500" />
                {visaCategoryName}
              </div>
            </div>

            {/* Visa & Residency Status Section */}
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert size={16} />
                Visa & Residency Status
              </h2>
              
              <div className="bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/50 rounded-xl p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Emirates ID number</span>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                      {employeeData?.eid_number || <span className="text-red-500">Not provided</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Emirates ID expiry</span>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {employeeData?.eid_expiry_date ? formatDate(employeeData.eid_expiry_date) : <span className="text-red-500">Not provided</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Visa number</span>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                      {employeeData?.visa_number || <span className="text-red-500">Not provided</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Visa expiry</span>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {employeeData?.visa_expiry_date ? formatDate(employeeData.visa_expiry_date) : <span className="text-red-500">Not provided</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Labour card number</span>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                      {employeeData?.labor_number || <span className="text-red-500">Not provided</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Visa type</span>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {employeeData?.visa_type || "Employment visa"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Dynamic Cancellation Tasks Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Cancellation Tasks
                </h2>
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold flex items-center gap-1 hover:bg-green-600 transition-colors"
                >
                  <Plus size={14} />
                  Add Task
                </button>
              </div>
              
              <div className="border border-gray-100 dark:border-gray-700/50 rounded-xl divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                {visaChecklists.length > 0 ? (
                  visaChecklists.map((task) => (
                    <div 
                      key={task.id} 
                      className={`flex items-center justify-between p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80 ${task.status === 'completed' ? 'bg-gray-50/50 dark:bg-gray-800/40' : ''}`}
                    >
                      <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => handleToggleTask(task)}>
                        <button 
                          type="button" 
                          className={`flex-shrink-0 transition-colors ${task.status === 'completed' ? 'text-green-500' : 'text-gray-300 dark:text-gray-600 hover:text-green-500/50'}`}
                        >
                          {task.status === 'completed' ? <CheckCircle2 size={20} className="fill-green-50 dark:fill-green-950/20" /> : <Circle size={20} />}
                        </button>
                        <span className={`text-sm font-medium transition-colors ${task.status === 'completed' ? 'text-gray-500 dark:text-gray-400 line-through decoration-gray-300 dark:decoration-gray-600' : 'text-gray-900 dark:text-gray-100'}`}>
                          {task.task_name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 pl-4">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold tracking-wide ${getAssigneeColor(task.responsible_role)}`}>
                          {task.responsible_role}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setFormData({ 
                              task_name: task.task_name, 
                              responsible_role: task.responsible_role 
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
                    No cancellation tasks added. Click "Add Task" to create one.
                  </div>
                )}
              </div>
            </section>

            {/* Progress Bar */}
            {visaChecklists.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-500 dark:text-gray-400 uppercase tracking-wide">Visa cancellation progress</span>
                  <span className="text-green-600 dark:text-green-400">{progressPercentage}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 dark:bg-green-600 transition-all duration-500 ease-out" 
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Footer Action */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={handleUpdateVisaStatus}
                disabled={isSubmitting || visaChecklists.length === 0}
                className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    Update visa status
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Add Cancellation Task</h2>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
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
                  value={visaCategoryName}
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
                  onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, responsible_role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  {ASSIGNEE_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="px-4 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
              <button onClick={handleAddTask} disabled={isSubmitting} className="px-4 py-2 rounded-lg font-semibold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50">
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Add Task"}
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
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Edit Task</h2>
              <button onClick={() => { setShowEditModal(false); resetForm(); }} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
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
                  onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.responsible_role}
                  onChange={(e) => setFormData({ ...formData, responsible_role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  {ASSIGNEE_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => { setShowEditModal(false); resetForm(); }} className="px-4 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
              <button onClick={handleEditTask} disabled={isSubmitting} className="px-4 py-2 rounded-lg font-semibold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50">
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setSelectedTask(null); }}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Are you sure you want to delete "${selectedTask?.task_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={isSubmitting}
      />
    </div>
  );
};

export default VisaCancellationAndExit;