import React, { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const STEPS = [
  { id: 1, label: "Initiation", subtitle: "Start Process", path: "/admin/employees/offboarding-initiation" },
  { id: 2, label: "Assets", subtitle: "Asset Return", path: "/admin/employees/asset-return" },
  { id: 3, label: "Settlement", subtitle: "Final Payment", path: "/admin/employees/final-settlement" },
  { id: 4, label: "Visa Cancel", subtitle: "Visa Processing", path: "/admin/employees/visa-cancellation" },
  { id: 5, label: "Interview", subtitle: "Exit Session", path: "/admin/employees/exit-interview" },
  { id: 6, label: "Letters", subtitle: "Clearance", path: "/admin/employees/letters-and-clearance" },
  { id: 7, label: "Final Clearance", subtitle: "Verification", path: "/admin/employees/offboarding-checklist" },
];

const OffboardingHeader = ({ currentStep }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProgress, currentOffboarding } = useSelector((state) => state.offboarding);
  const [isVisaRequired, setIsVisaRequired] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get offboarding ID from URL or localStorage
  const getOffboardingId = () => {
    const urlParams = new URLSearchParams(location.search);
    return location.state?.id || urlParams.get('id') || localStorage.getItem("offboarding_id");
  };
  
  // Check visa sponsorship status from localStorage or session
  useEffect(() => {
    const savedVisaSponsorship = localStorage.getItem("offboarding_visa_sponsorship");
    const offboardingId = getOffboardingId();
    
    if (savedVisaSponsorship) {
      setIsVisaRequired(savedVisaSponsorship !== "Not Applicable");
    } else if (offboardingId) {
      const sessionVisaStatus = sessionStorage.getItem(`visa_required_${offboardingId}`);
      if (sessionVisaStatus) {
        setIsVisaRequired(sessionVisaStatus === "true");
      }
    }
  }, [location.search]);

  // Filter steps based on visa requirement
  const getFilteredSteps = () => {
    if (isVisaRequired) {
      return STEPS;
    } else {
      return STEPS.filter(step => step.id !== 4);
    }
  };
  
  const filteredSteps = getFilteredSteps();
  
  const getAdjustedStepId = (originalStepId) => {
    if (!isVisaRequired) {
      if (originalStepId > 4) {
        return originalStepId - 1;
      }
    }
    return originalStepId;
  };
  
  const combinedStatus = currentProgress?.status ?? currentOffboarding?.status;
  
  let apiCalculatedStep = null;
  if (combinedStatus) {
     if (combinedStatus === "completed" || currentProgress?.progress_percentage === 100) apiCalculatedStep = 8;
     else if (combinedStatus.includes("visa")) apiCalculatedStep = 4;
     else if (combinedStatus.includes("checklist") || combinedStatus.includes("final") || combinedStatus.includes("clearance")) apiCalculatedStep = 7;
     else if (combinedStatus.includes("asset")) apiCalculatedStep = 2;
     else if (combinedStatus.includes("interview")) apiCalculatedStep = 5;
     else if (combinedStatus.includes("settlement")) apiCalculatedStep = 3;
     else if (combinedStatus.includes("letter")) apiCalculatedStep = 6;
  }

  const maxAllowedStep = apiCalculatedStep ? getAdjustedStepId(apiCalculatedStep) : getAdjustedStepId(currentStep);

  const canNavigateToStep = (stepId, originalStepId) => {
    const adjustedStepId = getAdjustedStepId(originalStepId);
    return adjustedStepId <= maxAllowedStep;
  };
  
  const handleStepClick = (step, originalStepId) => {
    if (canNavigateToStep(step.id, originalStepId)) {
      navigate(step.path);
    }
  };

  // Save visa requirement status
  const saveVisaRequirement = (visaSponsorship, offboardingId) => {
    const isRequired = visaSponsorship !== "Not Applicable";
    setIsVisaRequired(isRequired);
    localStorage.setItem("offboarding_visa_sponsorship", visaSponsorship);
    if (offboardingId) {
      sessionStorage.setItem(`visa_required_${offboardingId}`, isRequired.toString());
    }
  };
  
  React.useEffect(() => {
    window.saveVisaRequirement = saveVisaRequirement;
    return () => {
      delete window.saveVisaRequirement;
    };
  }, []);

  // ─── Desktop View ──────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 px-6 py-6 sm:px-8 rounded-2xl shadow-soft">
        {/* Top Bar: Back Button */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/admin/employees/offboarding")}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              Offboarding Process
            </h2>
          </div>
          
          {!isVisaRequired && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
              <EyeOff size={14} className="text-gray-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Visa step skipped
              </span>
            </div>
          )}
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between w-full">
          {filteredSteps.map((step, index) => {
            const displayStepNumber = !isVisaRequired && step.id > 4 ? step.id - 1 : step.id;
            const viewedStep = getAdjustedStepId(currentStep);
            const adjustedStep = getAdjustedStepId(step.id);
            const isCompleted = adjustedStep < maxAllowedStep && adjustedStep !== viewedStep;
            const isActive = adjustedStep === viewedStep;
            const isClickable = canNavigateToStep(step.id, step.id);
            
            return (
              <React.Fragment key={step.id}>
                <div 
                  className="flex flex-col items-center relative z-10"
                  onClick={() => handleStepClick(step, step.id)}
                  style={{ cursor: isClickable ? 'pointer' : 'not-allowed' }}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                      isCompleted
                        ? "bg-green-600 border-green-600 text-white shadow-sm shadow-green-500/20"
                        : isActive
                        ? "bg-white dark:bg-gray-800 border-green-600 text-green-600 ring-4 ring-green-50 dark:ring-green-950/30"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400"
                    } ${isClickable ? 'hover:scale-105 hover:shadow-md' : 'opacity-60'}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={20} strokeWidth={2} />
                    ) : (
                      <span className="font-bold">{displayStepNumber}</span>
                    )}
                  </div>
                  
                  <div className="mt-3 text-center">
                    <p className={`text-sm font-semibold transition-colors ${
                      maxAllowedStep >= adjustedStep
                        ? "text-gray-900 dark:text-white" 
                        : "text-gray-400"
                    }`}>
                      {step.label}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
                      {step.subtitle}
                    </p>
                  </div>
                </div>

                {index < filteredSteps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-4 -mt-10 bg-gray-100 dark:bg-gray-700">
                    <div 
                      className="h-full bg-green-600 transition-all duration-500 ease-in-out" 
                      style={{ 
                        width: maxAllowedStep > adjustedStep ? "100%" : "0%" 
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Mobile View ──────────────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 px-3 py-3 rounded-2xl shadow-soft">
      {/* Top Bar: Back Button & Title */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <button 
            onClick={() => navigate("/admin/employees/offboarding")}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
            Offboarding
          </h2>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isVisaRequired && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
              <EyeOff size={12} className="text-gray-500" />
              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">
                No Visa
              </span>
            </div>
          )}
          
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {getAdjustedStepId(currentStep)}/{filteredSteps.length}
          </span>
        </div>
      </div>

      {/* Mobile Stepper - Compact with all steps */}
      <div className="relative">
        {/* Progress bar background */}
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-2.5">
          <div 
            className="h-full bg-green-600 rounded-full transition-all duration-500 ease-in-out"
            style={{ 
              width: `${((Math.max(getAdjustedStepId(currentStep), maxAllowedStep) - 1) / (filteredSteps.length - 1)) * 100}%` 
            }}
          />
        </div>

        {/* Step circles - All steps visible */}
        <div className="flex items-center justify-between">
          {filteredSteps.map((step) => {
            const displayStepNumber = !isVisaRequired && step.id > 4 ? step.id - 1 : step.id;
            const viewedStep = getAdjustedStepId(currentStep);
            const adjustedStep = getAdjustedStepId(step.id);
            const isCompleted = adjustedStep < maxAllowedStep && adjustedStep !== viewedStep;
            const isActive = adjustedStep === viewedStep;
            const isClickable = canNavigateToStep(step.id, step.id);

            return (
              <div 
                key={step.id}
                className="flex flex-col items-center relative"
                onClick={() => handleStepClick(step, step.id)}
                style={{ cursor: isClickable ? 'pointer' : 'not-allowed' }}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                    isCompleted
                      ? "bg-green-600 border-green-600 text-white"
                      : isActive
                      ? "bg-white dark:bg-gray-800 border-green-600 text-green-600 ring-2 ring-green-50 dark:ring-green-950/30"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400"
                  } ${isClickable ? 'hover:scale-105' : 'opacity-60'}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={12} strokeWidth={2} />
                  ) : (
                    <span className="font-bold text-[10px]">{displayStepNumber}</span>
                  )}
                </div>
                
                <p className={`text-[7px] font-semibold mt-1 text-center leading-tight max-w-[40px] ${
                  maxAllowedStep >= adjustedStep
                    ? "text-gray-900 dark:text-white" 
                    : "text-gray-400"
                }`}>
                  {step.label.length > 8 ? step.label.substring(0, 6) + '…' : step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current step info - Mobile */}
      <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0">
            Step {getAdjustedStepId(currentStep)}
          </span>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
            {filteredSteps.find(s => getAdjustedStepId(s.id) === getAdjustedStepId(currentStep))?.label || ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OffboardingHeader;