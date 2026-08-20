import React, { useState, useEffect } from "react";
import { ArrowRight, Loader, Plus, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "../common/Toast";
import OffboardingHeader from "./OffboardingHeader";
import OffboardingProgressBox from "./OffboardingProgressBox";
import { fetchOffboardingById, updateSettlement, fetchOffboardingProgress } from "../../store/slices/offboardingSlice";
import apiClient from "../../../utils/apiClient";

const FinalSettlement = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const offboardingId = location.state?.id || searchParams.get("id");
  const isViewMode = !!location.state?.isView;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [settlementInfo, setSettlementInfo] = useState(null);
  const [calculatedData, setCalculatedData] = useState(null);
  
  // Custom interactive state
  const [customDeductions, setCustomDeductions] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [formData, setFormData] = useState(null);
  
  // Redux state
  const { currentOffboarding, loading: offboardingLoading } = useSelector((state) => state.offboarding);

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

  useEffect(() => {
    const fetchSettlementData = async () => {
      const idToUse = offboardingId || localStorage.getItem("offboarding_id");
      if (!idToUse) return;
      
      try {
        const response = await apiClient.get(`/admin/offboarding/${idToUse}/settlement`);
        
        if (response?.data?.status === 'success') {
          const { settlement, calculated_settlement } = response.data.data;
          setSettlementInfo(settlement);
          setCalculatedData(calculated_settlement);
          setRemarks(settlement?.remarks || "");
          
          const formatDateLocal = (dateString) => {
            if (!dateString) return "";
            return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
          };

          setFormData({
            empName: calculated_settlement.employee?.name || "",
            empId: calculated_settlement.employee?.employee_id || "",
            department: calculated_settlement.employee?.department || "",
            designation: calculated_settlement.employee?.designation || "",
            joiningDate: calculated_settlement.employee?.joining_date?.split('T')[0] || "",
            lastWorkingDay: calculated_settlement.employee?.last_working_day?.split('T')[0] || "",
            
            serviceCompleted: `${calculated_settlement.service_period?.years || 0} yr ${calculated_settlement.service_period?.months || 0} mo ${calculated_settlement.service_period?.days || 0} d`,
            noticePeriodDays: calculated_settlement.notice_period?.notice_period_days || 0,
            noticeWindow: `${formatDateLocal(calculated_settlement.notice_period?.notice_start_date)} to ${formatDateLocal(calculated_settlement.notice_period?.notice_end_date)}`,
            shortfallDaysServed: `${calculated_settlement.notice_period?.shortfall_days || 0} shortfall / ${calculated_settlement.notice_period?.days_served || 0} served`,
            
            daysWorked: `${calculated_settlement.attendance?.days_worked || 0} / ${calculated_settlement.attendance?.working_days || 0}`,
            leaveTakenAllocated: `${calculated_settlement.leave?.leave_taken || 0} / ${calculated_settlement.leave?.leave_allocated || 0}`,
            unpaidLeaveDays: calculated_settlement.leave?.unpaid_leave_days || 0,
            leaveBalance: `${calculated_settlement.leave?.leave_balance_days || 0} days`,
            perDaySalary: calculated_settlement.salary?.per_day_salary || 0,
            
            leaveEncashmentTitle: `Leave Encashment (${calculated_settlement.leave_encashment?.leave_balance_days || 0} days)`,
            leaveEncashmentAmount: calculated_settlement.leave_encashment?.amount || 0,
            
            gratuityTitle: `Gratuity (${(calculated_settlement.gratuity?.gratuity_days || 0).toFixed(2)} days)`,
            gratuityAmount: calculated_settlement.gratuity?.amount || 0,
            
            overtimeAmount: calculated_settlement.overtime?.amount || 0,
            
            grossFinalPayable: calculated_settlement.total_payable || 0,
            standardDeductions: calculated_settlement.total_deductions || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching settlement data:", error);
        showToast("Failed to load settlement calculations", "error");
      } finally {
        setLoading(false);
      }
    };

    if (currentOffboarding && !offboardingLoading) {
      fetchSettlementData();
    }
  }, [currentOffboarding, offboardingLoading, offboardingId]);

  const handleAddDeductionRow = () => {
    setCustomDeductions([
      ...customDeductions, 
      { id: Date.now(), name: "", amount: "" }
    ]);
  };
  
  const handleRemoveDeduction = (id) => {
    setCustomDeductions(customDeductions.filter(d => d.id !== id));
  };
  
  const handleDeductionChange = (id, field, value) => {
    setCustomDeductions(customDeductions.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const handleUpdateSettlement = async () => {
    setIsSubmitting(true);
    
    try {
      const totalCustomDeductions = customDeductions.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const baseDeductions = parseFloat(formData?.standardDeductions) || 0;
      const totalDeductions = baseDeductions + totalCustomDeductions;
      
      const totalPayable = parseFloat(formData?.grossFinalPayable) || 0;
      const netPayable = totalPayable - totalDeductions;

      const payload = {
        offboarding_id: offboardingId || localStorage.getItem("offboarding_id"),
        total_payable: totalPayable,
        total_deductions: totalDeductions,
        net_payable: netPayable,
        status: "approved",
        settlement_status: "approved",
        remarks: remarks
      };

      await dispatch(updateSettlement({ 
        id: offboardingId || localStorage.getItem("offboarding_id"), 
        settlementData: payload 
      })).unwrap();

      await dispatch(fetchOffboardingProgress(offboardingId || localStorage.getItem("offboarding_id")));
      
      showToast("Final settlement updated successfully", "success");
      
      setTimeout(() => {
        const currentId = offboardingId || localStorage.getItem("offboarding_id");
        const savedVisaSponsorship = localStorage.getItem("offboarding_visa_sponsorship");
        let isVisaReq = true;
        
        if (savedVisaSponsorship) {
          isVisaReq = savedVisaSponsorship !== "Not Applicable";
        } else if (currentId) {
          const sessionVisaStatus = sessionStorage.getItem(`visa_required_${currentId}`);
          if (sessionVisaStatus) {
            isVisaReq = sessionVisaStatus === "true";
          }
        }
        
        const targetRoute = isVisaReq ? "visa-cancellation" : "exit-interview";
        navigate(`/admin/employees/${targetRoute}?id=${currentId}`);
      }, 1500);
    } catch (error) {
      console.error("Update settlement error:", error);
      showToast(error || "Failed to update settlement.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextView = () => {
    const currentId = offboardingId || localStorage.getItem("offboarding_id");
    const savedVisaSponsorship = localStorage.getItem("offboarding_visa_sponsorship");
    let isVisaReq = true;
    
    if (savedVisaSponsorship) {
      isVisaReq = savedVisaSponsorship !== "Not Applicable";
    } else if (currentId) {
      const sessionVisaStatus = sessionStorage.getItem(`visa_required_${currentId}`);
      if (sessionVisaStatus) {
        isVisaReq = sessionVisaStatus === "true";
      }
    }
    
    const targetRoute = isVisaReq ? "visa-cancellation" : "exit-interview";
    navigate(`/admin/employees/${targetRoute}?id=${currentId}`, { state: { id: currentId, isView: true } });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading || offboardingLoading || !calculatedData || !formData) {
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

  const totalCustomDeductions = customDeductions.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const finalTotalPayable = parseFloat(formData.grossFinalPayable) || 0;
  const finalTotalDeductions = (parseFloat(formData.standardDeductions) || 0) + totalCustomDeductions;
  const finalNetPayable = finalTotalPayable - finalTotalDeductions;
  const currency = calculatedData?.salary_packages?.[0]?.currency || "AED";

  // Reusable Form Input Component
  const FormInput = ({ label, value, onChange, type = "text", prefix = "" }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${prefix ? 'pl-12 pr-4' : 'px-4'} py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500`}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        <OffboardingHeader currentStep={3} />
        <OffboardingProgressBox currentStep={3} />

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-6 sm:p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {isViewMode ? "View Final Settlement" : "Final Settlement"}
            </h1>
          </div>

          <div className="space-y-8">
            <fieldset disabled={isViewMode} className="w-full space-y-8">
            {/* 1. Employee Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput label="Employee Name" value={formData.empName} onChange={(v) => handleFormChange('empName', v)} />
              <FormInput label="Employee ID" value={formData.empId} onChange={(v) => handleFormChange('empId', v)} />
              <FormInput label="Department" value={formData.department} onChange={(v) => handleFormChange('department', v)} />
              <FormInput label="Designation" value={formData.designation} onChange={(v) => handleFormChange('designation', v)} />
              <FormInput label="Joining Date" type="date" value={formData.joiningDate} onChange={(v) => handleFormChange('joiningDate', v)} />
              <FormInput label="Last Working Day" type="date" value={formData.lastWorkingDay} onChange={(v) => handleFormChange('lastWorkingDay', v)} />
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700 w-full my-8"></div>

            {/* 2. Service & Notice Period */}
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-4">Service & Notice Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput label="Service Completed" value={formData.serviceCompleted} onChange={(v) => handleFormChange('serviceCompleted', v)} />
              <FormInput label="Notice Period (Days)" type="number" value={formData.noticePeriodDays} onChange={(v) => handleFormChange('noticePeriodDays', v)} />
              <FormInput label="Notice Window" value={formData.noticeWindow} onChange={(v) => handleFormChange('noticeWindow', v)} />
              <FormInput label="Shortfall / Days Served" value={formData.shortfallDaysServed} onChange={(v) => handleFormChange('shortfallDaysServed', v)} />
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700 w-full my-8"></div>

            {/* 3. Attendance & Leave */}
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-4">Attendance & Leave</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput label="Days Worked / Working Days" value={formData.daysWorked} onChange={(v) => handleFormChange('daysWorked', v)} />
              <FormInput label="Leave Taken / Allocated" value={formData.leaveTakenAllocated} onChange={(v) => handleFormChange('leaveTakenAllocated', v)} />
              <FormInput label="Unpaid Leave Days" type="number" value={formData.unpaidLeaveDays} onChange={(v) => handleFormChange('unpaidLeaveDays', v)} />
              <FormInput label="Leave Balance" value={formData.leaveBalance} onChange={(v) => handleFormChange('leaveBalance', v)} />
              <FormInput label="Per Day Salary" type="number" prefix={currency} value={formData.perDaySalary} onChange={(v) => handleFormChange('perDaySalary', v)} />
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700 w-full my-8"></div>

            {/* 4. Earnings */}
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-4">Earnings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput label={formData.leaveEncashmentTitle} type="number" prefix={currency} value={formData.leaveEncashmentAmount} onChange={(v) => handleFormChange('leaveEncashmentAmount', v)} />
              <FormInput label={formData.gratuityTitle} type="number" prefix={currency} value={formData.gratuityAmount} onChange={(v) => handleFormChange('gratuityAmount', v)} />
              <FormInput label="Overtime" type="number" prefix={currency} value={formData.overtimeAmount} onChange={(v) => handleFormChange('overtimeAmount', v)} />
              <FormInput label="Gross Final Payable" type="number" prefix={currency} value={formData.grossFinalPayable} onChange={(v) => handleFormChange('grossFinalPayable', v)} />
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700 w-full my-8"></div>

            {/* 5. Deductions */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Deductions</h2>
              <button 
                onClick={handleAddDeductionRow}
                className="flex items-center gap-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-lg transition-colors"
              >
                <Plus size={14} /> Add Deduction
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.standardDeductions !== undefined && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput label="Standard Deductions" type="number" prefix={currency} value={formData.standardDeductions} onChange={(v) => handleFormChange('standardDeductions', v)} />
                </div>
              )}
              
              {customDeductions.map((deduction) => (
                <div key={deduction.id} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Deduction Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Equipment damage"
                      value={deduction.name}
                      onChange={(e) => handleDeductionChange(deduction.id, 'name', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                  <div className="space-y-1.5 relative">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Amount ({currency}) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={deduction.amount}
                        onChange={(e) => handleDeductionChange(deduction.id, 'amount', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      />
                      <button 
                        onClick={() => handleRemoveDeduction(deduction.id)}
                        className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors border border-red-100"
                        title="Remove"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700 w-full my-8"></div>

            {/* 6. Remarks */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Remarks / Internal Notes
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes regarding this settlement..."
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 min-h-[100px] focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>

            {/* 7. Totals Card */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mt-8">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm font-bold text-gray-600 dark:text-gray-400">
                  <span>TOTAL PAYABLE</span>
                  <span>{currency} {finalTotalPayable.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-red-500 dark:text-red-400 border-b border-gray-200 dark:border-gray-700 pb-4">
                  <span>TOTAL DEDUCTIONS</span>
                  <span>- {currency} {finalTotalDeductions.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide">Net Payable</span>
                  <span className="text-2xl font-black text-green-600 dark:text-green-500">
                    {currency} {finalNetPayable.toLocaleString(undefined, {minimumFractionDigits:2})}
                  </span>
                </div>
              </div>
            </div>
            </fieldset>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-6">
              {isViewMode ? (
                <button
                  onClick={handleNextView}
                  className="px-6 py-2.5 rounded-full font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                >
                  Next Step <ArrowRight size={16} />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate(`/admin/employees/exit-interview?id=${offboardingId}`)}
                    className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateSettlement}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Update Final Settlement
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalSettlement;
