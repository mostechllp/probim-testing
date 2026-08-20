// file: src/employee/components/modals/MissedPunchLeaveModal.jsx

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addLeaveRequestForMissedPunchin, fetchLeaveTypes, fetchLeaveBalance } from "../../store/slices/leavesSlice";
import { showToast } from "../../../components/common/Toast";
import DateInput from "../../../admin/components/common/DateInput";
import { FiCalendar, FiMessageSquare, FiClock, FiX } from "react-icons/fi";

const MissedPunchLeaveModal = ({ isOpen, onClose, selectedDate, onSuccess }) => {
  const dispatch = useDispatch();

  // Get leave types and balances from Redux
  const leavesState = useSelector((state) => state.EmpLeaves);
  const leaveTypes = leavesState?.leaveTypes || [];
  const leaveBalances = leavesState?.leaveBalances || {};
  const submitting = leavesState?.submitting || false;
  const loadingLeaveTypes = leavesState?.loading || false;

  const [formData, setFormData] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
    claim_salary: "0",
    start_session: "morning",
    end_session: "afternoon",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [localError, setLocalError] = useState("");
  const [totalDays, setTotalDays] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [annualLeaveTypeId, setAnnualLeaveTypeId] = useState(null);

  // Fetch leave types on mount and find Annual Leave ID
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchLeaveTypes());
      dispatch(fetchLeaveBalance());
    }
  }, [dispatch, isOpen]);

  // Find Annual Leave type ID when leaveTypes load
  useEffect(() => {
    if (leaveTypes.length > 0) {
      const annualLeave = leaveTypes.find(
        (type) => type.name?.toLowerCase().includes("annual") || 
                  type.name?.toLowerCase().includes("vacation")
      );
      if (annualLeave) {
        setAnnualLeaveTypeId(annualLeave.id);
        // Set leave_type_id to Annual Leave
        setFormData((prev) => ({
          ...prev,
          leave_type_id: String(annualLeave.id),
        }));
      }
    }
  }, [leaveTypes]);

  // Initialize form with selected date when modal opens
  useEffect(() => {
    if (isOpen && selectedDate && isInitializing) {
      // Set the start and end date to the selected date
      setFormData((prev) => ({
        ...prev,
        start_date: selectedDate,
        end_date: selectedDate,
      }));
      setIsInitializing(false);
    }
  }, [isOpen, selectedDate, isInitializing]);

  // Reset form when modal closes
  const handleClose = () => {
    setFormData({
      leave_type_id: annualLeaveTypeId ? String(annualLeaveTypeId) : "",
      start_date: "",
      end_date: "",
      reason: "",
      claim_salary: "0",
      start_session: "morning",
      end_session: "afternoon",
    });
    setSelectedFile(null);
    setLocalError("");
    setTotalDays(0);
    setIsInitializing(true);
    onClose();
  };

  // Calculate days when dates change (excluding Sundays)
  useEffect(() => {
    calculateDays();
  }, [formData.start_date, formData.end_date, formData.start_session, formData.end_session]);

  const getWorkingDays = (startDate, endDate) => {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    if (current > end) return 0;
    
    while (current <= end) {
      if (current.getDay() !== 0) { // Exclude Sundays
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  const calculateDays = () => {
    if (formData.start_date && formData.end_date) {
      const from = new Date(formData.start_date);
      const to = new Date(formData.end_date);
      
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      
      if (to >= from) {
        let days = getWorkingDays(from, to);
        
        if (days === 0) {
          setTotalDays(0);
          return;
        }
        
        if (formData.start_session === "afternoon") {
          days = days - 0.5;
        }
        if (formData.end_session === "morning") {
          days = days - 0.5;
        }
        
        if (days < 0.5 && days > 0) {
          days = 0.5;
        }
        
        setTotalDays(days);
      } else {
        setTotalDays(0);
      }
    } else {
      setTotalDays(0);
    }
  };

  // ─── Date handlers (no longer needed but kept for reference) ───
  // Dates are locked, but we keep the handlers in case they're needed

  const validateForm = () => {
    if (!formData.leave_type_id) {
      setLocalError("Please select a leave type");
      return false;
    }
    if (!formData.start_date) {
      setLocalError("Please select start date");
      return false;
    }
    if (!formData.end_date) {
      setLocalError("Please select end date");
      return false;
    }
    if (totalDays <= 0) {
      setLocalError("Please select valid dates (end date must be after start date)");
      return false;
    }
    if (formData.reason.length < 10) {
      setLocalError("Please provide a reason (minimum 10 characters)");
      return false;
    }
    return true;
  };

  const getSelectedLeaveBalance = () => {
    if (!formData.leave_type_id) {
      return { allocated: 0, used: 0, pending: 0, remaining: 0 };
    }

    const selectedType = leaveTypes.find(
      (lt) => lt.id === parseInt(formData.leave_type_id),
    );
    
    if (selectedType) {
      const balance = leaveBalances[selectedType.name];
      if (balance) {
        return {
          allocated: balance.allocated || 0,
          used: balance.taken || balance.used || 0,
          pending: balance.pending || 0,
          remaining: balance.remaining || 0,
        };
      }
    }
    
    return { allocated: 0, used: 0, pending: 0, remaining: 0 };
  };

  const selectedBalance = getSelectedLeaveBalance();
  const remaining = selectedBalance?.remaining ?? 0;
  const exceedsBalance = totalDays > remaining && remaining >= 0;

  const handleSubmit = async () => {
    setLocalError("");

    if (!validateForm()) {
      return;
    }

    // Check balance
    const selectedType = leaveTypes.find(
      (lt) => lt.id === parseInt(formData.leave_type_id),
    );
    if (selectedType) {
      const balance = leaveBalances[selectedType.name] || { remaining: 0 };
      if (totalDays > balance.remaining && balance.remaining >= 0) {
        setLocalError(
          `Requested days (${totalDays}) exceed available ${selectedType.name} balance (${balance.remaining} days)`,
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("leave_type_id", formData.leave_type_id);
      formDataToSend.append("start_date", formData.start_date);
      formDataToSend.append("end_date", formData.end_date);
      formDataToSend.append("reason", formData.reason);
      formDataToSend.append("claim_salary", formData.claim_salary);
      formDataToSend.append("session1", formData.start_session);
      formDataToSend.append("session2", formData.end_session);
      formDataToSend.append("year", new Date().getFullYear().toString());

      if (selectedFile) {
        formDataToSend.append("document", selectedFile);
      }

      const result = await dispatch(addLeaveRequestForMissedPunchin(formDataToSend));

      if (addLeaveRequestForMissedPunchin.fulfilled.match(result)) {
        showToast("Leave request submitted successfully!", "success");
        await dispatch(fetchLeaveBalance());
        handleClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        showToast(result.payload || "Failed to submit leave request", "error");
      }
    } catch (error) {
      showToast(error.message || "Failed to submit leave request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Get the selected leave type name for display ───
  const getSelectedLeaveTypeName = () => {
    const selectedType = leaveTypes.find(
      (lt) => lt.id === parseInt(formData.leave_type_id),
    );
    return selectedType?.name || "Annual Leave";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-[var(--surface)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-slide-up border border-[var(--border)]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <i className="fas fa-calendar-alt text-purple-500"></i>
            Apply for Leave
            <span className="text-xs font-normal text-[var(--muted)] ml-2">
              (Missed Punch-In)
            </span>
          </h3>
          <button
            onClick={handleClose}
            className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Info Banner */}
        <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <p className="text-xs text-purple-700 dark:text-purple-300">
            <i className="fas fa-info-circle mr-1"></i>
            You are applying for <strong>{getSelectedLeaveTypeName()}</strong> for <strong>{formatDateDisplay(selectedDate)}</strong>.
            The leave type and dates are pre-selected based on your missed punch-in.
          </p>
        </div>

        {/* Error Display */}
        {(localError || leavesState?.error) && (
          <div className="error-message mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg flex items-center gap-3 text-red-600">
            <FiX className="text-xl" />
            <span className="text-sm">{localError || leavesState?.error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {/* ─── LEAVE TYPE - DISABLED ─── */}
          <div className="form-field flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
              <i className="fas fa-list text-purple-500"></i> Leave Type{" "}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={formData.leave_type_id}
              disabled
              className="w-full px-3.5 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] cursor-not-allowed opacity-75"
            >
              <option value="">Select Leave Type</option>
              {leaveTypes.map((type) => {
                const balance = leaveBalances[type.name] || { remaining: 0 };
                return (
                  <option key={type.id} value={type.id}>
                    {type.name} (Available: {balance.remaining} days)
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-[var(--muted)]">
              <i className="fas fa-lock mr-1"></i> 
              Leave type is pre-selected as <strong>{getSelectedLeaveTypeName()}</strong>
            </p>
          </div>

          {/* ─── DATE INPUTS WITH SESSIONS - DATES LOCKED ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date - DISABLED */}
            <div className="form-field flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                <FiCalendar className="text-purple-500" /> Start Date{" "}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                disabled
                className="w-full px-3.5 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] cursor-not-allowed opacity-75"
              />
            </div>

            {/* Start Session - ENABLED */}
            <div className="form-field flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                <FiClock className="text-purple-500" /> Start Session{" "}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                value={formData.start_session}
                onChange={(e) =>
                  setFormData({ ...formData, start_session: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
              </select>
            </div>

            {/* End Date - DISABLED */}
            <div className="form-field flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                <FiCalendar className="text-purple-500" /> End Date{" "}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="date"
                value={formData.end_date}
                disabled
                className="w-full px-3.5 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] cursor-not-allowed opacity-75"
              />
            </div>

            {/* End Session - ENABLED */}
            <div className="form-field flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                <FiClock className="text-purple-500" /> End Session{" "}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                value={formData.end_session}
                onChange={(e) =>
                  setFormData({ ...formData, end_session: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
              </select>
            </div>

            {/* Total Days - DISPLAY ONLY */}
            <div className="form-field flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                <i className="fas fa-calculator text-purple-500"></i> Total Days
              </label>
              <div
                className={`total-days-box p-3 rounded-lg text-center ${exceedsBalance ? "bg-red-500/10" : "bg-purple-500/10"}`}
              >
                <span
                  className={`text-2xl md:text-3xl font-extrabold ${exceedsBalance ? "text-red-600" : "text-purple-600"} block`}
                >
                  {totalDays}
                </span>
                <small className="text-[11px] text-[var(--muted)]">
                  {totalDays === 1 ? "Day" : "Days"} (Excluding Sundays)
                </small>
              </div>
            </div>

            {/* File Upload - ENABLED */}
            <div className="form-field flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                <i className="fas fa-paperclip text-purple-500"></i> Supporting Document
                <span className="text-[var(--muted)] text-[10px] ml-1">(Optional)</span>
              </label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                accept=".pdf,.doc,.docx,.jpg,.png"
                className="py-2.5 px-3.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-500 file:text-white file:cursor-pointer hover:file:bg-purple-600 w-full"
              />
            </div>
          </div>

          {/* Reason - ENABLED */}
          <div className="form-field flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
              <FiMessageSquare className="text-purple-500" /> Reason for Leave{" "}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              rows="3"
              placeholder="Please describe your reason for requesting leave (min 10 characters)..."
              className="w-full py-3 px-3.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
              required
            />
            <small
              className={`text-[11px] ${formData.reason.length >= 10 ? "text-green-500" : "text-red-500"}`}
            >
              {formData.reason.length}/10 characters minimum
            </small>
          </div>

          {/* Claim Salary - ENABLED */}
          <div className="form-field flex flex-row items-center gap-4">
            <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1 whitespace-nowrap">
              <i className="fas fa-money-bill-wave text-purple-500" /> Claim Salary
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-[var(--text)]">
                <input
                  type="radio"
                  name="claimSalary"
                  value="1"
                  checked={formData.claim_salary === "1"}
                  onChange={() =>
                    setFormData({ ...formData, claim_salary: "1" })
                  }
                  className="w-4 h-4 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[var(--text)]">
                <input
                  type="radio"
                  name="claimSalary"
                  value="0"
                  checked={formData.claim_salary === "0"}
                  onChange={() =>
                    setFormData({ ...formData, claim_salary: "0" })
                  }
                  className="w-4 h-4 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>

          {/* Balance Warning */}
          {exceedsBalance && (
            <div className="warning-message p-3 bg-amber-500/10 border border-amber-500 rounded-lg text-amber-600 text-sm">
              ⚠️ Warning: Requested days ({totalDays}) exceed available balance ({remaining} days)
            </div>
          )}

          {/* Balance Info */}
          {formData.leave_type_id && (
            <div className="balance-info p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-xs text-[var(--muted)]">Allocated</div>
                  <div className="text-sm font-bold text-[var(--text)]">{selectedBalance.allocated}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Used</div>
                  <div className="text-sm font-bold text-[var(--text)]">{selectedBalance.used}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Pending</div>
                  <div className="text-sm font-bold text-[var(--text)]">{selectedBalance.pending}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Balance</div>
                  <div className="text-sm font-bold text-green-600">{selectedBalance.remaining}</div>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] font-medium text-sm hover:bg-[var(--surface3)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || exceedsBalance || !formData.leave_type_id || formData.reason.length < 10}
              className="flex-1 py-2.5 px-4 bg-gray-500 text-white rounded-lg font-medium text-sm hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Submit Leave Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper function
const formatDateDisplay = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

export default MissedPunchLeaveModal;