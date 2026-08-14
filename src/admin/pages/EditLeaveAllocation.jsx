import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { showToast } from '../../components/common/Toast';
import { fetchLeaveTypes, fetchLeaveBalances, updateLeaveAllocation } from '@admin/store/slices/LeaveSlice';

const EditLeaveAllocation = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { leaveTypes = [], leaveAllocations = [], loading } = useSelector((state) => state.leaves || {});
  const [allocations, setAllocations] = useState({});
  const [updating, setUpdating] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState({});
  const [photoError, setPhotoError] = useState(false);
  const [fetchingBalances, setFetchingBalances] = useState(true);
  const [employeeData, setEmployeeData] = useState(null);
  const { user } = useSelector((state) => state.auth || {});
  const routePrefix = (user?.type === "employee" || user?.type === "hr" || user?.type === "manager" || user?.type === "team_lead") ? "/employee" : "/admin";
  const leavesUrl = (user?.type === "employee" || user?.type === "hr" || user?.type === "manager" || user?.type === "team_lead") ? "/employee/leave-management" : "/admin/leaves";
  
  // Get employee data from leaveAllocations
  const employee = leaveAllocations.find(emp => String(emp.employee_id) === String(id));

  // Helper function to get employee photo URL
  const getEmployeePhoto = () => {
    if (!employeeData && !employee) return null;
    
    const empData = employeeData || employee;
    const photoValue = empData?.avatar;
    
    if (!photoValue || photoError) return null;
    
    if (typeof photoValue === "string") {
      if (photoValue.startsWith("data:")) return photoValue;
      if (photoValue.startsWith("http")) return photoValue;
      
      const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
      if (photoValue.startsWith("/storage/")) return `${baseUrl}${photoValue}`;
      return `${baseUrl}/storage/${photoValue}`;
    }
    
    return null;
  };

  // Fetch leave types only
  useEffect(() => {
    if (id) {
      dispatch(fetchLeaveTypes());
    }
  }, [dispatch, id]);

  // Fetch leave balances for this specific employee
  useEffect(() => {
    const fetchBalances = async () => {
      if (id && leaveTypes.length > 0) {
        setFetchingBalances(true);
        try {
          const result = await dispatch(fetchLeaveBalances({ employee_id: parseInt(id) })).unwrap();
          
          const data = result || {};
          const employeeInfo = data.employee || null;
          const leaveTypesBalance = data.leaveTypesBalance || [];
          
          if (employeeInfo) {
            setEmployeeData(employeeInfo);
          }
          
          const initialAllocs = {};
          const balances = {};
          
          leaveTypesBalance.forEach(item => {
            const leaveTypeId = item.leave_type_id;
            const leaveTypeName = item.leave_type;
            const allocated = parseFloat(item.allocated) || 0;
            const taken = parseFloat(item.taken) || 0;
            const balance = parseFloat(item.balance) || 0;
            
            initialAllocs[leaveTypeId] = allocated;
            
            balances[leaveTypeId] = {
              allocated: allocated,
              used: taken,
              remaining: balance,
              name: leaveTypeName
            };
          });
          
          leaveTypes.forEach(type => {
            if (!initialAllocs[type.id]) {
              initialAllocs[type.id] = 0;
            }
            if (!balances[type.id]) {
              balances[type.id] = {
                allocated: 0,
                used: 0,
                remaining: 0,
                name: type.name
              };
            }
          });
          
          setAllocations(initialAllocs);
          setLeaveBalances(balances);
        } catch (error) {
          console.error("Failed to fetch leave balances:", error);
          const defaultAllocs = {};
          leaveTypes.forEach(type => {
            defaultAllocs[type.id] = 0;
          });
          setAllocations(defaultAllocs);
        } finally {
          setFetchingBalances(false);
        }
      }
    };
    
    fetchBalances();
  }, [dispatch, id, leaveTypes]);

  const handleAllocationChange = (leaveTypeId, value) => {
    const numValue = parseInt(value) || 0;
    if (numValue < 0) {
      showToast('Allocated days cannot be negative', 'error');
      return;
    }
    setAllocations(prev => ({ ...prev, [leaveTypeId]: numValue }));
  };

  const handleSave = async () => {
    setUpdating(true);
    try {
      const allocationsData = {};
      Object.entries(allocations).forEach(([leaveTypeId, allocated]) => {
        allocationsData[leaveTypeId] = allocated;
      });
      
      const result = await dispatch(updateLeaveAllocation({
        employee_id: parseInt(id),
        allocations: allocationsData
      })).unwrap();
      
      if (result) {
        showToast('Leave allocations updated successfully', 'success');
        navigate(`${routePrefix}/leaves/allocations`);
      }
    } catch (error) {
      console.error("Update error:", error);
      showToast(error?.message || 'Failed to update allocations', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const getCurrentBalance = (leaveTypeId) => {
    const balance = leaveBalances[leaveTypeId];
    if (balance) {
      return balance.remaining;
    }
    return allocations[leaveTypeId] || 0;
  };

  const getUsedDays = (leaveTypeId) => {
    const balance = leaveBalances[leaveTypeId];
    return balance?.used || 0;
  };

  const getAllocatedDays = (leaveTypeId) => {
    const balance = leaveBalances[leaveTypeId];
    return balance?.allocated || 0;
  };

  const getEmployeeName = () => {
    if (employeeData) {
      return `${employeeData.first_name || ''} ${employeeData.last_name || ''}`.trim() || employeeData.name || 'Employee';
    }
    if (employee) {
      return employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee';
    }
    return 'Employee';
  };

  const getEmployeeId = () => {
    if (employeeData) {
      return employeeData.employee_id || employeeData.id || '-';
    }
    if (employee) {
      return employee.employee_id || employee.id || '-';
    }
    return '-';
  };

  const getEmployeeDesignation = () => {
    if (employeeData) {
      return employeeData.user?.designation?.name || employeeData.role || 'N/A';
    }
    if (employee) {
      return employee.designation || employee.role || 'N/A';
    }
    return 'N/A';
  };

  const getEmployeeDepartment = () => {
    if (employeeData) {
      return employeeData.user?.department?.name || employeeData.dept || 'N/A';
    }
    if (employee) {
      return employee.department || employee.dept || 'N/A';
    }
    return 'N/A';
  };

  const getEmployeeEmail = () => {
    if (employeeData) {
      return employeeData.company_email || employeeData.email || employeeData.personal_email || '-';
    }
    if (employee) {
      return employee.email || employee.company_email || '-';
    }
    return '-';
  };

  const getJoiningDate = () => {
    if (employeeData) {
      return employeeData.joining_date || employeeData.hire_date || null;
    }
    if (employee) {
      return employee.joining_date || employee.hire_date || null;
    }
    return null;
  };

  // Get icon for leave type
  const getLeaveIcon = (typeName) => {
    const name = typeName?.toLowerCase() || '';
    if (name.includes('sick')) return 'fas fa-thermometer-half';
    if (name.includes('casual')) return 'fas fa-umbrella-beach';
    if (name.includes('annual') || name.includes('vacation')) return 'fas fa-suitcase';
    if (name.includes('maternity')) return 'fas fa-baby';
    if (name.includes('paternity')) return 'fas fa-child';
    if (name.includes('unpaid')) return 'fas fa-clock';
    return 'fas fa-calendar-alt';
  };

  // Get color for leave type
  const getLeaveColor = (typeName) => {
    const name = typeName?.toLowerCase() || '';
    if (name.includes('sick')) return 'text-red-500 bg-red-50 dark:bg-red-900/20';
    if (name.includes('casual')) return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
    if (name.includes('annual') || name.includes('vacation')) return 'text-green-500 bg-green-50 dark:bg-green-900/20';
    if (name.includes('maternity')) return 'text-pink-500 bg-pink-50 dark:bg-pink-900/20';
    if (name.includes('paternity')) return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
    if (name.includes('unpaid')) return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
    return 'text-teal-500 bg-teal-50 dark:bg-teal-900/20';
  };

  if (loading || fetchingBalances || leaveTypes.length === 0) {
    return (
      <div className="w-full px-4 md:px-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  const employeeName = getEmployeeName();
  const employeeInitials = employeeName.split(' ').map(word => word.charAt(0)).join('').toUpperCase() || '?';
  const photoUrl = getEmployeePhoto();

  return (
    <div className="w-full px-4 md:px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs md:text-sm mb-4 md:mb-6 flex-wrap">
        <Link to={leavesUrl} className="text-green-500 hover:text-green-600 font-medium">
          Leaves
        </Link>
        <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
        <Link to={`${routePrefix}/leaves/allocations`} className="text-green-500 hover:text-green-600 font-medium">
          Leave Allocations
        </Link>
        <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
        <span className="text-gray-500 dark:text-gray-400">Manage Allocation</span>
      </div>

      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-gray-800 to-green-600 dark:from-gray-200 dark:to-green-400 bg-clip-text text-transparent">
          <i className="fas fa-chart-line mr-2"></i> Manage Leave Allocation
        </h2>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Allocate leaves for the current year
        </p>
      </div>

      {/* Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Employee Details */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-gray-200 dark:border-gray-700">
            <i className="fas fa-user-circle text-green-500 text-sm"></i>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Employee Information
            </h3>
          </div>
          
          {/* Profile Section with Photo */}
          <div className="flex items-center gap-3 mb-4">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={employeeName}
                className="w-12 h-12 rounded-full object-cover border-2 border-green-500 shadow-sm"
                onError={() => setPhotoError(true)}
              />
            ) : null}
            
            {(!photoUrl || photoError) && (
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm">
                {employeeInitials}
              </div>
            )}
            
            <div>
              <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                {employeeName}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {getEmployeeDesignation()}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {getEmployeeDepartment()}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-xs text-gray-500">Employee ID</span>
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                {getEmployeeId()}
              </span>
            </div>
            <div className="flex justify-between py-1 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-500">Email</span>
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-[180px]">
                {getEmployeeEmail()}
              </span>
            </div>
            <div className="flex justify-between py-1 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-500">Joining Date</span>
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                {getJoiningDate() ? new Date(getJoiningDate()).toLocaleDateString() : '-'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-500">Year</span>
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                {new Date().getFullYear()}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - Leave Allocation Form */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-gray-200 dark:border-gray-700">
            <i className="fas fa-calendar-alt text-green-500 text-sm"></i>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Allocate Leaves for {new Date().getFullYear()}
            </h3>
          </div>

          <div className="space-y-2">
            {leaveTypes.map((type) => {
              const currentAllocation = allocations[type.id] || 0;
              const usedDays = getUsedDays(type.id);
              const balance = getCurrentBalance(type.id);
              const allocated = getAllocatedDays(type.id);
              const iconClass = getLeaveIcon(type.name);
              const colorClass = getLeaveColor(type.name);
              
              return (
                <div 
                  key={type.id} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-gray-100 dark:border-gray-700"
                >
                  {/* Leave Type Icon & Name */}
                  <div className="flex items-center gap-3 w-[140px] flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                      <i className={`${iconClass} text-sm`}></i>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {type.name}
                    </span>
                  </div>

                  {/* Allocation Input */}
                  <div className="flex-1 min-w-[80px]">
                    <input
                      type="number"
                      value={currentAllocation}
                      onChange={(e) => handleAllocationChange(type.id, e.target.value)}
                      min="0"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                      placeholder="0"
                    />
                  </div>

                  {/* Balance Badge */}
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full flex-shrink-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Balance:</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      {balance}
                    </span>
                  </div>

                  {/* Used Badge (if used > 0) */}
                  {usedDays > 0 && (
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-full flex-shrink-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Used:</span>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                        {usedDays}
                      </span>
                    </div>
                  )}

                  {/* Allocated Badge */}
                  {allocated > 0 && (
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full flex-shrink-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Alloc:</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {allocated}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              to={`${routePrefix}/leaves/allocations`}
              className="px-6 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={updating}
              className="px-6 py-2 rounded-lg text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition-all disabled:opacity-70 flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              {updating ? (
                <>
                  <i className="fas fa-spinner fa-spin text-sm"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save text-sm"></i>
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditLeaveAllocation;