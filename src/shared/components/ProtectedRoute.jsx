import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../../admin/components/common/Loader";
import { clearAllTokens, getActiveTokenKey } from "../../utils/apiClient";

// All supported authentication types
const USER_TYPES = [
  "admin",
  "hr",
  "employee",
  "manager",
  "team_lead",
];

// All supported token keys
const TOKEN_KEYS = [
  "admin-token",
  "hr-token",
  "employee-token",
  "manager-token",
  "team_lead-token",
  "auth-token",
];

const isValidToken = (token) => {
  return (
    token &&
    token !== "null" &&
    token !== "undefined" &&
    typeof token === "string" &&
    token.trim() !== ""
  );
};

const ProtectedRoute = ({
  requiredType,
  requiredPermission,
  children,
}) => {
  const {
    isAuthenticated,
    loading,
    user,
    userType,
  } = useSelector((state) => state.auth);

  /**
   * ---------------------------------------------------------
   * Get active user type
   * ---------------------------------------------------------
   *
   * We prioritize:
   * 1. Redux user.type
   * 2. Redux userType
   * 3. localStorage active-user-type
   * 4. localStorage user-type
   */
  const getActiveUserType = () => {
    const localActiveType = localStorage.getItem("active-user-type");
    const localUserType = localStorage.getItem("user-type");

    return (
      user?.type ||
      userType ||
      localActiveType ||
      localUserType ||
      null
    );
  };

  /**
   * ---------------------------------------------------------
   * Validate authentication/token consistency
   * ---------------------------------------------------------
   */
  const validateTokenConsistency = () => {
    const activeType = localStorage.getItem("active-user-type");

    /**
     * If there is no active-user-type, do NOT blindly accept
     * any token.
     *
     * The new authentication system requires an active type.
     */
    if (!activeType) {
      console.warn(
        "ProtectedRoute: No active-user-type found."
      );

      return false;
    }

    /**
     * Make sure active type is one of the supported types.
     */
    if (!USER_TYPES.includes(activeType)) {
      console.warn(
        "ProtectedRoute: Invalid active-user-type:",
        activeType
      );

      return false;
    }

    /**
     * Get the token belonging to the active user type.
     */
    const expectedTokenKey = `${activeType}-token`;
    const token = localStorage.getItem(expectedTokenKey);

    /**
     * The active user must have its own token.
     *
     * Do NOT automatically migrate auth-token here because
     * loginUser / initializeAuth are responsible for creating
     * the correct type-specific token.
     */
    if (!isValidToken(token)) {
      console.warn(
        `ProtectedRoute: Missing token for ${activeType}`
      );

      return false;
    }

    /**
     * If Redux already has a user type, it must match the
     * active localStorage type.
     */
    if (user?.type && user.type !== activeType) {
      console.warn(
        "ProtectedRoute: User type mismatch",
        {
          reduxUserType: user.type,
          activeUserType: activeType,
        }
      );

      return false;
    }

    /**
     * If Redux userType exists, it must also match.
     */
    if (userType && userType !== activeType) {
      console.warn(
        "ProtectedRoute: Redux userType mismatch",
        {
          reduxUserType: userType,
          activeUserType: activeType,
        }
      );

      return false;
    }

    /**
     * Make sure the API client is using the same token.
     *
     * getActiveTokenKey() should return the same token key.
     */
    const activeTokenKey = getActiveTokenKey();

    if (activeTokenKey && activeTokenKey !== expectedTokenKey) {
      console.warn(
        "ProtectedRoute: API token key mismatch",
        {
          activeTokenKey,
          expectedTokenKey,
        }
      );

      return false;
    }

    return true;
  };

  /**
   * ---------------------------------------------------------
   * Wait for authentication initialization
   * ---------------------------------------------------------
   */
  if (loading) {
    return <Loader fullScreen />;
  }

  /**
   * ---------------------------------------------------------
   * Authentication validation
   * ---------------------------------------------------------
   */
  if (!isAuthenticated || !validateTokenConsistency()) {
    console.warn(
      "ProtectedRoute: Authentication failed. Clearing auth."
    );

    clearAllTokens();

    return <Navigate to="/login" replace />;
  }

  /**
   * ---------------------------------------------------------
   * Resolve current user type
   * ---------------------------------------------------------
   */
  const activeType = getActiveUserType();

  /**
   * ---------------------------------------------------------
   * User type helpers
   * ---------------------------------------------------------
   */

  const isAdmin =
    activeType === "admin" ||
    user?.type === "admin";

  const isHR =
    activeType === "hr" ||
    user?.type === "hr" ||
    user?.role?.name === "HR Manager" ||
    user?.role?.name === "HR";

  const isManager =
    activeType === "manager" ||
    user?.type === "manager" ||
    user?.role?.name === "Manager";

  const isTeamLead =
    activeType === "team_lead" ||
    user?.type === "team_lead" ||
    user?.role?.name === "Team Lead";

  const isEmployee =
    activeType === "employee" ||
    user?.type === "employee";

  /**
   * ---------------------------------------------------------
   * Employee-side users
   *
   * HR, employee, manager and team_lead all use the
   * EmployeeLayout according to your App.jsx.
   * ---------------------------------------------------------
   */
  const isEmployeeType =
    isEmployee ||
    isHR ||
    isManager ||
    isTeamLead;

  /**
   * ---------------------------------------------------------
   * Determine user's primary dashboard
   * ---------------------------------------------------------
   */
  const getUserDashboard = () => {
    if (isAdmin) {
      return "/admin/dashboard";
    }

    return "/employee/dashboard";
  };

  /**
   * ---------------------------------------------------------
   * Required user type validation
   * ---------------------------------------------------------
   */
  if (requiredType) {
    let hasRequiredType = false;

    switch (requiredType) {
      /**
       * Admin routes
       *
       * ONLY admin can access these.
       */
      case "admin":
        hasRequiredType = isAdmin;
        break;

      /**
       * Employee routes
       *
       * employee
       * manager
       * team_lead
       * hr
       *
       * are all allowed to use EmployeeLayout.
       */
      case "employee":
        hasRequiredType = isEmployeeType;
        break;

      /**
       * HR-specific protection
       */
      case "hr":
        hasRequiredType = isHR;
        break;

      /**
       * Manager-specific protection
       */
      case "manager":
        hasRequiredType = isManager;
        break;

      /**
       * Team lead-specific protection
       */
      case "team_lead":
        hasRequiredType = isTeamLead;
        break;

      /**
       * Any other future type
       */
      default:
        hasRequiredType =
          activeType === requiredType ||
          user?.type === requiredType;
        break;
    }

    /**
     * User does not have the required type.
     */
    if (!hasRequiredType) {
      const redirectPath = getUserDashboard();

      console.warn(
        "ProtectedRoute: User type authorization failed",
        {
          currentPath: window.location.pathname,
          requiredType,
          activeType,
          reduxUserType: user?.type,
          reduxUserTypeState: userType,
          redirectPath,
        }
      );

      return (
        <Navigate
          to={redirectPath}
          replace
        />
      );
    }
  }

  /**
   * ---------------------------------------------------------
   * Permission validation
   * ---------------------------------------------------------
   */
  if (requiredPermission) {
    const permissions = user?.permissions || {};

    /**
     * Supported permission formats:
     *
     * permissions: {
     *   employees: {
     *     read: true
     *   }
     * }
     *
     * OR
     *
     * permissions: {
     *   all: true
     * }
     */
    const hasPermission =
      permissions?.[requiredPermission]?.read === true ||
      permissions?.[requiredPermission] === true ||
      permissions?.all === true ||
      isAdmin;

    if (!hasPermission) {
      console.warn(
        "ProtectedRoute: Permission denied",
        {
          requiredPermission,
          userType: activeType,
        }
      );

      return (
        <Navigate
          to={getUserDashboard()}
          replace
        />
      );
    }
  }

  /**
   * ---------------------------------------------------------
   * Authorized
   * ---------------------------------------------------------
   *
   * If children are supplied, render children.
   *
   * Otherwise render nested routes through Outlet.
   */
  return children || <Outlet />;
};

export default ProtectedRoute;