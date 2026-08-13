import React, { useState, useEffect } from "react";
import { ArrowRight, Loader, Plus, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const offboardingId = searchParams.get("id");
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [settlementInfo, setSettlementInfo] = useState(null);
  const [calculatedData, setCalculatedData] = useState(null);
  
  // Custom interactive state
  const [customDeductions, setCustomDeductions] = useState([]);
  const [remarks, setRemarks] = useState("");
  
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
      const baseDeductions = calculatedData?.total_deductions || 0;
      const totalDeductions = baseDeductions + totalCustomDeductions;
      
      const totalPayable = calculatedData?.total_payable || 0;
      const netPayable = totalPayable - totalDeductions;

      const payload = {
        total_payable: totalPayable,
        total_deductions: totalDeductions,
        net_payable: netPayable,
        status: "approved",
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

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading || offboardingLoading || !calculatedData) {
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
  const finalTotalPayable = calculatedData.total_payable;
  const finalTotalDeductions = calculatedData.total_deductions + totalCustomDeductions;
  const finalNetPayable = finalTotalPayable - finalTotalDeductions;
  const emp = calculatedData.employee;
  const currency = calculatedData?.salary_packages?.[0]?.currency || "AED";

  // Reusable ReadOnly Input Component
  const ReadOnlyInput = ({ label, value }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      <input
        type="text"
        value={value}
        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none"
        readOnly
      />
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
              Final Settlement
            </h1>
          </div>

          <div className="space-y-8">
            {/* 1. Employee Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReadOnlyInput label="Employee Name" value={emp.name} />
              <ReadOnlyInput label="Employee ID" value={emp.employee_id} />
              <ReadOnlyInput label="Department" value={emp.department} />
              <ReadOnlyInput label="Designation" value={emp.designation} />
              <ReadOnlyInput label="Joining Date" value={formatDate(emp.joining_date)} />
              <ReadOnlyInput label="Last Working Day" value={formatDate(emp.last_working_day)} />
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700 w-full my-8"></div>

            {/* 2. Service & Notice Period */}
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-4">Service & Notice Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReadOnlyInput label="Service Completed" value={`${calculatedData.service_period.years} yr ${calculatedData.service_period.months} mo ${calculatedData.service_period.days} d`} />
              <ReadOnlyInput label="Notice Period (Days)" value={calculatedData.notice_period.notice_period_days} />
              <ReadOnlyInput label="Notice Window" value={`${formatDate(calculatedData.notice_period.notice_start_date)} to ${formatDate(calculatedData.notice_period.notice_end_date)}`} />
              <ReadOnlyInput label="Shortfall / Days Served" value={`${calculatedData.notice_period.shortfall_days} shortfall / ${calculatedData.notice_period.days_served} served`} />
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700 w-full my-8"></div>

            {/* 3. Attendance & Leave */}
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-4">Attendance & Leave</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReadOnlyInput label="Days Worked / Working Days" value={`${calculatedData.attendance.days_worked} / ${calculatedData.attendance.working_days}`} />
              <ReadOnlyInput label="Leave Taken / Allocated" value={`${calculatedData.leave.leave_taken} / ${calculatedData.leave.leave_allocated}`} />
              <ReadOnlyInput label="Unpaid Leave Days" value={calculatedData.leave.unpaid_leave_days} />
              <ReadOnlyInput label="Leave Balance" value={`${calculatedData.leave.leave_balance_days} days`} />
              <ReadOnlyInput label="Per Day Salary" value={`${currency} ${calculatedData.salary.per_day_salary.toLocaleString(undefined, {minimumFractionDigits:2})}`} />
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700 w-full my-8"></div>

            {/* 4. Earnings */}
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-4">Earnings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReadOnlyInput label={`Leave Encashment (${calculatedData.leave_encashment.leave_balance_days} days)`} value={`${currency} ${calculatedData.leave_encashment.amount.toLocaleString(undefined, {minimumFractionDigits:2})}`} />
              <ReadOnlyInput label={`Gratuity (${calculatedData.gratuity.gratuity_days.toFixed(2)} days)`} value={`${currency} ${calculatedData.gratuity.amount.toLocaleString(undefined, {minimumFractionDigits:2})}`} />
              <ReadOnlyInput label="Overtime" value={`${currency} ${calculatedData.overtime.amount.toLocaleString(undefined, {minimumFractionDigits:2})}`} />
              <ReadOnlyInput label="Gross Final Payable" value={`${currency} ${finalTotalPayable.toLocaleString(undefined, {minimumFractionDigits:2})}`} />
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
              {calculatedData.total_deductions > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ReadOnlyInput label="Standard Deductions" value={`${currency} ${calculatedData.total_deductions.toLocaleString(undefined, {minimumFractionDigits:2})}`} />
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

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-6">
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
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalSettlement;
