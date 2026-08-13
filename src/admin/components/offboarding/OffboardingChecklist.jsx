import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Save,
  ClipboardCheck,
  Calendar,
  CreditCard,
  MessageSquare,
  Monitor,
  FileText
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "../common/Toast";
import OffboardingHeader from "./OffboardingHeader";
import OffboardingProgressBox from "./OffboardingProgressBox";
import { fetchOffboardingById, fetchOffboardingProgress, updateOffboarding, completeOffboarding } from "../../store/slices/offboardingSlice";
import { fetchEmployeeById } from "../../store/slices/employeeSlice";
import { fetchEmployeeAssets } from "../../store/slices/assetSlice";

const OffboardingChecklist = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const offboardingId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Redux state
  const { currentOffboarding, loading: offboardingLoading, currentProgress } = useSelector(
    (state) => state.offboarding,
  );
  const { currentEmployee } = useSelector((state) => state.employees);
  const { employeeAssets, loading: assetsLoading } = useSelector((state) => state.assets);

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
        showToast(
          "No offboarding session found. Please start from initiation.",
          "warning",
        );
      }
    }
  }, [dispatch, offboardingId]);

  // Load employee name
  useEffect(() => {
    if (currentOffboarding && !offboardingLoading) {
      if (currentOffboarding.employee_name) {
        setEmployeeName(currentOffboarding.employee_name);
      } else if (currentOffboarding.employee_id) {
        dispatch(fetchEmployeeById(currentOffboarding.employee_id));
      }

      const empId = currentOffboarding.employee_id || localStorage.getItem("offboarding_employee_id");
      if (empId) {
        dispatch(fetchEmployeeAssets(empId));
      }

      setLoading(false);
    }
  }, [currentOffboarding, offboardingLoading, dispatch]);

  useEffect(() => {
    if (currentEmployee) {
      setEmployeeName(
        `${currentEmployee.first_name} ${currentEmployee.last_name}`,
      );
    }
  }, [currentEmployee]);

  const handleSave = async () => {
    setIsSubmitting(true);

    try {
      // Call the API endpoint to complete offboarding
      if (currentOffboarding?.id) {
          await dispatch(completeOffboarding(currentOffboarding.id)).unwrap();
      }
      showToast("Offboarding completed successfully!", "success");

      setTimeout(() => {
        navigate("/admin/employees/offboarding");
      }, 1000);
    } catch (error) {
      console.error("Complete offboarding error:", error);
      showToast(error || "Failed to complete offboarding. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to determine if a step is completed
  const isStepCompleted = (stepNumber) => {
    if (currentProgress && currentProgress.completed_steps >= stepNumber) {
      return true;
    }
    
    if (!currentOffboarding) return false;
    
    if (stepNumber === 1) return currentOffboarding.status && currentOffboarding.status !== 'pending';
    
    if (stepNumber === 2) {
      if (employeeAssets && employeeAssets.length > 0) {
        return employeeAssets.every(item => {
          const status = item.assignment_status?.toLowerCase() || item.status?.toLowerCase() || item.asset?.status?.toLowerCase();
          return status === 'returned' || status === 'revoked' || item.returned_date;
        });
      } else if (employeeAssets && employeeAssets.length === 0) {
        return true; // No assets means it's completed
      }
      return currentOffboarding.asset_return_status === 'completed' || currentOffboarding.asset_return_status === 'Completed';
    }
    
    if (stepNumber === 3) {
      return currentOffboarding.settlement_status?.toLowerCase() === 'approved' || 
             currentOffboarding.settlement?.status?.toLowerCase() === 'approved' ||
             currentOffboarding.settlement_status?.toLowerCase() === 'completed';
    }
    
    if (stepNumber === 4) {
      return currentOffboarding.visa_cancellation_status?.toLowerCase() === 'completed' ||
             currentOffboarding.visa_status?.toLowerCase() === 'completed' ||
             currentOffboarding.cancellation_status?.toLowerCase() === 'completed';
    }
    
    if (stepNumber === 5) {
      if (currentOffboarding.exit_interview_status?.toLowerCase() === 'completed' ||
          currentOffboarding.interview?.status?.toLowerCase() === 'completed' ||
          currentOffboarding.interview_status?.toLowerCase() === 'completed') return true;
          
      // Extreme fallback: If interview object exists and has data, assume it's completed
      if (currentOffboarding.interview && Object.keys(currentOffboarding.interview).length > 0) return true;
      
      return false;
    }
    
    if (stepNumber === 6) {
      if (currentOffboarding.clearance_status?.toLowerCase() === 'completed' ||
          currentOffboarding.letters_status?.toLowerCase() === 'completed' ||
          currentOffboarding.status?.toLowerCase() === 'completed') return true;
          
      // Extreme fallback: If documents are uploaded or letters exist, assume it's completed
      const hasLetters = (currentOffboarding.letters && currentOffboarding.letters.length > 0) || 
                         (currentOffboarding.generated_letters && currentOffboarding.generated_letters.length > 0);
      const hasDocs = (currentOffboarding.uploaded_documents && currentOffboarding.uploaded_documents.length > 0) ||
                      (currentOffboarding.documents && currentOffboarding.documents.length > 0) ||
                      (currentOffboarding.proof_documents && currentOffboarding.proof_documents.length > 0);
      
      if (hasLetters || hasDocs) return true;
      // Also if step 5 is completed and they clicked Next from Letters page, it's highly likely 6 is done.
      // But we'll stick to data-based fallbacks.
      return false;
    }
    
    return false;
  };

  if (loading || offboardingLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/40 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <OffboardingHeader currentStep={7} />
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400">
                Loading summary...
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
          
          <div className="space-y-4 border-b border-gray-100 dark:border-gray-700 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Final Clearance
                </h1>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">
                  Review the details for {employeeName || "Employee"} before finalizing
                </p>
                {currentOffboarding && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Offboarding ID: {currentOffboarding.id}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Step 1: Initiation */}
            <div className={`p-5 rounded-xl border ${isStepCompleted(1) ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-900/10' : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isStepCompleted(1) ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">1. Initiation</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Process Started</p>
                  </div>
                </div>
                {isStepCompleted(1) ? <CheckCircle2 className="text-green-500" size={24} /> : <Circle className="text-gray-300 dark:text-gray-600" size={24} />}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4 pl-12 border-t border-gray-100 dark:border-gray-700/50 pt-4">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Resignation Date</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{currentOffboarding?.resignation_date || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Last Working Day</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{currentOffboarding?.last_working_day || 'N/A'}</span>
                </div>
                <div className="col-span-full">
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Reason for Leaving</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{currentOffboarding?.reason_for_leaving || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Step 2: Assets */}
            <div className={`p-5 rounded-xl border ${isStepCompleted(2) ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-900/10' : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isStepCompleted(2) ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    <Monitor size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">2. Asset Return</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Equipment Clearance</p>
                  </div>
                </div>
                {isStepCompleted(2) ? <CheckCircle2 className="text-green-500" size={24} /> : <Circle className="text-gray-300 dark:text-gray-600" size={24} />}
              </div>
              <div className="text-sm mt-4 pl-12 border-t border-gray-100 dark:border-gray-700/50 pt-4">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Status</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {employeeAssets 
                      ? (employeeAssets.length === 0 
                          ? 'Not Applicable' 
                          : (employeeAssets.every(item => {
                               const st = item.assignment_status?.toLowerCase() || item.status?.toLowerCase() || item.asset?.status?.toLowerCase();
                               return st === 'returned' || st === 'revoked' || item.returned_date;
                             }) ? 'All Assets Returned' : 'Pending'))
                      : (currentOffboarding?.asset_return_status === 'completed' ? 'All Assets Returned' : 'Pending / Not Applicable')}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3: Settlement */}
            <div className={`p-5 rounded-xl border ${isStepCompleted(3) ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-900/10' : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isStepCompleted(3) ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">3. Final Settlement</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Payment & Dues</p>
                  </div>
                </div>
                {isStepCompleted(3) ? <CheckCircle2 className="text-green-500" size={24} /> : <Circle className="text-gray-300 dark:text-gray-600" size={24} />}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4 pl-12 border-t border-gray-100 dark:border-gray-700/50 pt-4">
                 <div>
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Settlement Status</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{currentOffboarding?.settlement?.status || 'Pending'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Final Payable</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {currentOffboarding?.settlement?.net_payable !== undefined ? `${currentOffboarding?.settlement?.net_payable} AED` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 4: Visa Cancel */}
            <div className={`p-5 rounded-xl border ${isStepCompleted(4) ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-900/10' : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isStepCompleted(4) ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    <ClipboardCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">4. Visa Cancellation</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Immigration Status</p>
                  </div>
                </div>
                {isStepCompleted(4) ? <CheckCircle2 className="text-green-500" size={24} /> : <Circle className="text-gray-300 dark:text-gray-600" size={24} />}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4 pl-12 border-t border-gray-100 dark:border-gray-700/50 pt-4">
                 <div>
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Visa Cancellation Date</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{currentOffboarding?.visa_cancellation_date || currentOffboarding?.cancellation_date || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Status</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{currentOffboarding?.visa_cancellation_status || currentOffboarding?.cancellation_status || 'Pending / N/A'}</span>
                </div>
              </div>
            </div>

            {/* Step 5: Interview */}
            <div className={`p-5 rounded-xl border ${isStepCompleted(5) ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-900/10' : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isStepCompleted(5) ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">5. Exit Interview</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Feedback & Ratings</p>
                  </div>
                </div>
                {isStepCompleted(5) ? <CheckCircle2 className="text-green-500" size={24} /> : <Circle className="text-gray-300 dark:text-gray-600" size={24} />}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4 pl-12 border-t border-gray-100 dark:border-gray-700/50 pt-4">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Interview Status</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {isStepCompleted(5) ? 'Completed' : (currentOffboarding?.exit_interview_status || 'Pending')}
                  </span>
                </div>
                <div className="col-span-full">
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Notes / Feedback</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {isStepCompleted(5) ? 'Interview feedback submitted' : (currentOffboarding?.exit_interview_notes || 'No notes provided')}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 6: Letters */}
            <div className={`p-5 rounded-xl border ${isStepCompleted(6) ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-900/10' : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isStepCompleted(6) ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">6. Letters & Clearance</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">NOC & Experience Letters</p>
                  </div>
                </div>
                {isStepCompleted(6) ? <CheckCircle2 className="text-green-500" size={24} /> : <Circle className="text-gray-300 dark:text-gray-600" size={24} />}
              </div>
              <div className="text-sm mt-4 pl-12 border-t border-gray-100 dark:border-gray-700/50 pt-4">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Document Generation Status</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                     {isStepCompleted(6) ? "All Required Documents Generated/Uploaded" : "Pending Signature / Generation"}
                  </span>
                </div>
              </div>
            </div>

          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-6">
            <label className="flex items-center gap-3 cursor-pointer bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <input 
                type="checkbox" 
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-500 focus:ring-green-500 cursor-pointer"
              />
              <span className="text-gray-700 dark:text-gray-300 font-bold text-sm uppercase tracking-wide">
                I confirm all offboarding activities are completed
              </span>
            </label>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => navigate("/admin/employees/offboarding")}
                className="px-6 py-2.5 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting || !isConfirmed}
                className="px-6 py-2.5 rounded-xl font-semibold bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Completing...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Complete Offboarding
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

export default OffboardingChecklist;