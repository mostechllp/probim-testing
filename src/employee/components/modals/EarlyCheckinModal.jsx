import { useState } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "../common/Toast";
import BaseModal from "./BaseModal";
import { submitAttendanceRequest } from "../../store/slices/attendanceTypeSlice";
import DateInput from "../../../admin/components/common/DateInput"
import { TimeInput } from "../common/TimeInput";

// ✅ Helper function to format time as HH:MM:SS
const formatTimeWithSeconds = (time) => {
  if (!time) return "";
  // If time already has seconds, return as is
  if (time.split(':').length === 3) {
    return time;
  }
  // If time has only HH:MM, add :00 seconds
  if (time.split(':').length === 2) {
    return `${time}:00`;
  }
  return time;
};

const EarlyCheckinModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);

  // ✅ Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.date || !formData.time || !formData.reason) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setLoading(true);
    try {
      // ✅ Format time as HH:MM:SS
      const formattedTime = formatTimeWithSeconds(formData.time);
      
      await dispatch(submitAttendanceRequest({
        type: "early_check_in",
        request_date: formData.date,
        request_time: formattedTime, // ✅ Now in HH:MM:SS format
        reason: formData.reason,
      })).unwrap();
      
      showToast("Early check-in request submitted successfully", "success");
      onClose();
      setFormData({ date: "", time: "", reason: "" });
    } catch (error) {
      showToast(error || "Failed to submit request", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Early Check-in Request"
      loading={loading}
      onSubmit={handleSubmit}
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Date <span className="text-red-500">*</span>
        </label>
        <DateInput
          value={formData.date}
          onChange={(date) => setFormData({ ...formData, date })}
          placeholder="dd/mm/yyyy"
          className="w-full"
          // ✅ Disable past dates - only allow today and future dates
          minDate={today}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          <i className="fas fa-info-circle mr-1"></i>
          Only today and future dates are allowed
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Time <span className="text-red-500">*</span>
        </label>
        <TimeInput
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          <i className="fas fa-info-circle mr-1"></i>
          Time will be sent as HH:MM:SS format
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          rows="4"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          placeholder="Provide a valid reason..."
          required
        />
      </div>
    </BaseModal>
  );
};

export default EarlyCheckinModal;