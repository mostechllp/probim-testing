import React, { useState, useEffect } from "react";
import { Laptop, AlertTriangle, Check, ArrowRight, ShieldAlert, Loader, SkipForward, Plus, X } from "lucide-react";
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
import apiClient from "../../../utils/apiClient";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: "", assetId: "", issuedOn: "" });
  const [showReturnDateModal, setShowReturnDateModal] = useState(false);
  const [currentAssetForReturn, setCurrentAssetForReturn] = useState(null);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnCondition, setReturnCondition] = useState("");
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
        status: (item.status?.toLowerCase() === 'returned' || item.status?.toLowerCase() === 'revoked' || item.assignment_status?.toLowerCase() === 'returned' || item.returned_date || item.asset?.status?.toLowerCase() === 'returned' || item.asset?.status?.toLowerCase() === 'revoked') ? "Returned" : "Pending",
        returnedDate: item.returned_date || null,
        condition: item.return_condition || "",
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

  const handleRevokeClick = (id) => {
    setCurrentAssetForReturn(id);
    setReturnDate(new Date().toISOString().split('T')[0]);
    setReturnCondition("");
    setShowReturnDateModal(true);
  };

  const handleConfirmReturnDate = async () => {
    if (!currentAssetForReturn) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        returned_date: returnDate
      };
      
      if (returnCondition) {
        payload.return_condition = returnCondition;
      }
      
      await apiClient.post(`/admin/assets/${currentAssetForReturn}/revoke`, payload);
      
      setAssets(assets.map(a => a.id === currentAssetForReturn ? { ...a, status: 'Returned', returnedDate: returnDate, condition: returnCondition } : a));
      showToast("Asset revoked successfully", "success");
    } catch (error) {
      console.error("Failed to revoke asset:", error);
      showToast("Failed to revoke asset. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
      setShowReturnDateModal(false);
      setCurrentAssetForReturn(null);
    }
  };

  const handleAddAsset = async () => {
    if (!newAsset.name) {
      showToast("Asset name is required", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create asset in backend first
      const response = await apiClient.post('/admin/assets', {
        asset_name: newAsset.name
      });
      
      const createdAssetId = response.data?.data?.id || response.data?.id;
      
      if (!createdAssetId) {
        throw new Error("Failed to retrieve new asset ID");
      }
      
      // Immediately assign it to the employee
      await apiClient.post(`/admin/assets/${createdAssetId}/assign`, {
        employee_id: employeeId,
        assigned_date: newAsset.issuedOn || new Date().toISOString().split('T')[0]
      });
      
      // Fetch the latest assets to ensure UI is perfectly in sync with the backend
      dispatch(fetchEmployeeAssets(employeeId));
      
      setShowAddModal(false);
      setNewAsset({ name: "", assetId: "", issuedOn: "" });
      showToast("Asset added successfully", "success");
    } catch (error) {
      console.error("Failed to add asset to backend:", error);
      showToast("Failed to create asset. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Removed handleMarkAsReturned and handleReportDamage

  const handleSkipStep = async () => {
    setIsSkipping(true);
    
    try {
      // Update the offboarding step to skip assets
      const offboardingIdValue = offboardingId || localStorage.getItem("offboarding_id");
      
      // Prepare payload to mark assets step as completed/skipped
      const assetsData = {
        offboarding_id: offboardingIdValue,
        assets: [],
        assets_status: "completed",
        asset_return_status: "completed",
        status: "completed",
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

  const handleProceedToSettlement = async () => {
    setIsSubmitting(true);
    const offboardingIdValue = offboardingId || localStorage.getItem("offboarding_id");
    
    try {
      const assetsPayload = assets.map(asset => ({
        id: asset.assetId || asset.id,
        asset_id: asset.assetId || asset.id,
        offboarding_id: offboardingIdValue,
        name: asset.name,
        returned_date: asset.returnedDate || null,
        return_condition: asset.condition || "",
        status: asset.status === 'Returned' ? 'returned' : 'pending',
        assignment_id: asset.assignmentId || null
      }));

      await dispatch(updateAssets({ 
        id: offboardingIdValue, 
        assetsData: {
          offboarding_id: offboardingIdValue,
          assets: assetsPayload,
          assets_status: "completed",
          asset_return_status: "completed",
          status: "completed",
          updated_at: new Date().toISOString()
        } 
      })).unwrap();

      await dispatch(fetchOffboardingProgress(offboardingIdValue));
      navigate(`/admin/employees/final-settlement?id=${offboardingIdValue}`);
    } catch (error) {
      console.error("Proceed error:", error);
      showToast(error?.response?.data?.message || "Failed to proceed. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
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
          <OffboardingHeader currentStep={2} />
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
        <OffboardingHeader currentStep={2} />
        
        {/* Progress Box */}
        <OffboardingProgressBox currentStep={2} />

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
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-sm font-bold flex items-center gap-2 border border-green-200 dark:border-green-800"
              >
                <Plus size={16} />
                Add Asset
              </button>
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
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Proceeding...
                    </>
                  ) : (
                    <>
                      Proceed to Final Settlement
                      <ArrowRight size={18} />
                    </>
                  )}
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
                        <th scope="col" className="p-4">Asset</th>
                        <th scope="col" className="p-4">Return Date</th>
                        <th scope="col" className="p-4">Condition</th>
                        <th scope="col" className="p-4">Status</th>
                        {pendingCount > 0 && (
                          <th scope="col" className="p-4 w-24 text-center">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/60 dark:divide-gray-700/60">
                      {assets.map((asset) => (
                        <tr 
                          key={asset.id} 
                          className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="p-4 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Laptop size={16} className="text-gray-400" />
                            {asset.name}
                           </td>
                          <td className="p-4 text-gray-500 dark:text-gray-400 font-medium">
                            {asset.returnedDate ? new Date(asset.returnedDate).toLocaleDateString('en-GB') : "—"}
                          </td>
                          <td className="p-4 text-gray-500 dark:text-gray-400 font-medium">
                            {asset.condition || "—"}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 ${asset.status === 'Returned' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                              {asset.status === 'Returned' ? <Check size={12} /> : <Loader size={12} className="animate-spin" />}
                              {asset.status}
                            </span>
                           </td>
                           {pendingCount > 0 && (
                             <td className="p-4 text-center">
                              {asset.status !== "Returned" && (
                                <button
                                  onClick={() => handleRevokeClick(asset.id)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition-colors"
                                >
                                  Revoke
                                </button>
                              )}
                             </td>
                           )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-4">
                <button
                  onClick={handleProceedToSettlement}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Proceeding...
                    </>
                  ) : (
                    <>
                      Proceed to Final Settlement
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Asset</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Asset Name *</label>
                <input
                  type="text"
                  placeholder="e.g., MacBook Pro"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-100 dark:border-gray-700 gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleAddAsset} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">Add Asset</button>
            </div>
          </div>
        </div>
      )}

      {/* Return Date Modal */}
      {showReturnDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Return Date</h3>
              <button onClick={() => setShowReturnDateModal(false)} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Return Date *</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Return Condition (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Good condition, Minor scratch..."
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-100 dark:border-gray-700 gap-3">
              <button onClick={() => setShowReturnDateModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleConfirmReturnDate} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetReturn;