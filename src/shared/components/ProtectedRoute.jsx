import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../../admin/components/common/Loader";
import { clearAllTokens, getActiveTokenKey } from "../../utils/apiClient";

const ProtectedRoute = ({ requiredType, requiredPermission, children }) => {
  const { isAuthenticated, loading, user } = useSelector((state) => state.auth);

  // Validate token consistency and get the correct token
  // ProtectedRoute.jsx - Update validation
  const validateTokenConsistency = () => {
    const activeType = localStorage.getItem("active-user-type");

    // If no active type, check if there's any token
    if (!activeType) {
      const tokenKeys = [
        "admin-token",
        "hr-token",
        "employee-token",
        "auth-token",
      ];
      const hasToken = tokenKeys.some((key) => {
        const token = localStorage.getItem(key);
        return token && token !== "null" && token !== "undefined";
      });
      return hasToken;
    }

    // Check if the token for the active type exists
    const tokenKey = `${activeType}-token`;
    const token = localStorage.getItem(tokenKey);

    if (!token || token === "null" || token === "undefined") {
      // Try auth-token as fallback
      const authToken = localStorage.getItem("auth-token");
      if (authToken && authToken !== "null" && authToken !== "undefined") {
        // Migrate auth-token to type-specific token
        localStorage.setItem(tokenKey, authToken);
        return true;
      }
      return false;
    }

    // If user is loaded, verify type matches
    if (user?.type && user.type !== activeType) {
      // User type doesn't match active type - this is a problem
      return false;
    }

    return true;
  };

  if (loading) {
    return <Loader fullScreen />;
  }

  // Check authentication and token consistency
  if (!isAuthenticated || !validateTokenConsistency()) {
    clearAllTokens();
    return <Navigate to="/login" replace />;
  }

  // Helper to check user types
  const isHR =
    user?.type === "hr" ||
    user?.role?.name === "HR Manager" ||
    user?.role?.name === "HR";
  const isAdmin = user?.type === "admin";
  const isManager = user?.role?.name === "Manager" || user?.type === "manager";
  const isTeamLead =
    user?.role?.name === "Team Lead" || user?.type === "team_lead";
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

    if (requiredType === "admin") {
      // ONLY admin can access admin routes
      hasRequiredType = isAdmin;
    } else if (requiredType === "employee") {
      // Everyone except admin can access employee routes
      hasRequiredType = !isAdmin;
    } else if (requiredType === "hr") {
      hasRequiredType = isHR;
    } else {
      hasRequiredType = user?.type === requiredType;
    }

    if (!hasRequiredType) {
      const redirectPath = isAdmin ? "/admin/dashboard" : "/employee/dashboard";

      console.log("🚨 PROTECTED ROUTE TYPE FAILURE", {
        currentPath: window.location.pathname,
        requiredType,
        userType: user?.type,
        redirectPath,
        activeType: localStorage.getItem("active-user-type"),
      });

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
