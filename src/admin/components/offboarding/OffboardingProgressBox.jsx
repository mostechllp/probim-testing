import React, { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useLocation } from "react-router-dom";

const STEPS = [
  { id: 1, name: "Initiation" },
  { id: 2, name: "Visa Cancel" },
  { id: 3, name: "Interview" },
  { id: 4, name: "Assets" },
  { id: 5, name: "Settlement" },
  { id: 6, name: "Letters" },
  { id: 7, name: "Checklist" },
];

const OffboardingProgressBox = ({ currentStep }) => {
  const [isVisaRequired, setIsVisaRequired] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const savedVisaSponsorship = localStorage.getItem("offboarding_visa_sponsorship");
    const urlParams = new URLSearchParams(location.search);
    const offboardingId = urlParams.get('id') || localStorage.getItem("offboarding_id");
    
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
  const displaySteps = isVisaRequired ? STEPS : STEPS.filter(s => s.id !== 2);
  const totalSteps = displaySteps.length;

  const getAdjustedStepId = (id) => {
    if (!isVisaRequired && id > 2) {
      return id - 1;
    }
    return id;
  };

  const adjustedCurrent = getAdjustedStepId(currentStep);
  // Subtract 1 because if you are ON step 1, 0 are complete. If on step 4, 3 are complete.
  // Exception: If currentStep is somehow greater than totalSteps, max out at totalSteps.
  const completedSteps = Math.min(totalSteps, Math.max(0, adjustedCurrent - 1));
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-6 sm:p-8 space-y-6">
      <div className="flex justify-between items-center text-sm font-bold">
        <span className="text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Offboarding Progress
        </span>
        <span className="text-green-600 dark:text-green-400">
          {progressPercentage}%
        </span>
      </div>

      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 dark:bg-green-600 transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>

      <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
        <span>Completed Steps: {completedSteps}</span>
        <span>Total Steps: {totalSteps}</span>
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
