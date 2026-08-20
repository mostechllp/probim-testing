import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiArrowLeft,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiBriefcase,
  FiGlobe,
  FiDollarSign,
  FiCreditCard,
  FiPackage,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiEdit,
  FiRefreshCw,
  FiInfo,
} from "react-icons/fi";
import { showToast } from "../../components/common/Toast";
import {
  fetchOnboardingById,
} from "../store/slices/onboardingSlice";
import { updateEmployeeStatus } from "../store/slices/employeeSlice";

const OnboardingView = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const { currentOnboarding, viewLoading } = useSelector(
    (state) => state.onboarding || { currentOnboarding: null, viewLoading: false }
  );

  // Fetch onboarding details
  useEffect(() => {
    if (id) {
      fetchOnboardingData();
    }
  }, [id]);

  const fetchOnboardingData = async () => {
    setLoading(true);
    try {
      await dispatch(fetchOnboardingById(id)).unwrap();
    } catch (error) {
      console.error("Failed to fetch onboarding:", error);
      showToast("Failed to load onboarding details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!currentOnboarding?.id) return;
    
    setUpdating(true);
    try {
      await dispatch(updateEmployeeStatus({
        id: currentOnboarding.id,
        status: newStatus
      })).unwrap();
      
      showToast(`Status updated to ${newStatus} successfully!`, "success");
      
      // ─── NAVIGATE AFTER SUCCESS ──────────────────────────────────────────
      // Navigate to employees list after successful status update
      navigate("/admin/employees");
      
    } catch (error) {
      console.error("Failed to update status:", error);
      showToast("Failed to update status", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleBack = () => {
    navigate("/admin/employees/onboarding");
  };

  const handleEdit = () => {
    // Navigate to the initiate page with the onboarding ID
    localStorage.setItem("onboarding_id", String(currentOnboarding.id));
    navigate("/admin/employees/onboarding/initiate", {
      state: {
        onboardingId: currentOnboarding.id,
        employeeId: currentOnboarding.employee_id || currentOnboarding.user_id,
        isView: false,
        isEdit: true
      }
    });
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      onboarding: { label: "Onboarding", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
      pending: { label: "Pending", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
      in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" },
      active: { label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" },
      completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" },
    };
    const c = config[status?.toLowerCase()] || config.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${c.color}`}>
        {c.label}
      </span>
    );
  };

  const SectionCard = ({ title, icon: Icon, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center gap-2">
        <Icon className="text-green-500" size={18} />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  const DetailRow = ({ label, value, className = "" }) => (
    <div className={`flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 ${className}`}>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200 break-words">{value || "-"}</span>
    </div>
  );

  if (loading || viewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentOnboarding) {
    return (
      <div className="text-center py-12">
        <FiAlertCircle className="text-5xl text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">Onboarding record not found</h3>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Back to Onboarding
        </button>
      </div>
    );
  }

  const employee = currentOnboarding;
  const user = employee.user || {};
  const salaryPackages = employee.salary_packages || [];
  const bankDetails = employee.bank_details || [];

  return (
    <div className="w-full px-4 md:px-6 py-4">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiArrowLeft className="text-gray-600 dark:text-gray-400 text-xl" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200">
              Onboarding Details
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {employee.first_name} {employee.last_name} • {employee.employee_id}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
            Status:
          </span>
          {getStatusBadge(user.status || employee.status)}
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm"
          >
            <FiEdit size={16} /> Edit
          </button>
          <button
            onClick={fetchOnboardingData}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
          >
            <FiRefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>


      {/* ─── Personal Information ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Personal Information" icon={FiUser}>
          <DetailRow label="First Name" value={employee.first_name} />
          <DetailRow label="Last Name" value={employee.last_name} />
          <DetailRow label="Employee ID" value={employee.employee_id} />
          <DetailRow label="Gender" value={employee.gender || "N/A"} />
          <DetailRow label="Marital Status" value={employee.marital_status || "N/A"} />
          <DetailRow label="Date of Birth" value={formatDate(employee.dob)} />
          <DetailRow label="Nationality" value={employee.nationality} />
          <DetailRow label="Address" value={employee.address} />
        </SectionCard>

        <SectionCard title="Professional Details" icon={FiBriefcase}>
          <DetailRow label="Designation" value={user.designation?.name || employee.designation || "N/A"} />
          <DetailRow label="Department" value={user.department?.name || employee.department || "N/A"} />
          <DetailRow label="Role" value={user.role?.name || employee.role || "N/A"} />
          <DetailRow label="Joining Date" value={formatDate(employee.joining_date)} />
          <DetailRow label="Experience Level" value={employee.experience_level} />
          <DetailRow label="Key Skills" value={employee.key_skills} />
          <DetailRow label="Highest Education" value={employee.highest_education} />
          <DetailRow label="Employee Type" value={user.type || employee.type || "Employee"} />
        </SectionCard>
      </div>

      {/* ─── Contact Information ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Contact Information" icon={FiMail}>
          <DetailRow label="Personal Email" value={employee.personal_email} />
          <DetailRow label="Company Email" value={employee.company_email} />
          <DetailRow label="Personal Number" value={employee.personal_number} />
          <DetailRow label="Company Mobile" value={employee.company_mobile_number || "N/A"} />
          <DetailRow label="Other Number" value={employee.other_number || "N/A"} />
          <DetailRow label="Home Country Number" value={employee.home_country_number || "N/A"} />
        </SectionCard>

        <SectionCard title="Payment Information" icon={FiDollarSign}>
          <DetailRow label="Payment Cycle" value={employee.payment_cycle || "Monthly"} />
          <DetailRow label="Currency" value={employee.currency || "AED"} />
          <DetailRow label="Total Salary Packages" value={salaryPackages.length} />
          <DetailRow label="Total Bank Accounts" value={bankDetails.length} />
          <DetailRow label="Skilled Employee" value={employee.is_skilled ? "Yes" : "No"} />
        </SectionCard>
      </div>

      {/* ─── Salary Packages ───────────────────────────────────────────────── */}
      <SectionCard title="Salary Packages" icon={FiPackage} className="mb-6">
        {salaryPackages.length > 0 ? (
          <div className="space-y-4">
            {salaryPackages.map((pkg, index) => {
              const total = (pkg.salary_components || []).reduce(
                (sum, comp) => sum + parseFloat(comp.value || 0),
                0
              );
              return (
                <div key={pkg.id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{pkg.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                        {pkg.currency}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pkg.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700/30 dark:text-gray-400'}`}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      {pkg.currency} {total.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-4">
                    {pkg.salary_components && pkg.salary_components.length > 0 ? (
                      <div className="space-y-1">
                        {pkg.salary_components.map((comp, idx) => (
                          <div key={comp.id || idx} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                            <span className="text-gray-600 dark:text-gray-400">{comp.component_name}</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {pkg.currency} {parseFloat(comp.value).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">No salary components</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No salary packages configured</p>
        )}
      </SectionCard>

      {/* ─── Bank Details ──────────────────────────────────────────────────── */}
      <SectionCard title="Bank Details" icon={FiCreditCard} className="mb-6">
        {bankDetails.length > 0 ? (
          <div className="space-y-4">
            {bankDetails.map((bank, index) => (
              <div key={bank.id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {bank.bank_name}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                      {bank.bank_country}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">#{index + 1}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DetailRow label="Account Number" value={bank.account_number} />
                  {bank.bank_country === "India" && (
                    <>
                      <DetailRow label="IFSC Code" value={bank.ifsc_code} />
                      <DetailRow label="Branch Name" value={bank.branch_name} />
                    </>
                  )}
                  {bank.bank_country === "UAE" && (
                    <>
                      <DetailRow label="IBAN Number" value={bank.iban_number} />
                      <DetailRow label="SWIFT/BIC Code" value={bank.swift_code} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No bank details added</p>
        )}
      </SectionCard>

      {/* ─── Timestamps ────────────────────────────────────────────────────── */}
      <SectionCard title="System Information" icon={FiInfo} className="mb-6">
        <DetailRow label="Created At" value={formatDateTime(employee.created_at)} />
        <DetailRow label="Updated At" value={formatDateTime(employee.updated_at)} />
        <DetailRow label="Organization ID" value={user.organization_id || "N/A"} />
        <DetailRow label="Company ID" value={user.company_id || "N/A"} />
      </SectionCard>

      {/* ─── Footer Actions ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <button
          onClick={handleBack}
          className="px-6 py-2.5 rounded-lg font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <FiArrowLeft /> Back
        </button>
        <div className="flex items-center gap-3">
          
          <button
            onClick={handleEdit}
            className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <FiEdit size={16} /> Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;