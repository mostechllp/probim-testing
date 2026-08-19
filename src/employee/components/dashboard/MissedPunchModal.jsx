// file: src/employee/components/modals/MissedPunchModal.jsx

import { useState } from "react";
import { useDispatch } from "react-redux";
import { submitAttendanceRequest } from "../../store/slices/attendanceTypeSlice";
import { fetchDashboardData } from "../../store/slices/attendanceSlice";
import { showToast } from "../../../components/common/Toast";

// Re-use the formatDateDisplay helper or import it
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

const MissedPunchModal = ({ 
  isOpen, 
  onClose, 
  selectedDate,
  onSuccess 
}) => {
  const dispatch = useDispatch();
  const [missedPunchTime, setMissedPunchTime] = useState("");
  const [missedPunchReason, setMissedPunchReason] = useState("");
  const [isSubmittingMissed, setIsSubmittingMissed] = useState(false);

  // Reset form when modal opens with new date
  const handleClose = () => {
    setMissedPunchTime("");
    setMissedPunchReason("");
    onClose();
  };

  const handleSubmitMissedPunch = async () => {
    // Validate all required fields
    if (!selectedDate) {
      showToast("Please select a date", "error", "Validation Error");
      return;
    }
    
    if (!missedPunchTime) {
      showToast("Please select a time", "error", "Validation Error");
      return;
    }
    
    if (!missedPunchReason || missedPunchReason.trim().length < 5) {
      showToast("Please provide a valid reason (minimum 5 characters)", "error", "Validation Error");
      return;
    }

    setIsSubmittingMissed(true);
    
    try {
      await dispatch(submitAttendanceRequest({
        type: "missed_punch_in",
        request_date: selectedDate,
        request_time: missedPunchTime,
        reason: missedPunchReason.trim(),
      })).unwrap();
      
      showToast(
        `Missed punch-in request sent successfully for ${formatDateDisplay(selectedDate)}`,
        "success",
        "Request Sent"
      );
      
      // Reset form and close modal
      setMissedPunchTime("");
      setMissedPunchReason("");
      onClose();
      
      // Refresh dashboard data
      await dispatch(fetchDashboardData()).unwrap();
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      let errorMessage = "Failed to submit request";
      
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.payload?.message) {
        errorMessage = error.payload.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showToast(errorMessage, "error", "Request Failed");
    } finally {
      setIsSubmittingMissed(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-[var(--surface)] rounded-xl max-w-md w-full p-6 shadow-2xl animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <i className="fas fa-clock text-orange-500"></i>
            Missed Punch-In Request
          </h3>
          <button
            onClick={handleClose}
            className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="space-y-4">
          {/* Date - Disabled */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              disabled
              className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm cursor-not-allowed opacity-75"
            />
          </div>

          {/* Time - Required */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Punch-In Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={missedPunchTime}
              onChange={(e) => setMissedPunchTime(e.target.value)}
              className={`w-full px-3 py-2 bg-[var(--surface2)] border ${
                !missedPunchTime && isSubmittingMissed 
                  ? 'border-red-500' 
                  : 'border-[var(--border)]'
              } rounded-lg text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
              step="60"
              required
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              <i className="fas fa-info-circle mr-1"></i>
              Please enter the time you actually arrived
            </p>
          </div>

          {/* Reason - Required */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={missedPunchReason}
              onChange={(e) => setMissedPunchReason(e.target.value)}
              placeholder="Please provide a valid reason for missing punch-in (minimum 5 characters)..."
              rows="3"
              className={`w-full px-3 py-2 bg-[var(--surface2)] border ${
                !missedPunchReason && isSubmittingMissed 
                  ? 'border-red-500' 
                  : 'border-[var(--border)]'
              } rounded-lg text-[var(--text)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
              required
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              <i className="fas fa-info-circle mr-1"></i>
              Minimum 5 characters required
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] font-medium text-sm hover:bg-[var(--surface3)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitMissedPunch}
              disabled={isSubmittingMissed || !missedPunchTime || !missedPunchReason || missedPunchReason.trim().length < 5}
              className="flex-1 py-2.5 px-4 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmittingMissed ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Send Request
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissedPunchModal;