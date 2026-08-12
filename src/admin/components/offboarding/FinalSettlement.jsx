import React, { useState, useEffect } from "react";
import { Info, Check, X, ArrowRight, DollarSign, Loader, Plus, Edit, Trash2, Save } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "../common/Toast";
import OffboardingHeader from "./OffboardingHeader";
import OffboardingProgressBox from "./OffboardingProgressBox";
import { fetchOffboardingById, updateSettlement, fetchOffboardingProgress } from "../../store/slices/offboardingSlice";
import { fetchEmployeeById } from "../../store/slices/employeeSlice";
import ConfirmModal from "../common/ConfirmModal";
import apiClient from "../../../utils/apiClient";

const FinalSettlement = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const offboardingId = searchParams.get("id");
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeData, setEmployeeData] = useState(null);
  const [salaryComponents, setSalaryComponents] = useState([]);
  const [editingComponent, setEditingComponent] = useState(null);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [newComponent, setNewComponent] = useState({
    component_name: "",
    value: ""
  });
  const [settlementData, setSettlementData] = useState({
    loanRecovery: 0,
    noticeShortfall: 0,
    otherDeductions: 0,
    otherAdditions: 0,
    netPayable: 0,
    status: "pending",
    approvedBy: null,
    approvedAt: null
  });
  
  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    componentId: null,
    componentName: "",
    loading: false
  });
  
  // Redux state
  const { currentOffboarding, loading: offboardingLoading, currentProgress } = useSelector((state) => state.offboarding);
  const { currentEmployee } = useSelector((state) => state.employees);

  // Fetch offboarding details on component mount
  useEffect(() => {
    if (offboardingId) {
      dispatch(fetchOffboardingById(offboardingId));
      dispatch(fetchOffboardingProgress(offboardingId));
    } else {
      const storedOffboardingId = localStorage.getItem("offboarding_id");
      if (storedOffboardingId) {
        dispatch(fetchOffboardingById(storedOffboardingId));
        dispatch(fetchOffboardingProgress(storedOffboardingId));
      } else {
        setLoading(false);
        showToast("No offboarding session found. Please start from initiation.", "warning");
      }
    }
  }, [dispatch, offboardingId]);

  // Fetch employee data
  useEffect(() => {
    if (currentOffboarding && currentOffboarding.employee_id) {
      dispatch(fetchEmployeeById(currentOffboarding.employee_id));
    }
  }, [currentOffboarding, dispatch]);

  // Load settlement data from API
  useEffect(() => {
    if (currentOffboarding && !offboardingLoading) {
      // Load employee name
      if (currentOffboarding.employee_name) {
        setEmployeeName(currentOffboarding.employee_name);
      }
      
      // Load settlement data from API if available
      if (currentOffboarding.settlement) {
        setSettlementData({
          loanRecovery: currentOffboarding.settlement.loan_recovery || 0,
          noticeShortfall: currentOffboarding.settlement.notice_shortfall || 0,
          otherDeductions: currentOffboarding.settlement.other_deductions || 0,
          otherAdditions: currentOffboarding.settlement.other_additions || 0,
          netPayable: currentOffboarding.settlement.net_payable || 0,
          status: currentOffboarding.settlement.status || "pending",
          approvedBy: currentOffboarding.settlement.approved_by || null,
          approvedAt: currentOffboarding.settlement.approved_at || null
        });
      }
      
      setLoading(false);
    }
  }, [currentOffboarding, offboardingLoading]);

  // Load salary components from employee data
  useEffect(() => {
    if (currentEmployee) {
      setEmployeeName(`${currentEmployee.first_name} ${currentEmployee.last_name}`);
      setEmployeeData(currentEmployee);
      
      // Load salary components
      if (currentEmployee.salary_components && currentEmployee.salary_components.length > 0) {
        setSalaryComponents(currentEmployee.salary_components);
      }
    }
  }, [currentEmployee]);

  // Calculate net payable whenever components or deductions change
  useEffect(() => {
    const totalSalary = salaryComponents.reduce((sum, comp) => sum + parseFloat(comp.value), 0);
    const totalDeductions = settlementData.loanRecovery + settlementData.noticeShortfall + settlementData.otherDeductions;
    const netPayable = totalSalary - totalDeductions + settlementData.otherAdditions;
    
    setSettlementData(prev => ({
      ...prev,
      netPayable: Math.round(netPayable)
    }));
  }, [salaryComponents, settlementData.loanRecovery, settlementData.noticeShortfall, settlementData.otherDeductions, settlementData.otherAdditions]);

  // Show delete confirmation modal
  const handleDeleteClick = (componentId, componentName) => {
    setConfirmModal({
      isOpen: true,
      componentId: componentId,
      componentName: componentName,
      loading: false
    });
  };

  // Close confirm modal
  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      componentId: null,
      componentName: "",
      loading: false
    });
  };

  // Execute delete after confirmation
  const executeDelete = async () => {
    const { componentId, componentName } = confirmModal;
    
    setConfirmModal(prev => ({ ...prev, loading: true }));
    
    try {
      // Get current components and filter out the deleted one
      const updatedComponents = salaryComponents.filter(comp => comp.id !== componentId);
      
      // Calculate totals
      const totalSalary = updatedComponents.reduce((sum, comp) => sum + parseFloat(comp.value), 0);
      
      // Find basic salary component
      const basicComponent = updatedComponents.find(comp =>
        comp.component_name.toLowerCase().includes("basic")
      );
      
      const basicSalary = basicComponent ? basicComponent.value : updatedComponents[0]?.value || "0";
      const otherAllowance = updatedComponents
        .filter(comp => !comp.component_name.toLowerCase().includes("basic"))
        .reduce((sum, comp) => sum + parseFloat(comp.value), 0);
      
      // Prepare payload for the working endpoint
      const payload = {
        user_id: currentEmployee.user_id || currentEmployee.user?.id,
        basic_salary: basicSalary.toString(),
        other_allowance: otherAllowance.toString(),
        total_salary: totalSalary.toString(),
        payment_cycle: currentEmployee.payment_cycle || "Monthly",
        currency: currentEmployee.currency || "AED",
        salary_components: updatedComponents
      };
      
      const response = await apiClient.post("/admin/employees/onboard/salary", payload);
      
      if (response.data.status === "success") {
        showToast(`Salary component "${componentName}" deleted successfully`, "success");
        // Refresh employee data
        dispatch(fetchEmployeeById(currentEmployee.id));
        closeConfirmModal();
      } else {
        showToast(response.data.message || "Failed to delete salary component", "error");
        setConfirmModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("Error deleting salary component:", error);
      showToast(error.response?.data?.message || "Failed to delete salary component", "error");
      setConfirmModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Salary Component CRUD Operations using the working endpoint pattern
  const handleUpdateSalaryComponent = async (componentId, updatedData) => {
    try {
      // Get current components
      const currentComponents = [...salaryComponents];
      
      // Find and update the component
      const updatedComponents = currentComponents.map(comp => 
        comp.id === componentId 
          ? { ...comp, component_name: updatedData.component_name, value: updatedData.value }
          : comp
      );
      
      // Calculate totals
      const totalSalary = updatedComponents.reduce((sum, comp) => sum + parseFloat(comp.value), 0);
      
      // Find basic salary component
      const basicComponent = updatedComponents.find(comp =>
        comp.component_name.toLowerCase().includes("basic")
      );
      
      const basicSalary = basicComponent ? basicComponent.value : updatedComponents[0]?.value || "0";
      const otherAllowance = updatedComponents
        .filter(comp => !comp.component_name.toLowerCase().includes("basic"))
        .reduce((sum, comp) => sum + parseFloat(comp.value), 0);
      
      // Prepare payload for the working endpoint
      const payload = {
        user_id: currentEmployee.user_id || currentEmployee.user?.id,
        basic_salary: basicSalary.toString(),
        other_allowance: otherAllowance.toString(),
        total_salary: totalSalary.toString(),
        payment_cycle: currentEmployee.payment_cycle || "Monthly",
        currency: currentEmployee.currency || "AED",
        salary_components: updatedComponents
      };
      
      const response = await apiClient.post("/admin/employees/onboard/salary", payload);
      
      if (response.data.status === "success") {
        showToast("Salary component updated successfully", "success");
        setEditingComponent(null);
        // Refresh employee data
        dispatch(fetchEmployeeById(currentEmployee.id));
      } else {
        showToast(response.data.message || "Failed to update salary component", "error");
      }
    } catch (error) {
      console.error("Error updating salary component:", error);
      showToast(error.response?.data?.message || "Failed to update salary component", "error");
    }
  };

  const handleAddSalaryComponent = async () => {
    if (!newComponent.component_name || !newComponent.value) {
      showToast("Please fill in all fields", "error");
      return;
    }

    try {
      // Get current components and add new one
      const currentComponents = salaryComponents || [];
      const updatedComponents = [
        ...currentComponents,
        {
          id: Date.now(), // Temporary ID
          component_name: newComponent.component_name,
          value: parseFloat(newComponent.value).toFixed(2)
        }
      ];
      
      // Calculate totals
      const totalSalary = updatedComponents.reduce((sum, comp) => sum + parseFloat(comp.value), 0);
      
      // Find basic salary component
      const basicComponent = updatedComponents.find(comp =>
        comp.component_name.toLowerCase().includes("basic")
      );
      
      const basicSalary = basicComponent ? basicComponent.value : updatedComponents[0]?.value || "0";
      const otherAllowance = updatedComponents
        .filter(comp => !comp.component_name.toLowerCase().includes("basic"))
        .reduce((sum, comp) => sum + parseFloat(comp.value), 0);
      
      // Prepare payload for the working endpoint (same as in EmployeeDetails)
      const payload = {
        user_id: currentEmployee.user_id || currentEmployee.user?.id,
        basic_salary: basicSalary.toString(),
        other_allowance: otherAllowance.toString(),
        total_salary: totalSalary.toString(),
        payment_cycle: currentEmployee.payment_cycle || "Monthly",
        currency: currentEmployee.currency || "AED",
        salary_components: updatedComponents.map(comp => ({
          component_name: comp.component_name,
          value: comp.value.toString()
        }))
      };
      
      const response = await apiClient.post("/admin/employees/onboard/salary", payload);
      
      if (response.data.status === "success") {
        showToast("Salary component added successfully", "success");
        setShowAddComponent(false);
        setNewComponent({ component_name: "", value: "" });
        // Refresh employee data
        dispatch(fetchEmployeeById(currentEmployee.id));
      } else {
        showToast(response.data.message || "Failed to add salary component", "error");
      }
    } catch (error) {
      console.error("Error adding salary component:", error);
      showToast(error.response?.data?.message || "Failed to add salary component", "error");
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    
    try {
      // Prepare settlement payload
      const settlementPayload = {
        settlement: {
          loan_recovery: settlementData.loanRecovery,
          notice_shortfall: settlementData.noticeShortfall,
          other_deductions: settlementData.otherDeductions,
          other_additions: settlementData.otherAdditions,
          net_payable: settlementData.netPayable,
          status: "approved",
          approved_by: "admin",
          approved_at: new Date().toISOString(),
          salary_components: salaryComponents
        }
      };

      // Update settlement via API
      const result = await dispatch(updateSettlement({ 
        id: offboardingId || localStorage.getItem("offboarding_id"), 
        settlementData: settlementPayload 
      })).unwrap();

      
      // Refresh progress after approving settlement
      await dispatch(fetchOffboardingProgress(offboardingId || localStorage.getItem("offboarding_id")));

      showToast("Final settlement approved successfully", "success");
      
      setTimeout(() => {
        navigate(`/admin/employees/letters-and-clearance?id=${offboardingId || localStorage.getItem("offboarding_id")}`);
      }, 1500);
    } catch (error) {
      console.error("Approve settlement error:", error);
      showToast(error || "Failed to approve settlement. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    
    try {
      const rejectionPayload = {
        settlement: {
          ...settlementData,
          status: "rejected",
          rejected_at: new Date().toISOString(),
          rejection_notes: "Settlement needs revision"
        }
      };

      await dispatch(updateSettlement({ 
        id: offboardingId || localStorage.getItem("offboarding_id"), 
        settlementData: rejectionPayload 
      })).unwrap();

      showToast("Settlement rejected and sent for revision", "info");
    } catch (error) {
      console.error("Reject settlement error:", error);
      showToast(error || "Failed to reject settlement. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate progress from API
  const apiProgressPercentage = currentProgress?.progress_percentage || 0;
  const completedStepsFromApi = currentProgress?.completed_steps || 0;
  const totalStepsFromApi = currentProgress?.total_steps || 7;

  // Format currency
  const formatCurrency = (amount) => {
    const currency = currentEmployee?.currency || "AED";
    return `${currency} ${amount.toLocaleString()}`;
  };

  // Get total salary
  const totalSalary = salaryComponents.reduce((sum, comp) => sum + parseFloat(comp.value), 0);

  // Loading state
  if (loading || offboardingLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/40 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <OffboardingHeader currentStep={6} />
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading settlement details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* SaaS Offboarding Header */}
        <OffboardingHeader currentStep={5} />
        
        {/* Progress Box */}
        <OffboardingProgressBox currentStep={5} />

        {/* Main Content Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-6 sm:p-8 space-y-8">
          
          {/* Header Title with Subtitle and Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Final Settlement
              </h1>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">
                {employeeName || "Employee"}
              </p>
              {currentOffboarding && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Offboarding ID: {currentOffboarding.id}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1.5 ${
                settlementData.status === "approved" 
                  ? "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 border border-green-200/60 dark:border-green-900/60"
                  : settlementData.status === "rejected"
                  ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/60"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60"
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                {settlementData.status === "approved" ? "Approved" : settlementData.status === "rejected" ? "Rejected" : "Pending finance"}
              </span>
            </div>
          </div>



          {/* Salary Components Section */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <DollarSign size={16} />
                Salary Components
              </h2>
              <button
                onClick={() => setShowAddComponent(true)}
                className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors flex items-center gap-1"
              >
                <Plus size={14} /> Add Component
              </button>
            </div>

            {/* Add Component Modal */}
            {showAddComponent && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold dark:text-white">Add Salary Component</h3>
                    <button
                      onClick={() => setShowAddComponent(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Component Name (e.g., Bonus, Commission)"
                      value={newComponent.component_name}
                      onChange={(e) => setNewComponent({ ...newComponent, component_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-green-500 focus:border-green-500"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={newComponent.value}
                      onChange={(e) => setNewComponent({ ...newComponent, value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-green-500 focus:border-green-500"
                    />
                    <button
                      onClick={handleAddSalaryComponent}
                      className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Add Component
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Salary Components Table */}
            <div className="border border-gray-100 dark:border-gray-700/50 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Component Name</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 text-center font-semibold w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {salaryComponents.length > 0 ? (
                    <>
                      {salaryComponents.map((component) => (
                        <tr key={component.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3">
                            {editingComponent === component.id ? (
                              <input
                                type="text"
                                defaultValue={component.component_name}
                                className="px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                                id={`comp-name-${component.id}`}
                              />
                            ) : (
                              <span className="font-medium">{component.component_name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {editingComponent === component.id ? (
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={component.value}
                                className="px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-right"
                                id={`comp-value-${component.id}`}
                              />
                            ) : (
                              <span className="font-mono">
                                {currentEmployee?.currency || "AED"} {parseFloat(component.value).toLocaleString()}
                              </span>
                            )}
                           </td>
                          <td className="px-4 py-3 text-center">
                            {editingComponent === component.id ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    const newName = document.getElementById(`comp-name-${component.id}`).value;
                                    const newValue = document.getElementById(`comp-value-${component.id}`).value;
                                    handleUpdateSalaryComponent(component.id, {
                                      component_name: newName,
                                      value: newValue
                                    });
                                  }}
                                  className="text-green-600 hover:text-green-800"
                                  title="Save"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={() => setEditingComponent(null)}
                                  className="text-gray-500 hover:text-gray-700"
                                  title="Cancel"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setEditingComponent(component.id)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Edit"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(component.id, component.component_name)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                           </td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="bg-gray-50 dark:bg-gray-900/50 font-bold">
                        <td className="px-4 py-3">Total Monthly Salary</td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                          {currentEmployee?.currency || "AED"} {totalSalary.toLocaleString()}
                        </td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                        No salary components found. Click "Add Component" to add salary details.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Settlement Adjustments Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={16} />
              Settlement Adjustments
            </h2>
            
            <div className="border border-gray-100 dark:border-gray-700/50 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {/* Deductions */}
                  <tr className="bg-red-50/30 dark:bg-red-900/10">
                    <td className="p-4 font-medium text-red-600 dark:text-red-400">
                      Loan Recovery
                      <button
                        onClick={() => {
                          const newValue = prompt("Enter loan recovery amount:", settlementData.loanRecovery);
                          if (newValue !== null) {
                            setSettlementData(prev => ({ ...prev, loanRecovery: parseFloat(newValue) || 0 }));
                          }
                        }}
                        className="ml-2 text-xs text-blue-500 hover:text-blue-700"
                      >
                        (Edit)
                      </button>
                    </td>
                    <td className="p-4 text-right font-mono font-medium text-red-600 dark:text-red-400">
                      - {formatCurrency(settlementData.loanRecovery)}
                    </td>
                  </tr>
                  <tr className="bg-red-50/30 dark:bg-red-900/10">
                    <td className="p-4 font-medium text-red-600 dark:text-red-400">
                      Notice Shortfall
                      <button
                        onClick={() => {
                          const newValue = prompt("Enter notice shortfall amount:", settlementData.noticeShortfall);
                          if (newValue !== null) {
                            setSettlementData(prev => ({ ...prev, noticeShortfall: parseFloat(newValue) || 0 }));
                          }
                        }}
                        className="ml-2 text-xs text-blue-500 hover:text-blue-700"
                      >
                        (Edit)
                      </button>
                    </td>
                    <td className="p-4 text-right font-mono font-medium text-red-600 dark:text-red-400">
                      - {formatCurrency(settlementData.noticeShortfall)}
                    </td>
                  </tr>
                  <tr className="bg-red-50/30 dark:bg-red-900/10">
                    <td className="p-4 font-medium text-red-600 dark:text-red-400">
                      Other Deductions
                      <button
                        onClick={() => {
                          const newValue = prompt("Enter other deductions amount:", settlementData.otherDeductions);
                          if (newValue !== null) {
                            setSettlementData(prev => ({ ...prev, otherDeductions: parseFloat(newValue) || 0 }));
                          }
                        }}
                        className="ml-2 text-xs text-blue-500 hover:text-blue-700"
                      >
                        (Edit)
                      </button>
                    </td>
                    <td className="p-4 text-right font-mono font-medium text-red-600 dark:text-red-400">
                      - {formatCurrency(settlementData.otherDeductions)}
                    </td>
                  </tr>
                  
                  {/* Additions */}
                  <tr className="bg-green-50/30 dark:bg-green-900/10">
                    <td className="p-4 font-medium text-green-600 dark:text-green-400">
                      Other Additions
                      <button
                        onClick={() => {
                          const newValue = prompt("Enter other additions amount:", settlementData.otherAdditions);
                          if (newValue !== null) {
                            setSettlementData(prev => ({ ...prev, otherAdditions: parseFloat(newValue) || 0 }));
                          }
                        }}
                        className="ml-2 text-xs text-blue-500 hover:text-blue-700"
                      >
                        (Edit)
                      </button>
                    </td>
                    <td className="p-4 text-right font-mono font-medium text-green-600 dark:text-green-400">
                      + {formatCurrency(settlementData.otherAdditions)}
                    </td>
                  </tr>
                  
                  {/* Net Payable */}
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-t-2 border-gray-200 dark:border-gray-700">
                    <td className="p-5 font-black text-gray-900 dark:text-white uppercase tracking-wider text-lg">
                      Net Payable
                    </td>
                    <td className="p-5 text-right font-mono font-black text-2xl text-green-600 dark:text-green-400">
                      {formatCurrency(settlementData.netPayable)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={handleReject}
              disabled={isSubmitting || settlementData.status === "approved"}
              className="px-6 py-2.5 rounded-full font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={18} />
              Reject/revise
            </button>
            <button
              onClick={handleApprove}
              disabled={isSubmitting || settlementData.status === "approved"}
              className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Approve Settlement
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={executeDelete}
        title="Delete Salary Component"
        message={`Are you sure you want to delete "${confirmModal.componentName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={confirmModal.loading}
      />
    </div>
  );
};

export default FinalSettlement;