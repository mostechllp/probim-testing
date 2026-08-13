import { useState } from "react";
import { 
 Users, ShieldAlert, Monitor, 
  Plus, Edit2, Trash2, X, Building2, Laptop, Briefcase,
  AlertCircle, Search,} from "lucide-react";
import { Link } from "react-router-dom";
import { showToast } from "../common/Toast";

// Static assignee options
const ASSIGNEE_OPTIONS = [
  { id: "hr", label: "HR", icon: <Users size={14} />, color: "blue" },
  { id: "pro", label: "PRO", icon: <ShieldAlert size={14} />, color: "purple" },
  { id: "finance", label: "Finance", icon: <Briefcase size={14} />, color: "green" },
  { id: "it", label: "IT", icon: <Laptop size={14} />, color: "orange" },
  { id: "admin", label: "Admin", icon: <Building2 size={14} />, color: "gray" },
  { id: "legal", label: "Legal", icon: <ShieldAlert size={14} />, color: "red" },
  { id: "facility", label: "Facility", icon: <Building2 size={14} />, color: "teal" }
];

// Static category options
const CATEGORY_OPTIONS = [
  { id: "hr-admin", label: "HR & Admin", icon: <Users size={16} />, count: 0 },
  { id: "pro-gov", label: "PRO/Government", icon: <ShieldAlert size={16} />, count: 0 },
  { id: "fin-it", label: "Finance & IT", icon: <Monitor size={16} />, count: 0 },
  { id: "facility", label: "Facility Management", icon: <Building2 size={16} />, count: 0 },
  { id: "legal", label: "Legal", icon: <ShieldAlert size={16} />, count: 0 },
  { id: "security", label: "Security", icon: <ShieldAlert size={16} />, count: 0 }
];

const OffboardingChecklistManager = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  
  // Form state for add/edit
  const [formData, setFormData] = useState({
    label: "",
    category: "hr-admin",
    assignee: "",
    description: ""
  });

  const [categories, setCategories] = useState([
    {
      id: "hr-admin",
      title: "HR & Admin",
      icon: <Users size={18} className="text-gray-500 dark:text-gray-400" />,
      tasks: [
        { id: "hr-1", label: "Resignation letter received & acknowledged", assignee: "HR", assigneeId: "hr", checked: false, description: "Ensure resignation letter is properly documented and acknowledged by both parties" },
        { id: "hr-2", label: "Notice period confirmed", assignee: "HR", assigneeId: "hr", checked: false, description: "Confirm notice period as per employment contract" },
        { id: "hr-3", label: "HR exit interview scheduled", assignee: "HR", assigneeId: "hr", checked: false, description: "Schedule and conduct exit interview" },
        { id: "hr-4", label: "Experience & NOC letter prepared", assignee: "HR", assigneeId: "hr", checked: false, description: "Prepare experience certificate and NOC letter" },
      ]
    },
    {
      id: "pro-gov",
      title: "PRO/Government",
      icon: <ShieldAlert size={18} className="text-gray-500 dark:text-gray-400" />,
      tasks: [
        { id: "pro-1", label: "Visa cancellation submitted to GDRFA", assignee: "PRO", assigneeId: "pro", checked: false, description: "Submit visa cancellation request to GDRFA/ICP" },
        { id: "pro-2", label: "Labour card cancelled at MOHRE", assignee: "PRO", assigneeId: "pro", checked: false, description: "Cancel labour card through MOHRE system" },
        { id: "pro-3", label: "Exit permit issued (if required)", assignee: "PRO", assigneeId: "pro", checked: false, description: "Issue exit permit if employee is leaving the country" },
        { id: "pro-4", label: "Emirates ID returned/reported to ICP", assignee: "PRO", assigneeId: "pro", checked: false, description: "Return Emirates ID or report as lost to ICP" },
      ]
    },
    {
      id: "fin-it",
      title: "Finance & IT",
      icon: <Monitor size={18} className="text-gray-500 dark:text-gray-400" />,
      tasks: [
        { id: "fin-1", label: "Full & final settlement calculated", assignee: "Finance", assigneeId: "finance", checked: false, description: "Calculate final settlement including all dues" },
        { id: "fin-2", label: "WPS payroll deactivated", assignee: "Finance", assigneeId: "finance", checked: false, description: "Deactivate employee from WPS payroll system" },
        { id: "fin-3", label: "System access & email revoked", assignee: "IT", assigneeId: "it", checked: false, description: "Revoke all system access and deactivate email" },
        { id: "fin-4", label: "Company assets returned", assignee: "IT", assigneeId: "it", checked: false, description: "Ensure all company assets are returned" },
      ]
    }
  ]);

  // Calculate category counts
  const getCategoryCount = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.tasks.length : 0;
  };

  // Get assignee label by ID
  const getAssigneeLabel = (assigneeId) => {
    const assignee = ASSIGNEE_OPTIONS.find(a => a.id === assigneeId);
    return assignee ? assignee.label : assigneeId;
  };

  // Get assignee color
  const getAssigneeColor = (assigneeId) => {
    const assignee = ASSIGNEE_OPTIONS.find(a => a.id === assigneeId);
    const colors = {
      blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
      purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
      green: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
      gray: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400",
      red: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      teal: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
    };
    return colors[assignee?.color] || colors.gray;
  };

  // Filter tasks based on search and filters
  const getFilteredTasks = () => {
    let allTasks = [];
    categories.forEach(category => {
      category.tasks.forEach(task => {
        allTasks.push({ ...task, categoryId: category.id, categoryTitle: category.title });
      });
    });

    return allTasks.filter(task => {
      const matchesSearch = task.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategoryFilter === "all" || task.categoryId === selectedCategoryFilter;
      const matchesAssignee = selectedAssigneeFilter === "all" || task.assigneeId === selectedAssigneeFilter;
      return matchesSearch && matchesCategory && matchesAssignee;
    });
  };

  // Add new task
  const handleAddTask = () => {
    if (!formData.label.trim()) {
      showToast("Please enter task label", "error");
      return;
    }
    if (!formData.assignee) {
      showToast("Please assign a responsible party", "error");
      return;
    }

    const newTask = {
      // eslint-disable-next-line react-hooks/purity
      id: `${formData.category}-${Date.now()}`,
      label: formData.label,
      assignee: getAssigneeLabel(formData.assignee),
      assigneeId: formData.assignee,
      checked: false,
      description: formData.description || ""
    };

    setCategories(categories.map(cat => {
      if (cat.id === formData.category) {
        return {
          ...cat,
          tasks: [...cat.tasks, newTask]
        };
      }
      return cat;
    }));

    showToast("Task added successfully", "success");
    setShowAddModal(false);
    resetForm();
  };

  // Edit task
  const handleEditTask = () => {
    if (!formData.label.trim()) {
      showToast("Please enter task label", "error");
      return;
    }

    setCategories(categories.map(cat => {
      if (cat.id === formData.category) {
        return {
          ...cat,
          tasks: cat.tasks.map(task => {
            if (task.id === selectedTask.id) {
              return {
                ...task,
                label: formData.label,
                assignee: getAssigneeLabel(formData.assignee),
                assigneeId: formData.assignee,
                description: formData.description || ""
              };
            }
            return task;
          })
        };
      }
      return cat;
    }));

    showToast("Task updated successfully", "success");
    setShowEditModal(false);
    resetForm();
  };

  // Delete task
  const handleDeleteTask = () => {
    setCategories(categories.map(cat => {
      if (cat.id === selectedTask.categoryId) {
        return {
          ...cat,
          tasks: cat.tasks.filter(task => task.id !== selectedTask.id)
        };
      }
      return cat;
    }));

    showToast("Task deleted successfully", "success");
    setShowDeleteConfirm(false);
    setSelectedTask(null);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      label: "",
      category: "hr-admin",
      assignee: "",
      description: ""
    });
    setSelectedTask(null);
  };

  // Open edit modal
  const openEditModal = (task) => {
    setSelectedTask(task);
    setFormData({
      label: task.label,
      category: task.categoryId,
      assignee: task.assigneeId,
      description: task.description || ""
    });
    setShowEditModal(true);
  };

  // Open delete confirm
  const openDeleteConfirm = (task) => {
    setSelectedTask(task);
    setShowDeleteConfirm(true);
  };

  const filteredTasks = getFilteredTasks();
  const start = (currentPage - 1) * perPage;
  const pageTasks = filteredTasks.slice(start, start + perPage);

  // Calculate stats
  const totalAllTasks = categories.reduce((sum, cat) => sum + cat.tasks.length, 0);



  return (
    <div className="w-full overflow-x-hidden">
      <div className="flex items-center gap-2 text-xs md:text-sm mb-4 md:mb-6 flex-wrap">
        <Link
          to="/admin/employees/offboarding"
          className="text-green-500 hover:text-green-600 font-medium"
        >
          Offboarding
        </Link>
        <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
        <span className="text-gray-500 dark:text-gray-400">
          Final Clearance
        </span>
      </div>
      {/* Page Header */}

      <div className="flex flex-wrap justify-between items-center mb-4 md:mb-6">
        <h2 className="text-lg md:text-2xl font-bold gradient-heading bg-clip-text text-transparent">
          Final Clearance Manager
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
        >
          <Plus size={18} />
          Add New Task
        </button>
      </div>

      {/* Category Tabs */}
      <div className="overflow-x-auto pb-2 mb-4 md:mb-5 -mx-4 px-4">
        <div className="flex gap-2 min-w-max border-b border-gray-200 dark:border-gray-700 pb-3">
          <button
            onClick={() => {
              setSelectedCategoryFilter("all");
              setCurrentPage(1);
            }}
            className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
              selectedCategoryFilter === "all"
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <i className="fas fa-folder-open mr-1 text-[10px] md:text-xs"></i>
            All Tasks
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
              {totalAllTasks}
            </span>
          </button>
          {CATEGORY_OPTIONS.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategoryFilter(category.id);
                setCurrentPage(1);
              }}
              className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                selectedCategoryFilter === category.id
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category.icon}
              <span className="hidden sm:inline ml-1">{category.label}</span>
              <span className="sm:hidden">{category.label.split(' ')[0]}</span>
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {getCategoryCount(category.id)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-5">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
          />
        </div>
        
        <select
          value={selectedAssigneeFilter}
          onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
        >
          <option value="all">All Assignees</option>
          {ASSIGNEE_OPTIONS.map(assignee => (
            <option key={assignee.id} value={assignee.id}>{assignee.label}</option>
          ))}
        </select>
      </div>

      {/* Tasks Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-soft">
        <div className="min-w-[800px] md:min-w-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">Sl.No.</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">Task</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">Category</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">Assigned To</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-right text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">Actions</th>
               </tr>
            </thead>
            <tbody>
              {pageTasks.length > 0 ? (
                pageTasks.map((task, idx) => (
                  <tr key={task.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
                      {start + idx + 1}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <div>
                        <p className="text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200">{task.label}</p>
                        {task.description && (
                          <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                        {task.categoryTitle}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold ${getAssigneeColor(task.assigneeId)}`}>
                        {ASSIGNEE_OPTIONS.find(a => a.id === task.assigneeId)?.icon}
                        {task.assignee}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-right">
                      <div className="flex items-center justify-end gap-1 md:gap-2">
                        <button
                          onClick={() => openEditModal(task)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Edit task"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(task)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No tasks found. Click "Add New Task" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Add New Task</h2>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Task Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Enter task description"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.assignee}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  <option value="">Select assignee</option>
                  {ASSIGNEE_OPTIONS.map(assignee => (
                    <option key={assignee.id} value={assignee.id}>{assignee.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Add detailed instructions..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="px-4 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={handleAddTask} className="px-4 py-2 rounded-lg font-semibold bg-green-500 text-white hover:bg-green-600">
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Edit Task</h2>
              <button onClick={() => { setShowEditModal(false); resetForm(); }} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Task Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.assignee}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  <option value="">Select assignee</option>
                  {ASSIGNEE_OPTIONS.map(assignee => (
                    <option key={assignee.id} value={assignee.id}>{assignee.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => { setShowEditModal(false); resetForm(); }} className="px-4 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={handleEditTask} className="px-4 py-2 rounded-lg font-semibold bg-green-500 text-white hover:bg-green-600">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Delete Task</h2>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to delete "<span className="font-bold">{selectedTask.label}</span>"?
              </p>

              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setSelectedTask(null); }} className="px-4 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">
                  Cancel
                </button>
                <button onClick={handleDeleteTask} className="px-4 py-2 rounded-lg font-semibold bg-red-500 text-white hover:bg-red-600">
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default OffboardingChecklistManager;