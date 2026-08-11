/* eslint-disable react-hooks/static-components */
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { FiEdit3, FiInfo, FiChevronRight, FiChevronLeft, FiSave, FiPlus, FiLoader } from "react-icons/fi";
import { 
  setStep, 
  updateEmployeeDetails, 
  resetOnboarding,
  saveOnboardingDetails 
} from "../../store/slices/onboardingSlice";
import { showToast } from "../../components/common/Toast";
import DateInput from "../common/DateInput";
import { fetchDepartments } from "../../store/slices/departmentSlice";
import { fetchDesignations } from "../../store/slices/designationSlice";

const EmployeeDetailsForm = () => {
  const dispatch = useDispatch();
  const onboardingState = useSelector((state) => state.onboarding) || {};
  const { employeeDetails = {}, isLoading = false } = onboardingState;
  
  // Get departments and designations from Redux store
  const { departments = [], loading: departmentsLoading } = useSelector((state) => state.departments || {});
  const { designations = [], loading: designationsLoading } = useSelector((state) => state.designations || {});
  
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [showAddDesignation, setShowAddDesignation] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDesignationName, setNewDesignationName] = useState("");
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [isAddingDesignation, setIsAddingDesignation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    watch,
    trigger,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: employeeDetails,
  });


  // Fetch departments and designations on component mount
  useEffect(() => {
    dispatch(fetchDepartments());
    dispatch(fetchDesignations());
  }, [dispatch]);

  // Re-initialize form whenever Redux parsed data changes (e.g. after AI resume parsing)
  useEffect(() => {
    if (employeeDetails && Object.keys(employeeDetails).length > 0) {
      reset(employeeDetails);
    }
  }, [employeeDetails, reset]);

  // ─── Submit Form ──────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    
    try {
      // ─── PREPARE PAYLOAD ──────────────────────────────────────────────────
      // Format the payload to match API expectations
      const payload = {
        fullName: data.fullName,
        email: data.email,
        // Use phone as personal_number (the API requires personal_number)
        personal_number: data.phone || data.personalNumber || "",
        phone: data.phone || "", // Also send phone separately if needed
        nationality: data.nationality,
        address: data.address,
        designation: data.designation,
        department: data.department,
        skills: data.skills,
        experience: data.experience,
        education: data.education,
        joiningDate: data.joiningDate,
        paymentCycle: data.paymentCycle || "Monthly",
        // Include packages if they exist
        packages: data.packages || {
          package1: {
            id: "package1",
            name: "Package 1 - Home Country / WFH",
            currency: "AED",
            salaryComponents: [],
            isSaved: false,
            totalSalary: 0,
            packageId: null
          },
          package2: {
            id: "package2",
            name: "Package 2 - Dubai Onsite",
            currency: "AED",
            salaryComponents: [],
            isSaved: false,
            totalSalary: 0,
            packageId: null
          }
        },
        bankAccounts: data.bankAccounts || [],
        // Include fileName if available from resume upload
        fileName: data.fileName || onboardingState.resumeData?.fileName || null,
      };
      
      // First, update local Redux state
      dispatch(updateEmployeeDetails(data));
      
      // ─── CALL API TO SAVE EMPLOYEE DETAILS ─────────────────────────────
      const result = await dispatch(saveOnboardingDetails(payload)).unwrap();
      
      // Extract IDs from the response
      const employeeId = result?.data?.id || result?.id;
      const userId = result?.data?.user_id || result?.user_id || result?.data?.userId || result?.userId;
      
      // Store the IDs
      const updates = {};
      
      if (employeeId) {
        updates.id = employeeId;
        localStorage.setItem('employeeId', employeeId);
      }
      
      if (userId) {
        // This is the employee's user ID - this is what we need for fetching salary packages
        updates.userId = userId;
        updates.user_id = userId;
        localStorage.setItem('employeeUserId', userId);
        localStorage.setItem('onboardingEmployeeUserId', userId);
      }
      
      // Update Redux with the IDs
      if (Object.keys(updates).length > 0) {
        dispatch(updateEmployeeDetails(updates));
      }
      
      // Also update the draft in localStorage with the new IDs
      const draftStr = localStorage.getItem("onboarding-draft");
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          if (!draft.employeeDetails) draft.employeeDetails = {};
          draft.employeeDetails = { ...draft.employeeDetails, ...updates };
          localStorage.setItem("onboarding-draft", JSON.stringify(draft));
        } catch (err) {
          console.error("Failed to update draft with IDs:", err);
        }
      }
      
      showToast('Employee details saved successfully!', 'success');
      
      // Move to next step (Step 3 - Salary & Bank Details)
      dispatch(setStep(3));
      
    } catch (error) {
      console.error('[EmployeeDetailsForm] Failed to save employee details:', error);
      
      // Handle validation errors from the API
      if (error?.errors) {
        const errorMessages = Object.values(error.errors).flat().join(', ');
        showToast(`Validation error: ${errorMessages}`, 'error');
      } else if (error?.message) {
        showToast(error.message, 'error');
      } else {
        showToast('Failed to save employee details. Please try again.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Handle Back ──────────────────────────────────────────────────────────
  const handleBack = () => {
    // Check if we have saved data, if so, just go back to step 1
    const hasSavedData = localStorage.getItem('employeeId') || localStorage.getItem('employeeUserId');
    if (hasSavedData) {
      // If we have saved data, just go back to step 1
      dispatch(setStep(1));
    } else {
      // Otherwise reset the entire onboarding
      dispatch(resetOnboarding());
    }
  };

  // ─── Handle Save Draft ────────────────────────────────────────────────────
  const handleSaveDraft = () => {
    const currentData = getValues();
    
    // Include any existing IDs in the draft
    const existingIds = {};
    if (localStorage.getItem('employeeId')) {
      existingIds.id = localStorage.getItem('employeeId');
    }
    if (localStorage.getItem('employeeUserId')) {
      existingIds.userId = localStorage.getItem('employeeUserId');
      existingIds.user_id = localStorage.getItem('employeeUserId');
    }
    
    const draftState = {
      ...onboardingState,
      employeeDetails: { 
        ...onboardingState.employeeDetails, 
        ...currentData,
        ...existingIds 
      }
    };
    localStorage.setItem("onboarding-draft", JSON.stringify(draftState));
    showToast("Draft saved successfully!", "success");
  };

  // ─── Add Department ──────────────────────────────────────────────────────
  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) {
      showToast("Please enter department name", "error");
      return;
    }
    
    setIsAddingDepartment(true);
    try {
      const { addDepartment } = await import("../../store/slices/departmentSlice");
      const result = await dispatch(addDepartment({ name: newDepartmentName.trim() })).unwrap();
      if (result) {
        showToast("Department added successfully!", "success");
        setNewDepartmentName("");
        setShowAddDepartment(false);
        // Auto-select the newly added department
        setValue("department", result.name);
      }
    } catch (error) {
      showToast(error || "Failed to add department", "error");
    } finally {
      setIsAddingDepartment(false);
    }
  };

  // ─── Add Designation ──────────────────────────────────────────────────────
  const handleAddDesignation = async () => {
    if (!newDesignationName.trim()) {
      showToast("Please enter designation name", "error");
      return;
    }
    
    setIsAddingDesignation(true);
    try {
      const { addDesignation } = await import("../../store/slices/designationSlice");
      const result = await dispatch(addDesignation({ name: newDesignationName.trim() })).unwrap();
      if (result) {
        showToast("Designation added successfully!", "success");
        setNewDesignationName("");
        setShowAddDesignation(false);
        // Auto-select the newly added designation
        setValue("designation", result.name);
      }
    } catch (error) {
      showToast(error || "Failed to add designation", "error");
    } finally {
      setIsAddingDesignation(false);
    }
  };

  // ─── Input Field Component ──────────────────────────────────────────────
  const InputField = ({ label, name, type = "text", placeholder, options = null, loading = false }) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative group">
        {options ? (
          <div className="relative">
            <select
              {...register(name, { required: `${label} is required` })}
              className={`w-full px-4 py-2.5 bg-white dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white transition-all duration-200 outline-none appearance-none ${
                errors[name]
                  ? "border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
              }`}
              disabled={loading}
            >
              <option value="">Select {label}</option>
              {options.map(opt => (
                <option key={typeof opt === 'object' ? opt.id : opt} value={typeof opt === 'object' ? opt.name : opt}>
                  {typeof opt === 'object' ? opt.name : opt}
                </option>
              ))}
            </select>
            
            {/* Add button for department/designation */}
            {(name === "department" || name === "designation") && (
              <button
                type="button"
                onClick={() => name === "department" ? setShowAddDepartment(true) : setShowAddDesignation(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                title={`Add new ${label}`}
              >
                <FiPlus size={16} />
              </button>
            )}
          </div>
        ) : (
          <input
            type={type}
            placeholder={placeholder}
            {...register(name, { required: `${label} is required` })}
            className={`w-full px-4 py-2.5 bg-white dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white transition-all duration-200 outline-none ${
              errors[name]
                ? "border-red-500 focus:ring-4 focus:ring-red-500/10"
                : "border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
            }`}
          />
        )}
      </div>
      {errors[name] && (
        <p className="text-xs font-medium text-red-500 mt-1">{errors[name].message}</p>
      )}
      {loading && (
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <FiLoader size={12} className="animate-spin" />
          Loading...
        </p>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      {/* Add Department Modal */}
      {showAddDepartment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Add New Department</h3>
            <input
              type="text"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              placeholder="Enter department name"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleAddDepartment()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddDepartment(false);
                  setNewDepartmentName("");
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDepartment}
                disabled={isAddingDepartment}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isAddingDepartment ? <FiLoader className="animate-spin" size={16} /> : <FiPlus size={16} />}
                {isAddingDepartment ? "Adding..." : "Add Department"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Designation Modal */}
      {showAddDesignation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Add New Designation</h3>
            <input
              type="text"
              value={newDesignationName}
              onChange={(e) => setNewDesignationName(e.target.value)}
              placeholder="Enter designation name"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleAddDesignation()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddDesignation(false);
                  setNewDesignationName("");
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDesignation}
                disabled={isAddingDesignation}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isAddingDesignation ? <FiLoader className="animate-spin" size={16} /> : <FiPlus size={16} />}
                {isAddingDesignation ? "Adding..." : "Add Designation"}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Form Header */}
          <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl flex items-center justify-center">
                <FiInfo size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Verify Employee Details</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Data auto-extracted from resume</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
            >
              <FiSave size={16} />
              Save Draft
            </button>
          </div>

          {/* Form Body */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <InputField label="Full Name" name="fullName" placeholder="Enter full name" />
            <InputField label="Email Address" name="email" type="email" placeholder="email@example.com" />
            
            {/* Phone Number - This will be sent as personal_number to the API */}
            <InputField 
              label="Personal Number / Phone" 
              name="phone" 
              placeholder="+971 -- --- ----" 
            />
            
            <InputField
              label="Nationality"
              name="nationality"
              options={["United Arab Emirates", "India", "Pakistan", "United Kingdom", "United States", "Philippines"]}
            />
            <div className="md:col-span-2">
              <InputField label="Current Address" name="address" placeholder="Residential address" />
            </div>
            
            {/* Designation Field with API data */}
            <InputField 
              label="Designation" 
              name="designation" 
              options={designations.map(d => d.name)}
              loading={designationsLoading}
            />
            
            {/* Department Field with API data */}
            <InputField 
              label="Department" 
              name="department" 
              options={departments.map(d => d.name)}
              loading={departmentsLoading}
            />
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Joining Date
              </label>
              <Controller
                name="joiningDate"
                control={control}
                rules={{ required: "Joining Date is required" }}
                render={({ field }) => (
                  <DateInput
                    {...field}
                    type="joining"
                    placeholder="dd/mm/yyyy"
                    error={!!errors.joiningDate}
                    className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !rounded-xl !text-gray-900 dark:!text-white !px-4 !py-2.5 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
                  />
                )}
              />
              {errors.joiningDate && (
                <p className="text-xs font-medium text-red-500 mt-1">{errors.joiningDate.message}</p>
              )}
            </div>
            
            <InputField label="Experience Level" name="experience" placeholder="e.g. 5 Years" />
            
            <div className="md:col-span-2">
              <InputField label="Key Skills" name="skills" placeholder="React, Tailwind, Node.js etc." />
            </div>
            
            <div className="md:col-span-2">
              <InputField label="Highest Education" name="education" placeholder="University Degree etc." />
            </div>
          </div>

          {/* Form Footer */}
          <div className="px-8 py-6 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              <FiChevronLeft size={20} />
              Back
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <FiLoader className="animate-spin" size={16} />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <FiChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EmployeeDetailsForm;