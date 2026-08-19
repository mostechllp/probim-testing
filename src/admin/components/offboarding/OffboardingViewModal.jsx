import React, { useEffect, useState } from "react";
import { X, User, Briefcase, Calendar, FileText, CheckCircle2 } from "lucide-react";
import apiClient from "../../../utils/apiClient";

const OffboardingViewModal = ({ isOpen, onClose, offboardingId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!offboardingId || !isOpen) return;
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/admin/offboarding/${offboardingId}`);
        if (response.data && response.data.status === "success") {
          setData(response.data.data);
        } else {
          setError("Failed to load details");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [offboardingId, isOpen]);

  if (!isOpen) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "initiated":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case "in-progress":
      case "in_progress":
        return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
      case "completed":
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    }
  };

  const DetailRow = ({ label, value, icon: Icon }) => (
    <div className="flex flex-col mb-4">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
        {Icon && <Icon size={14} />} {label}
      </span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {value || "-"}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            Offboarding Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : data ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex justify-between items-start bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {data.employee_name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    ID: {data.employee_id}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                    data.status
                  )}`}
                >
                  {(data.status || "Unknown").toUpperCase()}
                </span>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                <DetailRow
                  label="Department"
                  value={data.department}
                  icon={Briefcase}
                />
                <DetailRow
                  label="Designation"
                  value={data.designation}
                  icon={User}
                />
                <DetailRow
                  label="Reporting Manager"
                  value={data.reporting_manager}
                  icon={User}
                />
                <DetailRow
                  label="Separation Type"
                  value={data.separation_type}
                  icon={CheckCircle2}
                />
                <DetailRow
                  label="Resignation Date"
                  value={formatDate(data.resignation_date)}
                  icon={Calendar}
                />
                <DetailRow
                  label="Last Working Day"
                  value={formatDate(data.last_working_day)}
                  icon={Calendar}
                />
                <DetailRow
                  label="Visa Sponsorship"
                  value={data.visa_sponsorship}
                  icon={FileText}
                />
                <DetailRow
                  label="Nationality"
                  value={data.nationality}
                  icon={User}
                />
              </div>

              {/* Reason For Leaving */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-2">
                  Reason for Leaving
                </span>
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {data.reason_for_leaving || "No reason provided."}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No data available.</div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OffboardingViewModal;
