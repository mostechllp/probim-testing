import React, { useState, useEffect } from "react";
import { FiCheck } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { setStep } from "../../store/slices/onboardingSlice";

const Stepper = ({ currentStep }) => {
  const dispatch = useDispatch();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const steps = [
    { id: 1, title: "Resume Upload", subtitle: "AI Parsing" },
    { id: 2, title: "Employee Details", subtitle: "Verify Info" },
    { id: 3, title: "Salary & Bank", subtitle: "Financials" },
    { id: 4, title: "Offer Letter", subtitle: "Generation" },
    { id: 5, title: "Review & Submit", subtitle: "Finalization" },
  ];

  const handleStepClick = (stepId) => {
    if (stepId < currentStep) {
      dispatch(setStep(stepId));
    }
  };

  const canNavigateToStep = (stepId) => {
    return stepId < currentStep;
  };

  // Mobile view: Show only numbers, no labels
  if (isMobile) {
    return (
      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step Item - Mobile (Numbers only) */}
              <div 
                className="flex flex-col items-center relative z-10"
                onClick={() => canNavigateToStep(step.id) && handleStepClick(step.id)}
                style={{ cursor: canNavigateToStep(step.id) ? 'pointer' : 'not-allowed' }}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                    currentStep > step.id
                      ? "bg-green-600 border-green-600 text-white shadow-sm shadow-green-500/20"
                      : currentStep === step.id
                      ? "bg-white dark:bg-gray-800 border-green-600 text-green-600 ring-4 ring-green-50 dark:ring-green-950/30"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400"
                  } ${canNavigateToStep(step.id) ? 'hover:scale-105' : 'opacity-60'}`}
                >
                  {currentStep > step.id ? (
                    <FiCheck size={18} strokeWidth={3} />
                  ) : (
                    <span className="font-bold text-sm">{step.id}</span>
                  )}
                </div>
              </div>

              {/* Connector Line - Mobile */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 bg-gray-100 dark:bg-gray-700">
                  <div 
                    className="h-full bg-green-600 transition-all duration-500 ease-in-out" 
                    style={{ width: currentStep > step.id ? "100%" : "0%" }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Current step indicator */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Step {currentStep} of {steps.length}
          </p>
        </div>
      </div>
    );
  }

  // Desktop view: Original layout with labels
  return (
    <div className="flex items-center justify-between w-full max-w-4xl mx-auto px-4 py-6">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          {/* Step Item */}
          <div 
            className="flex flex-col items-center relative z-10"
            onClick={() => canNavigateToStep(step.id) && handleStepClick(step.id)}
            style={{ cursor: canNavigateToStep(step.id) ? 'pointer' : 'not-allowed' }}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                currentStep > step.id
                  ? "bg-green-600 border-green-600 text-white shadow-sm shadow-green-500/20"
                  : currentStep === step.id
                  ? "bg-white dark:bg-gray-800 border-green-600 text-green-600 ring-4 ring-green-50 dark:ring-green-950/30"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400"
              } ${canNavigateToStep(step.id) ? 'hover:scale-105 hover:shadow-md' : 'opacity-60'}`}
            >
              {currentStep > step.id ? (
                <FiCheck size={20} strokeWidth={3} />
              ) : (
                <span className="font-bold">{step.id}</span>
              )}
            </div>
            
            <div className="mt-3 text-center">
              <p className={`text-sm font-semibold transition-colors ${
                currentStep >= step.id ? "text-gray-900 dark:text-white" : "text-gray-400"
              }`}>
                {step.title}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
                {step.subtitle}
              </p>
            </div>
          </div>

          {/* Connector Line */}
          {index < steps.length - 1 && (
            <div className="flex-1 h-0.5 mx-4 -mt-10 bg-gray-100 dark:bg-gray-700">
              <div 
                className="h-full bg-green-600 transition-all duration-500 ease-in-out" 
                style={{ width: currentStep > step.id ? "100%" : "0%" }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Stepper;