import React, { useState, useEffect } from "react";
import { Calendar, Save, CheckCircle2, MessageSquare, Star, ArrowRight, Loader } from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "../common/Toast";
import OffboardingHeader from "./OffboardingHeader";
import OffboardingProgressBox from "./OffboardingProgressBox";
import { fetchOffboardingById, submitInterview, saveOffboardingDraft, fetchOffboardingProgress } from "../../store/slices/offboardingSlice";
import { fetchEmployeeById } from "../../store/slices/employeeSlice";

const ExitInterview = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const offboardingId = location.state?.id || searchParams.get("id");
  const isViewMode = !!location.state?.isView;

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [interviewData, setInterviewData] = useState({
    interviewer: "",
    interviewDate: "",
    interviewMode: "",
    overallSatisfaction: "",
    primaryReason: "",
    workLifeBalance: "",
    managerRelationship: "",
    enjoyedMost: "",
    areasForImprovement: "",
    wouldRecommend: "",
    additionalComments: ""
  });

  // Redux state
  const { currentOffboarding, loading: offboardingLoading, currentProgress } = useSelector((state) => state.offboarding);
  const { currentEmployee } = useSelector((state) => state.employees);

  // Fetch offboarding details on component mount
  useEffect(() => {
    if (offboardingId) {
      dispatch(fetchOffboardingById(offboardingId));
      dispatch(fetchOffboardingProgress(offboardingId));
    } else {
      const storedOffboardingId = localStorage.getItem("offboarding_id");
      if (storedOffboardingId) {
        dispatch(fetchOffboardingById(storedOffboardingId));
        dispatch(fetchOffboardingProgress(storedOffboardingId));
      } else {
        setLoading(false);
        showToast("No offboarding session found. Please start from initiation.", "warning");
      }
    }
  }, [dispatch, offboardingId]);

  // Load interview data from API
  useEffect(() => {
    if (currentOffboarding && !offboardingLoading) {
      // Load employee name
      if (currentOffboarding.employee_name) {
        setEmployeeName(currentOffboarding.employee_name);
      } else if (currentOffboarding.employee_id && String(currentEmployee?.id) !== String(currentOffboarding.employee_id)) {
        dispatch(fetchEmployeeById(currentOffboarding.employee_id));
      }

      // Load interview data from API if available
      const interviewDataSrc = currentOffboarding.interview || currentOffboarding.exit_interview || currentOffboarding;
      
      if (interviewDataSrc && (interviewDataSrc.interviewer || interviewDataSrc.overall_satisfaction || interviewDataSrc.exit_interview_status || currentOffboarding.interview || currentOffboarding.exit_interview)) {
        const fallbackNotes = interviewDataSrc.additional_comments || 
                              currentOffboarding.additional_comments ||
                              interviewDataSrc.additionalComments ||
                              currentOffboarding.additionalComments ||
                              interviewDataSrc.notes || 
                              interviewDataSrc.comments ||
                              interviewDataSrc.remarks ||
                              currentOffboarding.remarks ||
                              interviewDataSrc.exit_interview_notes || 
                              currentOffboarding.exit_interview_notes || "";
                              
        setInterviewData(prev => ({
          ...prev,
          interviewer: interviewDataSrc.interviewer || "",
          interviewDate: interviewDataSrc.interview_date || prev.interviewDate,
          interviewMode: interviewDataSrc.interview_mode || "",
          overallSatisfaction: interviewDataSrc.overall_satisfaction || "",
          primaryReason: interviewDataSrc.primary_reason || "",
          workLifeBalance: interviewDataSrc.work_life_balance || "",
          managerRelationship: interviewDataSrc.manager_relationship || "",
          enjoyedMost: interviewDataSrc.enjoyed_most || "",
          areasForImprovement: interviewDataSrc.areas_for_improvement || "",
          wouldRecommend: interviewDataSrc.would_recommend !== undefined ? interviewDataSrc.would_recommend : "",
          additionalComments: fallbackNotes
        }));
      }

      // Set interview date if not already set
      if (!interviewData.interviewDate) {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        setInterviewData(prev => ({
          ...prev,
          interviewDate: defaultDate.toISOString().split('T')[0]
        }));
      }

      setLoading(false);
    }
  }, [currentOffboarding, offboardingLoading, dispatch, currentEmployee]);

  // Update employee name when fetched
  useEffect(() => {
    if (currentEmployee && String(currentEmployee.id) === String(currentOffboarding?.employee_id)) {
      setEmployeeName(`${currentEmployee.first_name} ${currentEmployee.last_name}`);
    }
  }, [currentEmployee, currentOffboarding?.employee_id]);

  const handleInputChange = (field, value) => {
    setInterviewData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare interview payload
      const interviewPayload = {
        offboarding_id: offboardingId || localStorage.getItem("offboarding_id"),
        interviewer: interviewData.interviewer,
        interview_date: interviewData.interviewDate,
        interview_mode: interviewData.interviewMode,
        overall_satisfaction: interviewData.overallSatisfaction,
        primary_reason: interviewData.primaryReason,
        work_life_rating: parseInt(interviewData.workLifeBalance),
        manager_relationship_rating: parseInt(interviewData.managerRelationship),
        enjoyed_most: interviewData.enjoyedMost || "None",
        areas_for_improvement: interviewData.areasForImprovement || "None",
        would_recommend: interviewData.wouldRecommend === "yes",
        additional_comments: interviewData.additionalComments || "None",
        notes: interviewData.additionalComments || "None",
        exit_interview_notes: interviewData.additionalComments || "None",
        remarks: interviewData.additionalComments || "None",
        submitted_at: new Date().toISOString(),
        status: "completed",
        exit_interview_status: "completed",
        interview_status: "completed"
      };

      // Submit interview via API
      const result = await dispatch(submitInterview({
        id: offboardingId || localStorage.getItem("offboarding_id"),
        interviewData: interviewPayload
      })).unwrap();

      // Refresh progress after submitting interview
      await dispatch(fetchOffboardingProgress(offboardingId || localStorage.getItem("offboarding_id")));

      showToast("Exit interview submitted successfully", "success");

      setTimeout(() => {
        navigate(`/admin/employees/letters-and-clearance?id=${offboardingId || localStorage.getItem("offboarding_id")}`);
      }, 1500);
    } catch (error) {
      console.error("Submit interview error:", error);
      showToast(error || "Failed to submit interview. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);

    try {
      // Prepare draft payload
      const draftPayload = {
        interview: {
          interviewer: interviewData.interviewer,
          interview_date: interviewData.interviewDate,
          interview_mode: interviewData.interviewMode,
          overall_satisfaction: interviewData.overallSatisfaction,
          primary_reason: interviewData.primaryReason,
          work_life_rating: parseInt(interviewData.workLifeBalance),
          manager_relationship_rating: parseInt(interviewData.managerRelationship),
          enjoyed_most: interviewData.enjoyedMost || "None",
          areas_for_improvement: interviewData.areasForImprovement || "None",
          would_recommend: interviewData.wouldRecommend === "yes",
          additional_comments: interviewData.additionalComments || "None",
          notes: interviewData.additionalComments || "None",
          exit_interview_notes: interviewData.additionalComments || "None",
          remarks: interviewData.additionalComments || "None",
          draft_saved_at: new Date().toISOString()
        }
      };

      // Save draft via API
      await dispatch(saveOffboardingDraft({
        id: offboardingId || localStorage.getItem("offboarding_id"),
        ...draftPayload
      })).unwrap();

      // Also save to localStorage as backup
      localStorage.setItem("exit_interview_draft", JSON.stringify(interviewData));

      showToast("Exit interview saved as draft", "success");
    } catch (error) {
      console.error("Save draft error:", error);
      // Fallback to localStorage only
      localStorage.setItem("exit_interview_draft", JSON.stringify(interviewData));
      showToast("Draft saved locally", "info");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem("exit_interview_draft");
    if (draft && !currentOffboarding?.interview) {
      const parsedDraft = JSON.parse(draft);
      setInterviewData(prev => ({ ...prev, ...parsedDraft }));
    }
  }, []);

  // Calculate progress from API
  const apiProgressPercentage = currentProgress?.progress_percentage || 0;
  const completedStepsFromApi = currentProgress?.completed_steps || 0;
  const totalStepsFromApi = currentProgress?.total_steps || 7;

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Loading state
  if (loading || offboardingLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/40 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <OffboardingHeader currentStep={5} />
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading interview details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* SaaS Offboarding Header */}
        <OffboardingHeader currentStep={5} />

        {/* Progress Box */}
        <OffboardingProgressBox 
          currentStep={5} 
          apiProgressPercentage={apiProgressPercentage}
          completedStepsFromApi={completedStepsFromApi}
          totalStepsFromApi={totalStepsFromApi}
        />

        {/* Main Content Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-6 sm:p-8 space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <MessageSquare size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {isViewMode ? "View Exit Interview" : "Exit interview form"}
                </h1>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">
                  {employeeName || "Employee"}
                </p>
                {currentOffboarding && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Offboarding ID: {currentOffboarding.id}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                <Calendar size={14} />
                Scheduled - {formatDisplayDate(interviewData.interviewDate)}
              </span>
            </div>
          </div>



          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <fieldset disabled={isViewMode} className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

              {/* Interview Details Section */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50 items-start">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Interviewer
                  </label>
                  <input
                    type="text"
                    value={interviewData.interviewer}
                    onChange={(e) => handleInputChange("interviewer", e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Interview date
                  </label>
                  <input
                    type="date"
                    value={interviewData.interviewDate}
                    onChange={(e) => handleInputChange("interviewDate", e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Interview mode
                  </label>
                  <select
                    value={interviewData.interviewMode}
                    onChange={(e) => handleInputChange("interviewMode", e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  >
                    <option value="" disabled>Select mode</option>
                    <option value="In person">In person</option>
                    <option value="Video call">Video call</option>
                    <option value="Phone">Phone</option>
                  </select>
                </div>
              </div>

              {/* Core Feedback Section */}
              <div className="md:col-span-2 mt-4 mb-2">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">
                  Employee Feedback
                </h3>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Overall satisfaction
                </label>
                <select
                  value={interviewData.overallSatisfaction}
                  onChange={(e) => handleInputChange("overallSatisfaction", e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                >
                  <option value="" disabled>Select satisfaction</option>
                  <option value="Satisfied">Satisfied</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Dissatisfied">Dissatisfied</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Primary reason for leaving
                </label>
                <select
                  value={interviewData.primaryReason}
                  onChange={(e) => handleInputChange("primaryReason", e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                >
                  <option value="" disabled>Select reason</option>
                  <option value="Better opportunity">Better opportunity</option>
                  <option value="Relocation">Relocation</option>
                  <option value="Career change">Career change</option>
                  <option value="Personal reasons">Personal reasons</option>
                  <option value="Salary">Salary</option>
                  <option value="Work culture">Work culture</option>
                </select>
              </div>

              {/* Ratings */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Work-life balance rating (Out of 5)
                </label>
                <div className="relative">
                  <select
                    value={interviewData.workLifeBalance}
                    onChange={(e) => handleInputChange("workLifeBalance", e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none"
                  >
                    <option value="" disabled>Select rating</option>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Very Good</option>
                    <option value="3">3 - Average</option>
                    <option value="2">2 - Poor</option>
                    <option value="1">1 - Terrible</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-0.5 text-amber-400">
                    <Star size={14} className="fill-amber-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Manager relationship rating (Out of 5)
                </label>
                <div className="relative">
                  <select
                    value={interviewData.managerRelationship}
                    onChange={(e) => handleInputChange("managerRelationship", e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none"
                  >
                    <option value="" disabled>Select rating</option>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Very Good</option>
                    <option value="3">3 - Average</option>
                    <option value="2">2 - Poor</option>
                    <option value="1">1 - Terrible</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-0.5 text-amber-400">
                    <Star size={14} className="fill-amber-400" />
                  </div>
                </div>
              </div>

              {/* Free Text Answers */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  What did you like the most?
                </label>
                <textarea
                  rows={2}
                  value={interviewData.enjoyedMost}
                  onChange={(e) => handleInputChange("enjoyedMost", e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  placeholder="Share what you liked the most about working here..."
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Areas for improvement
                </label>
                <textarea
                  rows={2}
                  value={interviewData.areasForImprovement}
                  onChange={(e) => handleInputChange("areasForImprovement", e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  placeholder="What could we improve?"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Additional comments
                </label>
                <textarea
                  rows={2}
                  value={interviewData.additionalComments}
                  onChange={(e) => handleInputChange("additionalComments", e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  placeholder="Any other comments you'd like to share?"
                />
              </div>

              {/* Recommendation */}
              <div className="space-y-2 md:col-span-2 pb-4 border-b border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Would you recommend us?
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recommend"
                      value="yes"
                      checked={interviewData.wouldRecommend === "yes"}
                      onChange={(e) => handleInputChange("wouldRecommend", e.target.value)}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recommend"
                      value="no"
                      checked={interviewData.wouldRecommend === "no"}
                      onChange={(e) => handleInputChange("wouldRecommend", e.target.value)}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">No</span>
                  </label>
                </div>
              </div>

            </div>
            </fieldset>

            {/* Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end items-center gap-3 pt-2">
              {isViewMode ? (
                <button
                  type="button"
                  onClick={() => navigate(`/admin/employees/letters-and-clearance?id=${offboardingId}`, { state: { id: offboardingId, isView: true } })}
                  className="px-6 py-2.5 rounded-full font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                >
                  Next Step <ArrowRight size={16} />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="px-6 py-2.5 rounded-full font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSavingDraft ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save draft
                      </>
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Submit interview
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};

export default ExitInterview;