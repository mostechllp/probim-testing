/* eslint-disable react-hooks/static-components */
import { useDispatch, useSelector } from "react-redux";
import {
  FiCheckCircle,
  FiFileText,
  FiUser,
  FiChevronLeft,
  FiSend,
  FiShield,
  FiGlobe,
  FiBriefcase,
  FiAlertTriangle,
  FiX,
  FiDollarSign,
  FiCalendar,
  FiPackage,
} from "react-icons/fi";
import {
  setStep,
  completeOnboarding,
} from "../../store/slices/onboardingSlice";
import { showToast } from "../../components/common/Toast";
import { fetchEmployees } from "../../store/slices/employeeSlice";
import { fetchOrganizations } from "../../store/slices/organizationSlice";
import { fetchCompanies } from "../../store/slices/companySlice";
import { fetchDesignations } from "../../store/slices/designationSlice";
import { fetchDepartments } from "../../store/slices/departmentSlice";
import { fetchRoles } from "../../store/slices/roleSlice";
import React from "react";
import apiClient from "../../../utils/apiClient";

const OnboardingReview = () => {
  const dispatch = useDispatch();
  const onboardingState = useSelector((state) => state.onboarding) || {};
  const {
    employeeDetails = {},
    salaryBankDetails = {},
    resumeData = {},
  } = onboardingState;

  // Redux Selectors for Metadata
  const { organizations = [] } = useSelector(
    (state) => state.organizations || {},
  );
  const { companies = [] } = useSelector((state) => state.companies || {});
  const { designations = [] } = useSelector(
    (state) => state.designations || {},
  );
  const { departments = [] } = useSelector((state) => state.departments || {});
  const { roles = [] } = useSelector((state) => state.roles || {});

  // Local state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorModal, setErrorModal] = React.useState({
    isOpen: false,
    title: "",
    errors: [],
  });

  // ─── Get the employee ID from localStorage or state ──────────────────
  const getEmployeeId = () => {
    const employeeId = localStorage.getItem('employeeId');
    if (employeeId) return employeeId;
    if (employeeDetails?.id) return employeeDetails.id;
    if (employeeDetails?.employee_id) return employeeDetails.employee_id;
    return null;
  };

  // ─── Get the user ID from localStorage or state ──────────────────────
  const getUserId = () => {
    const userId = localStorage.getItem('employeeUserId') || 
                   localStorage.getItem('onboardingEmployeeUserId');
    if (userId) return userId;
    if (employeeDetails?.user_id) return employeeDetails.user_id;
    if (employeeDetails?.userId) return employeeDetails.userId;
    return null;
  };

  // Pre-fetch metadata
  React.useEffect(() => {
    dispatch(fetchOrganizations());
    dispatch(fetchDesignations());
    dispatch(fetchDepartments());
    dispatch(fetchRoles());
  }, [dispatch]);

  React.useEffect(() => {
    const storedUser = localStorage.getItem("hr-user");
    const hrUser = storedUser ? JSON.parse(storedUser) : null;
    const orgId =
      hrUser?.employee?.organization_id ||
      hrUser?.organization_id ||
      organizations[0]?.id ||
      "";
    if (orgId) {
      dispatch(fetchCompanies(orgId));
    }
  }, [dispatch, organizations]);

  // ─── Step 5: Complete onboarding ────────────────────────────────────────
  const completeOnboardingProcess = async (userId) => {
    const response = await apiClient.post("/admin/employees/onboard/complete", {
      user_id: userId,
    });
    return response.data;
  };

  // ─── Handle Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // ─── GET THE USER ID (only need userId for completion) ──────────────
      const userId = getUserId();

      if (!userId) {
        setErrorModal({
          isOpen: true,
          title: "User ID Not Found",
          errors: [
            {
              field: "Missing Information",
              message: "Employee user ID not found. Please complete the previous steps first.",
            },
          ],
        });
        showToast("Employee user ID not found. Please go back and save employee details.", "error");
        setIsSubmitting(false);
        return;
      }

      // ─── CHECK IF SALARY AND BANK ARE CONFIGURED ──────────────────────
      const hasPackages = employeeDetails.packages?.package1?.isSaved || 
                          employeeDetails.packages?.package2?.isSaved;
      const hasBankAccounts = employeeDetails.bankAccounts?.length > 0;

      if (!hasPackages) {
        showToast("Please configure at least one salary package before completing.", "warning");
        setIsSubmitting(false);
        return;
      }

      if (!hasBankAccounts) {
        showToast("Please add at least one bank account before completing.", "warning");
        setIsSubmitting(false);
        return;
      }

      // ─── ONLY CALL THE COMPLETE API ──────────────────────────────────
      // Do NOT call update employee API here - the employee already exists
      try {
        await completeOnboardingProcess(userId);

        dispatch(fetchEmployees());
        dispatch(completeOnboarding());
        showToast(
          "Onboarding completed successfully! Employee has been added to the system.",
          "success",
        );
        
        // Clear onboarding data from localStorage
        localStorage.removeItem("onboarding-draft");
        localStorage.removeItem("onboarding_id");
        localStorage.removeItem("employeeId");
        localStorage.removeItem("employeeUserId");
        localStorage.removeItem("onboardingEmployeeUserId");
        
      } catch (error) {
        console.error("[Onboarding] Failed to complete onboarding:", error);
        const errorData = error?.response?.data;
        showToast(
          errorData?.message || "Onboarding completion failed. Please try again.",
          "error",
        );
        dispatch(completeOnboarding()); // Still mark as complete in local state
      }
      
    } catch (error) {
      console.error("[Onboarding] Unexpected error:", error);
      setErrorModal({
        isOpen: true,
        title: "Something Went Wrong",
        errors: [
          {
            field: "Error",
            message: "An unexpected error occurred. Please try again.",
          },
        ],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    dispatch(setStep(4));
  };

  const handleSaveDraft = () => {
    localStorage.setItem("onboarding-draft", JSON.stringify(onboardingState));
    showToast("Draft saved successfully!", "success");
  };

  const SummaryCard = ({ title, icon: Icon, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-2">
        <Icon className="text-green-600" size={18} />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  // ─── Get packages from employeeDetails ──────────────────────────────────
  const packages = employeeDetails.packages || {};
  const package1 = packages.package1 || {};
  const package2 = packages.package2 || {};

  const getPackagesFromLocalStorage = () => {
    try {
      const draftStr = localStorage.getItem("onboarding-draft");
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft?.employeeDetails?.packages) {
          return draft.employeeDetails.packages;
        }
      }
    } catch (e) {
      console.error("Failed to parse draft:", e);
    }
    return null;
  };

  const getPackagesData = () => {
    if (employeeDetails.packages) {
      return employeeDetails.packages;
    }
    if (salaryBankDetails?.packages) {
      return salaryBankDetails.packages;
    }
    try {
      const draftStr = localStorage.getItem("onboarding-draft");
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft?.employeeDetails?.packages) {
          return draft.employeeDetails.packages;
        }
      }
    } catch (e) {
      console.error("Failed to parse draft:", e);
    }
    return {};
  };

  const packagesData = getPackagesData();

  const getBankAccounts = () => {
    if (
      employeeDetails.bankAccounts &&
      employeeDetails.bankAccounts.length > 0
    ) {
      return employeeDetails.bankAccounts;
    }
    if (
      salaryBankDetails?.bankAccounts &&
      salaryBankDetails.bankAccounts.length > 0
    ) {
      return salaryBankDetails.bankAccounts;
    }
    try {
      const draftStr = localStorage.getItem("onboarding-draft");
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft?.employeeDetails?.bankAccounts) {
          return draft.employeeDetails.bankAccounts;
        }
      }
    } catch (e) {
      console.error("Failed to parse draft:", e);
    }
    return [];
  };

  const bankAccounts = getBankAccounts();

  const totalSalary = (pkg) => {
    return (pkg.salaryComponents || []).reduce(
      (sum, comp) => sum + (comp.price || comp.value || 0),
      0,
    );
  };

  const localPackages = getPackagesFromLocalStorage();
  const finalPackages = (package1.packageId || package2.packageId) ? packages : (localPackages || packages);
  const finalPackage1 = finalPackages.package1 || {};
  const finalPackage2 = finalPackages.package2 || {};

  const hasPackage1 = (finalPackage1.packageId || finalPackage1.id) && finalPackage1.isSaved;
  const hasPackage2 = (finalPackage2.packageId || finalPackage2.id) && finalPackage2.isSaved;

  return (
    <>
      {/* Error Modal */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1100] p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-slideUp">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <FiAlertTriangle className="text-white" size={22} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base leading-tight">
                    {errorModal.title}
                  </h3>
                  <p className="text-white/75 text-xs mt-0.5">
                    Please review and fix the issue below
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setErrorModal({ isOpen: false, title: "", errors: [] })
                }
                className="text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/15 rounded-lg"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3 max-h-72 overflow-y-auto">
              {errorModal.errors.map((err, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20"
                >
                  <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 dark:text-red-400 text-xs font-bold">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                      {err.field.replace(/_/g, " ")}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">
                      {err.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() =>
                  setErrorModal({ isOpen: false, title: "", errors: [] })
                }
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto animate-fadeIn space-y-8">
        {/* Summary Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-3xl p-8 text-white shadow-xl shadow-green-600/20 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative animate-fadeIn">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2 text-white">
              Final Review & Submission
            </h2>
            <p className="text-green-100 max-w-md text-sm leading-relaxed">
              Please verify all information before finalizing the onboarding
              process.
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
              <FiCheckCircle size={32} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">
              Ready to Submit
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Employee Summary */}
          <SummaryCard title="Employee Details" icon={FiUser}>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400">
                  <FiUser size={24} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {employeeDetails.firstName} {employeeDetails.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {employeeDetails.designation} • {employeeDetails.department}
                    {employeeDetails.role && (
                      <span className="ml-1 text-xs text-gray-400">
                        • Role: {employeeDetails.role}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 pt-4">
                <div className="flex items-center gap-3 text-sm">
                  <FiBriefcase className="text-gray-400" />
                  <span className="text-gray-500 font-medium w-24">
                    Experience:
                  </span>
                  <span className="text-gray-900 dark:text-gray-300 font-semibold">
                    {employeeDetails.experience}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <FiGlobe className="text-gray-400" />
                  <span className="text-gray-500 font-medium w-24">
                    Nationality:
                  </span>
                  <span className="text-gray-900 dark:text-gray-300 font-semibold">
                    {employeeDetails.nationality}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <FiShield className="text-gray-400" />
                  <span className="text-gray-500 font-medium w-24">
                    Joining:
                  </span>
                  <span className="text-gray-900 dark:text-gray-300 font-semibold">
                    {employeeDetails.joiningDate}
                  </span>
                </div>
                {employeeDetails.role && (
                  <div className="flex items-center gap-3 text-sm">
                    <FiShield className="text-gray-400" />
                    <span className="text-gray-500 font-medium w-24">
                      Role:
                    </span>
                    <span className="text-gray-900 dark:text-gray-300 font-semibold">
                      {employeeDetails.role}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </SummaryCard>

          {/* Documents Summary */}
          <SummaryCard title="Onboarding Assets" icon={FiFileText}>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg flex items-center justify-center">
                    <FiFileText size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      Resume
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {resumeData?.fileName || "Not uploaded"}
                    </p>
                  </div>
                </div>
                <span className="text-green-500 font-bold text-[10px] bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                  {resumeData?.fileName ? "UPLOADED" : "SKIPPED"}
                </span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg flex items-center justify-center">
                    <FiFileText size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      Offer Letter
                    </p>
                    <p className="text-[10px] text-gray-500">Auto-Generated</p>
                  </div>
                </div>
                <span className="text-green-500 font-bold text-[10px] bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                  READY
                </span>
              </div>
            </div>
          </SummaryCard>

          {/* Salary & Bank Details Summary */}
          <div className="md:col-span-2">
            <SummaryCard title="Salary & Bank Details" icon={FiDollarSign}>
              <div className="space-y-6">
                {/* Salary Packages Summary */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <FiPackage size={14} />
                    Salary Packages
                  </p>

                  {hasPackage1 ? (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-green-600 dark:text-green-400">
                            {package1.name || "Package 1"}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                            {package1.currency || "AED"}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {package1.currency || "AED"} {totalSalary(package1).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {(package1.salaryComponents || []).map((comp, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {comp.name || comp.component_name}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {package1.currency || "AED"} {(comp.price || comp.value || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-sm text-gray-400 italic border border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                      Package 1 not configured
                    </div>
                  )}

                  {hasPackage2 ? (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-green-600 dark:text-green-400">
                            {package2.name || "Package 2"}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                            {package2.currency || "AED"}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {package2.currency || "AED"} {totalSalary(package2).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {(package2.salaryComponents || []).map((comp, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {comp.name || comp.component_name}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {package2.currency || "AED"} {(comp.price || comp.value || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-sm text-gray-400 italic border border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                      Package 2 not configured
                    </div>
                  )}

                  {!hasPackage1 && !hasPackage2 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No salary packages configured
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
                    <FiCalendar className="text-gray-400" />
                    <span className="text-gray-500 font-medium">Payment Cycle:</span>
                    <span className="text-gray-900 dark:text-gray-300 font-semibold">
                      {employeeDetails.paymentCycle || "Monthly"}
                    </span>
                  </div>
                </div>

                {/* Bank Details Summary */}
                {bankAccounts && bankAccounts.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
                      Bank Accounts ({bankAccounts.length})
                    </p>
                    <div className="space-y-3">
                      {bankAccounts.map((bank, idx) => (
                        <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-500 uppercase">Account {idx + 1}</span>
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                {bank.bankCountry}
                              </span>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide">Bank Name</p>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{bank.bankName}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide">Account Number</p>
                                  <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{bank.accountNumber}</p>
                                </div>
                                {bank.bankCountry === "India" && bank.bankBranch && (
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Branch Name</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{bank.bankBranch}</p>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                {bank.bankCountry === "India" && bank.bankIfsc && (
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">IFSC Code</p>
                                    <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{bank.bankIfsc}</p>
                                  </div>
                                )}
                                {bank.bankCountry === "UAE" && bank.bankIban && (
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">IBAN Number</p>
                                    <p className="text-sm font-mono font-medium text-gray-900 dark:text-white break-all">{bank.bankIban}</p>
                                  </div>
                                )}
                                {bank.bankCountry === "UAE" && bank.bankSwift && (
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">SWIFT/BIC Code</p>
                                    <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{bank.bankSwift}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!bankAccounts || bankAccounts.length === 0) && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs text-amber-600">No bank accounts added yet</p>
                  </div>
                )}
              </div>
            </SummaryCard>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 md:p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-gray-100 dark:border-gray-700">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-5 py-2.5 font-bold text-gray-500 hover:text-gray-900"
          >
            <FiChevronLeft size={20} /> Go Back
          </button>
          <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
            <button
              onClick={handleSaveDraft}
              className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 font-semibold rounded-full border hover:bg-gray-200 transition-all text-sm"
            >
              Save as Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <FiSend size={16} /> Complete Onboarding
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingReview;