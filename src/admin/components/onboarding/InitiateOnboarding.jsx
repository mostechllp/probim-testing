// src/admin/pages/InitiateOnboarding.jsx

import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { FiCheck, FiArrowLeft } from "react-icons/fi";
import { 
  resetOnboarding, 
  restoreDraft, 
  setStep, 
  updateEmployeeDetails,
  fetchOnboardingById,
} from "../../store/slices/onboardingSlice";
import ConfirmModal from "../../components/common/ConfirmModal";
import ResumeUpload from "./ResumeUpload";
import EmployeeDetailsForm from "./EmployeeDetailsForm";
import SalaryBankDetailsForm from "./SalaryBankDetailsForm";
import OfferLetterPreview from "./OfferLetterPreview";
import OnboardingReview from "./OnboardingReview";
import Stepper from "./Stepper";
import { RefreshCw } from "lucide-react";

const InitiateOnboarding = () => {
  const onboardingState = useSelector((state) => state.onboarding) || {};
  const { currentStep = 1, onboardingComplete = false, currentOnboarding } = onboardingState;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if we're resuming or viewing
  const onboardingId = location.state?.onboardingId || localStorage.getItem("onboarding_id");
  const isResume = location.state?.isResume || false;
  const isView = location.state?.isView || false;
  const isEdit = location.state?.isEdit || false;

  // ─── Fetch onboarding data when resuming ──────────────────────────────
  useEffect(() => {
    const fetchOnboardingData = async () => {
      if (onboardingId && (isResume || isEdit)) {
        setIsLoading(true);
        try {
          const result = await dispatch(fetchOnboardingById(onboardingId)).unwrap();
          
          // Update the form with the fetched data
          if (result) {
            // Map the data to employeeDetails format
            const employeeData = {
              firstName: result.first_name || "",
              lastName: result.last_name || "",
              email: result.personal_email || result.email || "",
              phone: result.personal_number || result.phone || "",
              nationality: result.nationality || "",
              address: result.address || "",
              designation: result.user?.designation?.name || result.designation || "",
              department: result.user?.department?.name || result.department || "",
              role: result.user?.role?.name || result.role || "",
              skills: result.key_skills || "",
              experience: result.experience_level || "",
              education: result.highest_education || "",
              joiningDate: result.joining_date || "",
              paymentCycle: result.payment_cycle || "Monthly",
              type: result.user?.type || result.type || "employee",
              // Preserve the employee ID for updates
              id: result.id,
              user_id: result.user_id || result.user?.id,
              employee_id: result.employee_id,
              // Packages
              packages: result.salary_packages?.length > 0 ? {
                package1: result.salary_packages[0] ? {
                  id: "package1",
                  name: result.salary_packages[0].name || "Package 1 - Home Country / WFH",
                  currency: result.salary_packages[0].currency || "AED",
                  salaryComponents: (result.salary_packages[0].salary_components || []).map(c => ({
                    id: c.id,
                    name: c.component_name,
                    price: parseFloat(c.value) || 0,
                  })),
                  isSaved: true,
                  totalSalary: (result.salary_packages[0].salary_components || []).reduce((sum, c) => sum + parseFloat(c.value || 0), 0),
                  packageId: result.salary_packages[0].id,
                } : {
                  id: "package1",
                  name: "Package 1 - Home Country / WFH",
                  currency: "AED",
                  salaryComponents: [],
                  isSaved: false,
                  totalSalary: 0,
                  packageId: null,
                },
                package2: result.salary_packages?.[1] ? {
                  id: "package2",
                  name: result.salary_packages[1].name || "Package 2 - Dubai Onsite",
                  currency: result.salary_packages[1].currency || "AED",
                  salaryComponents: (result.salary_packages[1].salary_components || []).map(c => ({
                    id: c.id,
                    name: c.component_name,
                    price: parseFloat(c.value) || 0,
                  })),
                  isSaved: true,
                  totalSalary: (result.salary_packages[1].salary_components || []).reduce((sum, c) => sum + parseFloat(c.value || 0), 0),
                  packageId: result.salary_packages[1].id,
                } : {
                  id: "package2",
                  name: "Package 2 - Dubai Onsite",
                  currency: "AED",
                  salaryComponents: [],
                  isSaved: false,
                  totalSalary: 0,
                  packageId: null,
                },
              } : undefined,
              // Bank Accounts
              bankAccounts: (result.bank_details || []).map(bank => ({
                id: bank.id,
                bankCountry: bank.bank_country,
                bankName: bank.bank_name,
                accountNumber: bank.account_number,
                bankIfsc: bank.ifsc_code || "",
                bankBranch: bank.branch_name || "",
                bankIban: bank.iban_number || "",
                bankSwift: bank.swift_code || "",
              })),
            };

            dispatch(updateEmployeeDetails(employeeData));
            
            // Store the employee ID for updates
            if (result.id) {
              localStorage.setItem("employeeId", String(result.id));
            }
            if (result.user_id || result.user?.id) {
              localStorage.setItem("employeeUserId", String(result.user_id || result.user?.id));
            }

            // If there are salary packages and bank details, move to the appropriate step
            if (result.salary_packages?.length > 0 || result.bank_details?.length > 0) {
              // They have completed Step 3, move to Step 4 or 5
              if (result.salary_packages?.length > 0 && result.bank_details?.length > 0) {
                dispatch(setStep(5)); // Review step
              } else {
                dispatch(setStep(3)); // Salary & Bank step
              }
            } else {
              dispatch(setStep(2)); // Employee Details step
            }
          }
        } catch (error) {
          console.error("Failed to fetch onboarding data:", error);
          showToast("Failed to load onboarding data", "error");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchOnboardingData();
  }, [onboardingId, isResume, isEdit, dispatch]);

  // Clear draft when component unmounts (if not completed)
  useEffect(() => {
    return () => {
      if (!onboardingComplete) {
        // Don't clear draft on unmount to allow resume
      }
    };
  }, [onboardingComplete]);

  // Handle restoring draft on mount
  useEffect(() => {
    const draft = localStorage.getItem("onboarding-draft");
    if (draft && currentStep === 1 && !onboardingState.resumeData && !isResume) {
      try {
        const parsedDraft = JSON.parse(draft);
        if (parsedDraft && Object.keys(parsedDraft).length > 0) {
          dispatch(restoreDraft(parsedDraft));
        }
      } catch (err) {
        console.error("Failed to restore onboarding draft:", err);
        localStorage.removeItem("onboarding-draft");
      }
    }
  }, [dispatch, currentStep, onboardingState.resumeData, isResume]);

  // Store onboarding ID
  useEffect(() => {
    if (onboardingId) {
      localStorage.setItem("onboarding_id", onboardingId);
    }
  }, [onboardingId]);

  // Handle completion
  useEffect(() => {
    if (onboardingComplete) {
      localStorage.removeItem("onboarding-draft");
      localStorage.removeItem("onboarding_id");
      dispatch(resetOnboarding());
      navigate("/admin/employees/onboarding");
    }
  }, [onboardingComplete, dispatch, navigate]);

  const handleSkipResume = () => {
    dispatch(setStep(2));
  };

  const handleBack = () => {
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    navigate("/admin/employees/onboarding");
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirm(false);
  };

  const renderStep = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    if (onboardingComplete) {
      return (
        <div className="flex flex-col items-center justify-center py-32 animate-fadeIn">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <FiCheck className="text-green-600 dark:text-green-400 text-3xl" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Onboarding Complete!
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Redirecting to dashboard...
          </p>
        </div>
      );
    }
    
    switch (currentStep) {
      case 1:
        return <ResumeUpload onSkip={handleSkipResume} />;
      case 2:
        return <EmployeeDetailsForm />;
      case 3:
        return <SalaryBankDetailsForm />;
      case 4:
        return <OfferLetterPreview />;
      case 5:
        return <OnboardingReview />;
      default:
        return <ResumeUpload onSkip={handleSkipResume} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="mb-4 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm font-medium"
      >
        <FiArrowLeft size={16} />
        Back to Onboarding
      </button>

      {/* Resume Banner */}
      {isResume && currentOnboarding && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <RefreshCw size={16} />
            <span>
              <strong>Resuming Onboarding</strong> - {currentOnboarding.first_name} {currentOnboarding.last_name}
            </span>
          </p>
        </div>
      )}

      {/* Stepper Navigation - Hidden on Success */}
      {!onboardingComplete && (
        <div className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-soft">
          <Stepper currentStep={currentStep} />
        </div>
      )}

      {/* Step Content */}
      <div className="relative">
        {renderStep()}
      </div>

      {/* Confirm Leave Modal */}
      <ConfirmModal
        isOpen={showLeaveConfirm}
        onClose={handleCancelLeave}
        onConfirm={handleConfirmLeave}
        title="Leave Onboarding?"
        message="Are you sure you want to leave? Your progress will be saved as a draft and you can resume later."
        confirmText="Leave"
        cancelText="Continue"
        type="default"
        loading={false}
      />
    </div>
  );
};

export default InitiateOnboarding;