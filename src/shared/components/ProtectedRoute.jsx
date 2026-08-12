import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../../admin/components/common/Loader";
import { clearAllTokens } from "../../utils/apiClient"; // Import the function

const ProtectedRoute = ({ requiredType, requiredPermission, children }) => {
  const { isAuthenticated, loading, user } = useSelector((state) => state.auth);

 // ProtectedRoute.jsx - Update validation

const validateTokenConsistency = () => {
  // Check all possible token keys
  const tokenKeys = ['admin-token', 'hr-token', 'employee-token', 'auth-token'];
  let foundToken = null;
  let foundType = null;
  
  for (const key of tokenKeys) {
    const token = localStorage.getItem(key);
    if (token && token !== 'null' && token !== 'undefined') {
      foundToken = token;
      if (key !== 'auth-token') {
        foundType = key.replace('-token', '');
      }
      break;
    }
  }
  
  // If no token found, validation fails
  if (!foundToken) {
    return false;
  }
  
  // If user is loaded, check type matches
  if (user?.type) {
    const tokenKey = `${user.type}-token`;
    const hasCorrectToken = localStorage.getItem(tokenKey);
    
    // If user type doesn't match the found token type
    if (foundType && user.type !== foundType) {
      // Try to migrate: if we have the correct token type
      if (hasCorrectToken) {
        localStorage.setItem('active-user-type', user.type);
        return true;
      }
      return false;
    }
  }
  
  return true;
};

  if (loading) {
    return <Loader fullScreen />;
  }

  if (!isAuthenticated || !validateTokenConsistency()) {
    // Use clearAllTokens to properly clear everything
    clearAllTokens();
    return <Navigate to="/login" replace />;
  }

  // Helper to check if user is HR or Admin (can access admin routes)
  const isHR = user?.type === "hr" || 
               user?.role?.name === "HR Manager" || 
               user?.role?.name === "HR";
  
  const isAdmin = user?.type === "admin";
  const isManager = user?.role?.name === "Manager" || user?.type === "manager";
  const isTeamLead = user?.role?.name === "Team Lead" || user?.type === "team_lead";
  const isEmployee = user?.type === "employee";

  // Determine user's primary dashboard
  const getUserDashboard = () => {
    if (isAdmin || isHR) {
      return "/admin/dashboard";
    }
    return "/employee/dashboard";
  };

  // Check user type
  if (requiredType) {
    let hasRequiredType = false;

    // Admin routes - accessible by admin and HR
    if (requiredType === "admin") {
      hasRequiredType = isAdmin || isHR;
    }
    // Employee routes - accessible by employee, manager, team lead, and HR
    else if (requiredType === "employee") {
      hasRequiredType = isEmployee || isManager || isTeamLead || isHR || isAdmin;
    }
    // Exact type match for other types
    else {
      hasRequiredType = user?.type === requiredType;
    }

    if (!hasRequiredType) {
      const redirectPath = getUserDashboard();
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Check permission if required
  if (requiredPermission) {
    const permissions = user?.permissions || {};
    const hasPermission = 
      permissions[requiredPermission]?.read === true || 
      permissions.all === true ||
      isAdmin;
    
    if (!hasPermission) {
      const redirectPath = getUserDashboard();
      return <Navigate to={redirectPath} replace />;
    }
  }

  return children || <Outlet />;
};

export default ProtectedRoute;