import React, { useState, useEffect } from "react";
import { Laptop, AlertTriangle, Check, ArrowRight, ShieldAlert, Loader, SkipForward } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "../common/Toast";
import OffboardingHeader from "./OffboardingHeader";
import OffboardingProgressBox from "./OffboardingProgressBox";
import {
  fetchOffboardingById,
  updateAssets,
  fetchOffboardingProgress,
} from "../../store/slices/offboardingSlice";
import { fetchEmployeeById } from "../../store/slices/employeeSlice";
import { fetchEmployeeAssets } from "../../store/slices/assetSlice";

const AssetReturn = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const offboardingId = searchParams.get("id");
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeId, setEmployeeId] = useState(null);
  const [assets, setAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  
  // Redux state
  const { currentOffboarding, loading: offboardingLoading, currentProgress } = useSelector((state) => state.offboarding);
  const { currentEmployee } = useSelector((state) => state.employees);
  const { employeeAssets, loading: assetsLoading } = useSelector((state) => state.assets);

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

  // Fetch employee assets
  useEffect(() => {
    if (employeeId) {
      dispatch(fetchEmployeeAssets(employeeId));
    }
  }, [dispatch, employeeId]);

  // Load employee and offboarding data
  useEffect(() => {
    if (currentOffboarding && !offboardingLoading) {
      // Load employee name
      if (currentOffboarding.employee_name) {
        setEmployeeName(currentOffboarding.employee_name);
      }
      if (currentOffboarding.employee_id) {
        setEmployeeId(currentOffboarding.employee_id);
        dispatch(fetchEmployeeById(currentOffboarding.employee_id));
      }
      
      setLoading(false);
    }
  }, [currentOffboarding, offboardingLoading, dispatch]);

  // Update employee name when fetched
  useEffect(() => {
    if (currentEmployee) {
      setEmployeeName(`${currentEmployee.first_name} ${currentEmployee.last_name}`);
      setEmployeeId(currentEmployee.id);
    }
  }, [currentEmployee]);

  // Filter assets assigned to this employee
  useEffect(() => {
    if (employeeAssets.length > 0) {
      
      // Format assets for display
      const formattedAssets = employeeAssets.map(item => ({
        id: item.asset.id,
        name: item.asset.asset_name,
        assetId: item.asset.id,
        issuedOn: item.assigned_date 
          ? new Date(item.assigned_date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            }) 
          : "Not specified",
        status: "Pending",
        condition: "",
        assignmentId: item.assignment_id,
        assetData: item.asset,
        assignmentData: item
      }));
      
      setAssets(formattedAssets);
    } else {
      setAssets([]);
    }
  }, [employeeAssets]);

  const pendingCount = assets.filter(a => a.status === "Pending").length;

  const toggleSelection = (id) => {
    setSelectedAssets(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleMarkAsReturned = async () => {
    if (selectedAssets.length === 0) {
      showToast("Please select at least one pending asset", "error");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Update local state first for optimistic UI
      const updatedAssets = assets.map(asset => 
        selectedAssets.includes(asset.id) && asset.status === "Pending"
          ? { 
              ...asset, 
              status: "Returned", 
              condition: "Good",
              returnedDate: new Date().toISOString()
            }
          : asset
      );
      setAssets(updatedAssets);
      
      // Prepare assets payload for API
      const assetsData = {
        assets: updatedAssets.map(asset => ({
          asset_id: asset.id,
          asset_name: asset.name,
          returned: asset.status === "Returned",
          condition: asset.condition || null,
          returned_date: asset.status === "Returned" ? new Date().toISOString() : null
        })),
        assets_status: pendingCount - selectedAssets.length === 0 ? "completed" : "in_progress",
        updated_at: new Date().toISOString()
      };

      // Update assets via API
      const result = await dispatch(updateAssets({ 
        id: offboardingId || localStorage.getItem("offboarding_id"), 
        assetsData 
      })).unwrap();

      
      // Refresh progress after updating assets
      await dispatch(fetchOffboardingProgress(offboardingId || localStorage.getItem("offboarding_id")));

      setSelectedAssets([]);
      showToast(`${selectedAssets.length} asset(s) marked as returned successfully`, "success");
      
    } catch (error) {
      console.error("Update assets error:", error);
      showToast(error || "Failed to update assets. Please try again.", "error");
      
      // Revert optimistic update on error - refetch assets
      if (employeeId) {
        dispatch(fetchEmployeeAssets(employeeId));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportDamage = async () => {
    if (selectedAssets.length === 0) {
      showToast("Please select at least one asset", "error");
      return;
    }
    
    showToast("Damage report feature coming soon. Please contact HR directly.", "info");
  };

  const handleSkipStep = async () => {
    setIsSkipping(true);
    
    try {
      // Update the offboarding step to skip assets
      const offboardingIdValue = offboardingId || localStorage.getItem("offboarding_id");
      
      // Prepare payload to mark assets step as completed/skipped
      const assetsData = {
        assets: [],
        assets_status: "skipped",
        skipped: true,
        skipped_reason: "No assets assigned to employee",
        updated_at: new Date().toISOString()
      };

      // Update assets via API to mark step as completed
      await dispatch(updateAssets({ 
        id: offboardingIdValue, 
        assetsData 
      })).unwrap();

      // Refresh progress after skipping
      await dispatch(fetchOffboardingProgress(offboardingIdValue));
      
      showToast("Assets step skipped. Proceeding to Final Settlement.", "success");
      
      // Navigate to next step
      navigate(`/admin/employees/final-settlement?id=${offboardingIdValue}`);
      
    } catch (error) {
      console.error("Skip step error:", error);
      showToast(error || "Failed to skip step. Please try again.", "error");
    } finally {
      setIsSkipping(false);
    }
  };

  const handleProceedToSettlement = () => {
    navigate(`/admin/employees/final-settlement?id=${offboardingId || localStorage.getItem("offboarding_id")}`);
  };

  // Calculate progress from API
  const apiProgressPercentage = currentProgress?.progress_percentage || 0;
  const completedStepsFromApi = currentProgress?.completed_steps || 0;
  const totalStepsFromApi = currentProgress?.total_steps || 7;
  
  // Calculate local assets progress
  const returnedCount = assets.filter(a => a.status === "Returned").length;
  const assetsProgressPercentage = assets.length > 0 ? Math.round((returnedCount / assets.length) * 100) : 100;
  
  // Check if no assets are available
  const hasNoAssets = assets.length === 0 && !assetsLoading;

  // Loading state
  if (loading || offboardingLoading || assetsLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/40 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <OffboardingHeader currentStep={4} />
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading asset details...</p>
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
        <OffboardingHeader currentStep={4} />
        
        {/* Progress Box */}
        <OffboardingProgressBox currentStep={4} />

        {/* Main Content Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-6 sm:p-8 space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Asset return
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
            
            <div className="flex items-center gap-2">
              {hasNoAssets ? (
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                  <SkipForward size={12} />
                  No assets assigned
                </span>
              ) : (
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1.5 ${pendingCount > 0 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60' : 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 border border-green-200/60 dark:border-green-900/60'}`}>
                  {pendingCount > 0 ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  ) : (
                    <Check size={12} />
                  )}
                  {pendingCount} pending
                </span>
              )}
            </div>
          </div>



          {/* Asset Progress - Only show if there are assets */}
          {!hasNoAssets && assets.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Asset Return Progress
                </span>
                <span className="text-green-600 dark:text-green-400">{assetsProgressPercentage}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 dark:bg-blue-600 transition-all duration-500 ease-out" 
                  style={{ width: `${assetsProgressPercentage}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* No Assets Message with Skip Button */}
          {hasNoAssets ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/30 rounded-xl space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Laptop size={32} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">
                    No Assets Assigned
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    This employee doesn't have any company assets assigned to them.
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                    You can skip this step and proceed to the Final Settlement.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleSkipStep}
                  disabled={isSkipping}
                  className="px-6 py-2.5 rounded-full font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSkipping ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
                      Skipping...
                    </>
                  ) : (
                    <>
                      <SkipForward size={18} />
                      Skip This Step
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleProceedToSettlement}
                  className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  Proceed to Final Settlement
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Asset Table */}
              <div className="overflow-hidden border border-gray-200/60 dark:border-gray-700/60 rounded-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200/60 dark:border-gray-700/60 text-xs uppercase font-bold text-gray-500 dark:text-gray-400">
                      <tr>
                        <th scope="col" className="p-4 w-12 text-center">#</th>
                        <th scope="col" className="p-4">Asset</th>
                        <th scope="col" className="p-4">Asset ID</th>
                        <th scope="col" className="p-4">Issued on</th>
                        <th scope="col" className="p-4">Status</th>
                        <th scope="col" className="p-4">Condition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/60 dark:divide-gray-700/60">
                      {assets.map((asset) => (
                        <tr 
                          key={asset.id} 
                          className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${selectedAssets.includes(asset.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                        >
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedAssets.includes(asset.id)}
                              onChange={() => toggleSelection(asset.id)}
                              disabled={asset.status === "Returned"}
                              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                           </td>
                          <td className="p-4 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Laptop size={16} className="text-gray-400" />
                            {asset.name}
                           </td>
                          <td className="p-4 font-mono text-xs">{asset.assetId}</td>
                          <td className="p-4">{asset.issuedOn}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 ${asset.status === 'Returned' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                              {asset.status === 'Returned' ? <Check size={12} /> : <Loader size={12} className="animate-spin" />}
                              {asset.status}
                            </span>
                           </td>
                          <td className="p-4 text-xs font-medium">
                            {asset.condition || <span className="text-gray-400 dark:text-gray-600">—</span>}
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex gap-4">
                  <button
                    onClick={handleReportDamage}
                    disabled={isSubmitting || assets.length === 0}
                    className="px-5 py-2.5 rounded-full font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <AlertTriangle size={18} />
                    Report damage
                  </button>
                  
                  <button
                    onClick={handleMarkAsReturned}
                    disabled={isSubmitting || selectedAssets.length === 0 || assets.length === 0}
                    className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        Mark as returned
                      </>
                    )}
                  </button>
                </div>
                
                <button
                  onClick={handleProceedToSettlement}
                  className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  Proceed to Final Settlement
                  <ArrowRight size={18} />
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default AssetReturn;