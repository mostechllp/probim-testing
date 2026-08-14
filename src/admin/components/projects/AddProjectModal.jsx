import React, { useState, useEffect } from "react";
import { PROJECT_MODULE_NAME } from "../../utils/constants";
import apiClient from "../../../utils/apiClient";

// Currency options
const CURRENCY_OPTIONS = [
  { value: "AED", label: "AED - UAE Dirham" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "SAR", label: "SAR - Saudi Riyal" },
  { value: "KWD", label: "KWD - Kuwaiti Dinar" },
  { value: "BHD", label: "BHD - Bahraini Dinar" },
  { value: "OMR", label: "OMR - Omani Rial" },
  { value: "QAR", label: "QAR - Qatari Riyal" },
];

const AddProjectModal = ({
  isOpen,
  employees = [],
  onClose,
  onSave,
  project,
  actionLoading,
  validationErrors = null,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Active");
  const [managerId, setManagerId] = useState("");
  const [teamLeadId, setTeamLeadId] = useState("");
  const [totalHours, setTotalHours] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [currency, setCurrency] = useState("AED");
  const [error, setError] = useState("");
  const [eligibleManagers, setEligibleManagers] = useState([]);
  const [eligibleTeamLeads, setEligibleTeamLeads] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [loadingTeamLeads, setLoadingTeamLeads] = useState(false);

  const isEditMode = !!project;

  useEffect(() => {
    const fetchEligibleUsers = async () => {
      if (!isOpen) return;

      // Fetch eligible managers
      setLoadingManagers(true);
      try {
        const response = await apiClient.get(
          "/admin/projects/eligible-managers",
        );
        if (response.data && response.data.status === "success") {
          const managers = (response.data.data || []).map((emp) => {
            return {
              ...emp,
              id: emp.user_id,
              original_employee_id: emp.id,
            };
          });
          setEligibleManagers(managers);
        }
      } catch (err) {
        console.error("Failed to fetch eligible managers:", err);
      } finally {
        setLoadingManagers(false);
      }

      // Fetch eligible team leads
      setLoadingTeamLeads(true);
      try {
        const response = await apiClient.get(
          "/admin/projects/eligible-team-leads",
        );
        if (response.data && response.data.status === "success") {
          const teamLeads = (response.data.data || []).map((emp) => {
            return {
              ...emp,
              id: emp.user_id,
              original_employee_id: emp.id,
            };
          });
          setEligibleTeamLeads(teamLeads);
        }
      } catch (err) {
        console.error("Failed to fetch eligible team leads:", err);
      } finally {
        setLoadingTeamLeads(false);
      }
    };

    fetchEligibleUsers();
  }, [isOpen]);

  const getFieldError = (field) => {
    if (!validationErrors || !validationErrors[field]) return null;
    const errors = validationErrors[field];
    return Array.isArray(errors) ? errors[0] : errors;
  };

  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setStatus(project.status || "Active");
      setManagerId(project.managerId || project.project_manager_id || "");
      setTeamLeadId(project.teamLeadId || project.team_lead_id || "");
      setTotalHours(project.totalHours || project.total_hours || "");
      setTotalCost(project.totalCost || project.total_cost || "");
      setCurrency(project.currency || "AED");
      setError("");
    } else {
      setName("");
      setDescription("");
      setStatus("Active");
      setManagerId("");
      setTeamLeadId("");
      setTotalHours("");
      setTotalCost("");
      setCurrency("AED");
      setError("");
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(`${PROJECT_MODULE_NAME} Name is required.`);
      return;
    }

    if (trimmedName.length < 3) {
      setError(`${PROJECT_MODULE_NAME} Name must be at least 3 characters.`);
      return;
    }

    const hours = parseFloat(totalHours);
    if (totalHours && (isNaN(hours) || hours < 0)) {
      setError("Total Hours must be a valid positive number.");
      return;
    }

    const cost = parseFloat(totalCost);
    if (totalCost && (isNaN(cost) || cost < 0)) {
      setError("Total Cost must be a valid positive number.");
      return;
    }

    onSave({
      id: project?.id,
      name: trimmedName,
      description: description.trim(),
      status: status,
      project_manager_id: managerId ? Number(managerId) : null,
      team_lead_id: teamLeadId ? Number(teamLeadId) : null,
      total_hours: totalHours ? parseFloat(totalHours) : null,
      total_cost: totalCost ? parseFloat(totalCost) : null,
      currency: currency,
    });
  };

  // Helper function to render select options
  const renderEmployeeOptions = (employees, loading) => {
    if (loading) {
      return (
        <option value="" disabled className="text-gray-400">
          Loading...
        </option>
      );
    }

    if (employees.length === 0) {
      return (
        <option value="" disabled className="text-gray-400">
          No eligible employees found
        </option>
      );
    }

    return employees.map((emp) => (
      <option key={emp.id} value={emp.id}>
        {emp.full_name ||
          emp.name ||
          `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
          `Employee #${emp.id}`}
        
      </option>
    ));
  };

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-[1100] p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-soft-lg border border-gray-150 dark:border-gray-700/60 overflow-hidden transform scale-100 transition-all duration-300 max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/20 flex-shrink-0">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
              <i
                className={
                  isEditMode
                    ? "fas fa-pencil-alt text-sm"
                    : "fas fa-plus text-sm"
                }
              ></i>
            </div>
            {isEditMode
              ? `Edit ${PROJECT_MODULE_NAME}`
              : `Add New ${PROJECT_MODULE_NAME}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 transition-colors w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold rounded-xl flex items-center gap-2.5">
                <i className="fas fa-triangle-exclamation"></i>
                <span>{error}</span>
              </div>
            )}

            {/* Project Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                {PROJECT_MODULE_NAME} Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={`Enter project title (e.g. Mobile Client App)`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                required
                disabled={actionLoading}
                className={`w-full px-4 py-2.5 text-sm rounded-xl border ${getFieldError("name") ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 dark:border-gray-600 focus:ring-green-500/20 focus:border-green-500"} bg-transparent text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 disabled:opacity-60 transition-all placeholder:text-gray-400`}
              />
              {getFieldError("name") && (
                <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                  <i className="fas fa-exclamation-circle text-[10px]"></i>
                  {getFieldError("name")}
                </p>
              )}
            </div>

            {/* Project Manager */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                Project Manager
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                disabled={actionLoading || loadingManagers}
                className={`w-full px-4 py-2.5 text-sm rounded-xl border ${getFieldError("project_manager_id") ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 dark:border-gray-600 focus:ring-green-500/20 focus:border-green-500"} bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 disabled:opacity-60 transition-all cursor-pointer`}
              >
                <option value="" className="text-gray-400">
                  {loadingManagers ? "Loading managers..." : "Select Project Manager"}
                </option>
                {!loadingManagers && renderEmployeeOptions(eligibleManagers, loadingManagers)}
              </select>
              {getFieldError("project_manager_id") && (
                <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                  <i className="fas fa-exclamation-circle text-[10px]"></i>
                  {getFieldError("project_manager_id")}
                </p>
              )}
            </div>

            {/* Team Lead */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                Team Lead
              </label>
              <select
                value={teamLeadId}
                onChange={(e) => setTeamLeadId(e.target.value)}
                disabled={actionLoading || loadingTeamLeads}
                className={`w-full px-4 py-2.5 text-sm rounded-xl border ${getFieldError("team_lead_id") ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 dark:border-gray-600 focus:ring-green-500/20 focus:border-green-500"} bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 disabled:opacity-60 transition-all cursor-pointer`}
              >
                <option value="" className="text-gray-400">
                  {loadingTeamLeads ? "Loading team leads..." : "Select Team Lead"}
                </option>
                {!loadingTeamLeads && renderEmployeeOptions(eligibleTeamLeads, loadingTeamLeads)}
              </select>
              {getFieldError("team_lead_id") && (
                <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                  <i className="fas fa-exclamation-circle text-[10px]"></i>
                  {getFieldError("team_lead_id")}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                Description{" "}
                <span className="text-gray-300 dark:text-gray-500 font-normal lowercase italic">
                  (optional)
                </span>
              </label>
              <textarea
                placeholder={`Provide a comprehensive summary of the project goals, scopes, or outcomes...`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={actionLoading}
                rows={4}
                className={`w-full px-4 py-2.5 text-sm rounded-xl border ${getFieldError("description") ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 dark:border-gray-600 focus:ring-green-500/20 focus:border-green-500"} bg-transparent text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 disabled:opacity-60 transition-all placeholder:text-gray-400 resize-none leading-relaxed`}
              />
              {getFieldError("description") && (
                <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                  <i className="fas fa-exclamation-circle text-[10px]"></i>
                  {getFieldError("description")}
                </p>
              )}
            </div>

            {/* Total Hours & Total Cost - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total Hours */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                  Total Hours
                  <span className="text-gray-300 dark:text-gray-500 font-normal lowercase italic ml-1">
                    (optional)
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 150.5"
                  value={totalHours}
                  onChange={(e) => {
                    setTotalHours(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={actionLoading}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border ${getFieldError("total_hours") ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 dark:border-gray-600 focus:ring-green-500/20 focus:border-green-500"} bg-transparent text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 disabled:opacity-60 transition-all placeholder:text-gray-400`}
                />
                {getFieldError("total_hours") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                    <i className="fas fa-exclamation-circle text-[10px]"></i>
                    {getFieldError("total_hours")}
                  </p>
                )}
              </div>

              {/* Total Cost with Currency */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                  Total Cost
                  <span className="text-gray-300 dark:text-gray-500 font-normal lowercase italic ml-1">
                    (optional)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 25000.00"
                    value={totalCost}
                    onChange={(e) => {
                      setTotalCost(e.target.value);
                      if (error) setError("");
                    }}
                    disabled={actionLoading}
                    className={`w-2/3 px-4 py-2.5 text-sm rounded-xl border ${getFieldError("total_cost") ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 dark:border-gray-600 focus:ring-green-500/20 focus:border-green-500"} bg-transparent text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 disabled:opacity-60 transition-all placeholder:text-gray-400`}
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    disabled={actionLoading}
                    className="w-1/3 px-2 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 disabled:opacity-60 transition-all cursor-pointer"
                  >
                    {CURRENCY_OPTIONS.map((curr) => (
                      <option key={curr.value} value={curr.value}>
                        {curr.value}
                      </option>
                    ))}
                  </select>
                </div>
                {getFieldError("total_cost") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                    <i className="fas fa-exclamation-circle text-[10px]"></i>
                    {getFieldError("total_cost")}
                  </p>
                )}
              </div>
            </div>

            {/* Form Footer Actions - Inside scrollable area */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/60">
              <button
                type="button"
                onClick={onClose}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-full border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-full bg-green-500 hover:bg-green-600 disabled:bg-green-500/70 text-white text-sm font-bold flex items-center gap-2 shadow-soft hover:shadow-soft-lg transform hover:-translate-y-0.5 disabled:transform-none transition-all"
              >
                {actionLoading ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    {isEditMode ? "Save Changes" : "Create Project"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProjectModal;