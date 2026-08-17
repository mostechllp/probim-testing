import React, { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const STEPS = [
  { id: 1, name: "Initiation" },
  { id: 2, name: "Assets" },
  { id: 3, name: "Settlement" },
  { id: 4, name: "Visa Cancel" },
  { id: 5, name: "Interview" },
  { id: 6, name: "Letters" },
  { id: 7, name: "Checklist" },
];

const OffboardingProgressBox = ({ 
  currentStep,
  apiProgressPercentage,
  completedStepsFromApi,
  totalStepsFromApi
}) => {
  const [isVisaRequired, setIsVisaRequired] = useState(true);
  const location = useLocation();
  const { currentProgress, currentOffboarding } = useSelector((state) => state.offboarding);

  useEffect(() => {
    const savedVisaSponsorship = localStorage.getItem("offboarding_visa_sponsorship");
    const urlParams = new URLSearchParams(location.search);
    const offboardingId = location.state?.id || urlParams.get('id') || localStorage.getItem("offboarding_id");
    
    if (savedVisaSponsorship) {
      setIsVisaRequired(savedVisaSponsorship !== "Not Applicable");
    } else if (offboardingId) {
      const sessionVisaStatus = sessionStorage.getItem(`visa_required_${offboardingId}`);
      if (sessionVisaStatus) {
        setIsVisaRequired(sessionVisaStatus === "true");
      }
    }
  }, [location.search]);

  // Adjust steps based on Visa
  const displaySteps = isVisaRequired ? STEPS : STEPS.filter(s => s.id !== 4);
  const totalSteps = displaySteps.length;

  const getAdjustedStepId = (id) => {
    if (!isVisaRequired && id > 4) {
      return id - 1;
    }
    return id;
  };

  const combinedStatus = currentProgress?.status ?? currentOffboarding?.status;
  
  let apiCalculatedStep = null;
  if (combinedStatus) {
     if (combinedStatus === "completed" || currentProgress?.progress_percentage === 100) apiCalculatedStep = 8;
     else if (combinedStatus.includes("visa")) apiCalculatedStep = 4;
     else if (combinedStatus.includes("checklist")) apiCalculatedStep = 7;
     else if (combinedStatus.includes("asset")) apiCalculatedStep = 2;
     else if (combinedStatus.includes("interview")) apiCalculatedStep = 5;
     else if (combinedStatus.includes("settlement")) apiCalculatedStep = 3;
     else if (combinedStatus.includes("letter")) apiCalculatedStep = 6;
  }

  const effectiveStep = apiCalculatedStep || currentStep;
  const adjustedCurrent = getAdjustedStepId(effectiveStep);
  
  const completedSteps = currentProgress?.completed_steps ?? Math.min(totalSteps, Math.max(0, adjustedCurrent - 1));
  const progressPercentage = currentProgress?.progress_percentage ?? (totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0);

  const displayProgressPercentage = apiProgressPercentage !== undefined ? apiProgressPercentage : progressPercentage;
  const displayCompletedSteps = completedStepsFromApi !== undefined ? completedStepsFromApi : completedSteps;
  const displayTotalSteps = totalStepsFromApi !== undefined ? totalStepsFromApi : (currentProgress?.total_steps ?? totalSteps);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-6 sm:p-8 space-y-6">
      <div className="flex justify-between items-center text-sm font-bold">
        <span className="text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Offboarding Progress
        </span>
        <span className="text-green-600 dark:text-green-400">
          {displayProgressPercentage}%
        </span>
      </div>

      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 dark:bg-green-600 transition-all duration-500 ease-out"
          style={{ width: `${displayProgressPercentage}%` }}
        ></div>
      </div>

      <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
        <span>Completed Steps: {displayCompletedSteps}</span>
        <span>Total Steps: {displayTotalSteps}</span>
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          Step Status
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {displaySteps.map((step) => {
            const adjustedStepId = getAdjustedStepId(step.id);
            const isCompleted = adjustedStepId < adjustedCurrent;
            const isActive = adjustedStepId === adjustedCurrent;
            
            return (
              <div key={step.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isCompleted 
                    ? "bg-green-500" 
                    : isActive 
                    ? "bg-blue-500 animate-pulse" 
                    : "bg-gray-300 dark:bg-gray-600"
                }`} />
                <span className={`text-sm font-medium ${isCompleted ? 'text-gray-500 dark:text-gray-400' : isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                  {step.name}
                </span>
                {isCompleted && (
                  <CheckCircle2 size={14} className="text-green-500 ml-1 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OffboardingProgressBox;
