import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../../admin/components/common/Loader";
import {
  clearAllTokens,
  getActiveToken,
  getActiveTokenKey,
  USER_TYPES,
} from "../../utils/apiClient";

/**
 * ============================================================
 * VALID TOKEN CHECK
 * ============================================================
 */
const isValidToken = (token) => {
  return (
    typeof token === "string" &&
    token.trim() !== "" &&
    token !== "null" &&
    token !== "undefined"
  );
};

/**
 * ============================================================
 * PROTECTED ROUTE
 * ============================================================
 */
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
   * ==========================================================
   * GET USER TYPE
   * ==========================================================
   *
   * Priority:
   *
   * 1. Redux user.type
   * 2. Redux userType
   * 3. localStorage active-user-type
   * 4. localStorage user-type
   */
  const getResolvedUserType = () => {
    const localActiveType =
      localStorage.getItem("active-user-type");

    const localUserType =
      localStorage.getItem("user-type");

    const possibleTypes = [
      user?.type,
      userType,
      localActiveType,
      localUserType,
    ];

    return (
      possibleTypes.find((type) =>
        USER_TYPES.includes(type)
      ) || null
    );
  };

  /**
   * ==========================================================
   * RESTORE ACTIVE USER TYPE
   * ==========================================================
   *
   * Important:
   *
   * After refresh, the backend returns:
   *
   * data.access_token
   * data.user.type
   *
   * Therefore, if active-user-type disappeared but Redux
   * still knows the user type, restore it instead of logging
   * the user out.
   */
  const restoreActiveUserType = () => {
    const existingActiveType =
      localStorage.getItem("active-user-type");

    /**
     * Existing active type is valid.
     */
    if (
      existingActiveType &&
      USER_TYPES.includes(existingActiveType)
    ) {
      return existingActiveType;
    }

    /**
     * Try to recover from Redux.
     */
    const resolvedType = getResolvedUserType();

    if (
      resolvedType &&
      USER_TYPES.includes(resolvedType)
    ) {
      localStorage.setItem(
        "active-user-type",
        resolvedType
      );

      localStorage.setItem(
        "user-type",
        resolvedType
      );

      console.log(
        "🔄 ProtectedRoute: Restored active user type:",
        resolvedType
      );

      return resolvedType;
    }

    return null;
  };

  /**
   * ==========================================================
   * VALIDATE TOKEN CONSISTENCY
   * ==========================================================
   */
  const validateTokenConsistency = () => {
    /**
     * First try to recover the active type.
     */
    const activeType = restoreActiveUserType();

    /**
     * We cannot continue without knowing which token belongs
     * to the current session.
     */
    if (!activeType) {
      console.warn(
        "ProtectedRoute: No valid active user type."
      );

      return false;
    }

    /**
     * Make sure the type is supported.
     */
    if (!USER_TYPES.includes(activeType)) {
      console.warn(
        "ProtectedRoute: Invalid active user type:",
        activeType
      );

      return false;
    }

    /**
     * ========================================================
     * EXPECTED TOKEN
     * ========================================================
     */
    const expectedTokenKey =
      `${activeType}-token`;

    const token =
      localStorage.getItem(expectedTokenKey);

    /**
     * No token means the session is actually gone.
     */
    if (!isValidToken(token)) {
      console.warn(
        `ProtectedRoute: No valid token found for ${activeType}`
      );

      return false;
    }

    /**
     * ========================================================
     * REDUX USER TYPE CHECK
     * ========================================================
     *
     * Do NOT reject the session merely because Redux is
     * temporarily missing user information.
     */
    if (
      user?.type &&
      USER_TYPES.includes(user.type) &&
      user.type !== activeType
    ) {
      console.warn(
        "ProtectedRoute: Redux user type mismatch",
        {
          reduxUserType: user.type,
          activeUserType: activeType,
        }
      );

      return false;
    }

    /**
     * ========================================================
     * REDUX userType CHECK
     * ========================================================
     */
    if (
      userType &&
      USER_TYPES.includes(userType) &&
      userType !== activeType
    ) {
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
     * ========================================================
     * API CLIENT TOKEN CHECK
     * ========================================================
     *
     * getActiveTokenKey() may temporarily return null while
     * Axios is being initialized.
     *
     * Therefore:
     *
     * - If it exists, it must match.
     * - If it is null but localStorage has the correct token,
     *   DO NOT log the user out.
     */
    const activeTokenKey = getActiveTokenKey();

    if (
      activeTokenKey &&
      activeTokenKey !== expectedTokenKey
    ) {
      console.warn(
        "ProtectedRoute: API token key mismatch",
        {
          activeTokenKey,
          expectedTokenKey,
        }
      );

      return false;
    }

    /**
     * Make sure an active token actually exists.
     */
    const activeToken = getActiveToken();

    if (!isValidToken(activeToken)) {
      console.warn(
        "ProtectedRoute: Active token unavailable."
      );

      return false;
    }

    return true;
  };

  /**
   * ==========================================================
   * WAIT FOR AUTH INITIALIZATION
   * ==========================================================
   */
  if (loading) {
    return <Loader fullScreen />;
  }

  /**
   * ==========================================================
   * RESTORE ACTIVE TYPE BEFORE AUTH FAILURE
   * ==========================================================
   */
  const activeType = restoreActiveUserType();

  /**
   * ==========================================================
   * AUTHENTICATION VALIDATION
   * ==========================================================
   *
   * Important change:
   *
   * We don't immediately clear everything simply because
   * Redux says isAuthenticated === false.
   *
   * If a valid token exists, the session may have just been
   * restored by the refresh endpoint.
   */
  const hasValidToken =
    activeType &&
    isValidToken(
      localStorage.getItem(
        `${activeType}-token`
      )
    );

  /**
   * If Redux says authenticated, normal validation.
   */
  if (isAuthenticated) {
    const tokenIsConsistent =
      validateTokenConsistency();

    if (!tokenIsConsistent) {
      console.warn(
        "ProtectedRoute: Authentication validation failed."
      );

      clearAllTokens();

      return (
        <Navigate
          to="/login"
          replace
        />
      );
    }
  }

  /**
   * ==========================================================
   * REDUX NOT AUTHENTICATED BUT TOKEN STILL EXISTS
   * ==========================================================
   *
   * This can happen during application startup / refresh
   * restoration.
   *
   * Do NOT destroy the token.
   *
   * initializeAuth should restore Redux authentication.
   */
  if (!isAuthenticated && !hasValidToken) {
    console.warn(
      "ProtectedRoute: No authenticated session found."
    );

    clearAllTokens();

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  /**
   * If we don't have a resolved type even though a token
   * exists, allow the auth initialization process to finish
   * instead of immediately destroying the token.
   */
  if (!activeType) {
    console.warn(
      "ProtectedRoute: Waiting for active user type..."
    );

    return <Loader fullScreen />;
  }

  /**
   * ==========================================================
   * USER TYPE HELPERS
   * ==========================================================
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
   * ==========================================================
   * EMPLOYEE-SIDE USERS
   * ==========================================================
   *
   * HR
   * Employee
   * Manager
   * Team Lead
   *
   * all use employee-side routes/layout.
   */
  const isEmployeeType =
    isEmployee ||
    isHR ||
    isManager ||
    isTeamLead;

  /**
   * ==========================================================
   * USER DASHBOARD
   * ==========================================================
   */
  const getUserDashboard = () => {
    if (isAdmin) {
      return "/admin/dashboard";
    }

    return "/employee/dashboard";
  };

  /**
   * ==========================================================
   * REQUIRED USER TYPE
   * ==========================================================
   */
  if (requiredType) {
    let hasRequiredType = false;

    switch (requiredType) {
      /**
       * ------------------------------------------------------
       * ADMIN
       * ------------------------------------------------------
       */
      case "admin":
        hasRequiredType = isAdmin;
        break;

      /**
       * ------------------------------------------------------
       * EMPLOYEE SIDE
       * ------------------------------------------------------
       */
      case "employee":
        hasRequiredType = isEmployeeType;
        break;

      /**
       * ------------------------------------------------------
       * HR
       * ------------------------------------------------------
       */
      case "hr":
        hasRequiredType = isHR;
        break;

      /**
       * ------------------------------------------------------
       * MANAGER
       * ------------------------------------------------------
       */
      case "manager":
        hasRequiredType = isManager;
        break;

      /**
       * ------------------------------------------------------
       * TEAM LEAD
       * ------------------------------------------------------
       */
      case "team_lead":
        hasRequiredType = isTeamLead;
        break;

      /**
       * ------------------------------------------------------
       * FUTURE TYPES
       * ------------------------------------------------------
       */
      default:
        hasRequiredType =
          activeType === requiredType ||
          user?.type === requiredType;
        break;
    }

    /**
     * User does not have required type.
     */
    if (!hasRequiredType) {
      const redirectPath =
        getUserDashboard();

      console.warn(
        "ProtectedRoute: User type authorization failed",
        {
          currentPath:
            window.location.pathname,
          requiredType,
          activeType,
          reduxUserType:
            user?.type,
          reduxUserTypeState:
            userType,
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
   * ==========================================================
   * PERMISSION VALIDATION
   * ==========================================================
   */
  if (requiredPermission) {
    const permissions =
      user?.permissions || {};

    const hasPermission =
      permissions?.[
        requiredPermission
      ]?.read === true ||
      permissions?.[
        requiredPermission
      ] === true ||
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
   * ==========================================================
   * AUTHORIZED
   * ==========================================================
   */
  return children || <Outlet />;
};

export default ProtectedRoute;