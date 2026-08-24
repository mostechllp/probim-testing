// protectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
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
 * ROUTE TO MODULE SLUG MAPPING
 * ============================================================
 */
const ROUTE_TO_MODULE_MAP = {
  // Admin routes
  "/admin/dashboard": "dashboard",
  "/admin/employees": "employees",
  "/admin/employees/add-employee": "employees",
  "/admin/employees/onboarding": "onboarding",
  "/admin/employees/offboarding": "offboarding",
  "/admin/employees/edit/:id": "employees",
  "/admin/employees/:id": "employees",
  "/admin/projects": "projects",
  "/admin/projects/:id": "projects",
  "/admin/project-assignments": "project-assignments",
  "/admin/attendances": "attendance",
  "/admin/attendance-requests": "attendance-requests",
  "/admin/leaves": "leaves",
  "/admin/leaves/leave-types": "leaves",
  "/admin/leaves/allocations": "leaves",
  "/admin/task-reports": "task-reports",
  "/admin/reports": "reports",
  "/admin/reports/employee-details": "reports",
  "/admin/reports/attendance-reports": "reports",
  "/admin/reports/project-report": "reports",
  "/admin/reports/leave-requests-reports": "reports",
  "/admin/reports/pending-leaves-reports": "reports",
  "/admin/reports/employee-near-expiry": "reports",
  "/admin/reports/employee-upcoming-renewals": "reports",
  "/admin/reports/organization-near-expiry": "reports",
  "/admin/reports/organization-upcoming-renewals": "reports",
  "/admin/payroll": "payroll",
  "/admin/payroll/list": "payroll",
  "/admin/payroll/add": "payroll",
  "/admin/payroll/:id": "payroll",
  "/admin/payroll/edit/:id": "payroll",
  "/admin/wfh": "wfh",
  "/admin/settings": "settings",
  "/admin/roles": "roles",
  "/admin/modules": "modules",
  "/admin/project-working-hours": "project-working-hours",
  "/admin/organizations": "organizations",
  "/admin/agreements": "agreements",
  "/admin/notifications": "notifications",
  "/admin/request-leave-for-employee": "leaves",
  "/admin/developer-tickets": "developer-tickets",
  "/admin/admin-tickets": "admin-tickets",
  "/admin/support-admin-dashboard": "support-admin-dashboard",
  
  // Employee routes
  "/employee/dashboard": "dashboard",
  "/employee/employees": "employees",
  "/employee/employees/add-employee": "employees",
  "/employee/employees/onboarding": "onboarding",
  "/employee/employees/edit/:id": "employees",
  "/employee/employees/:id": "employees",
  "/employee/projects": "projects",
  "/employee/projects/:id": "projects",
  "/employee/project-assignments": "project-assignments",
  "/employee/attendance": "attendance",
  "/employee/attendance-requests": "attendance-requests",
  "/employee/leaves": "my-leaves",
  "/employee/request-leave": "my-leaves",
  "/employee/leave-management": "leaves",
  "/employee/task-reports": "my-tasks",
  "/employee/my-tasks": "my-tasks",
  "/employee/reports": "reports",
  "/employee/payroll": "my-payroll",
  "/employee/wfh": "my-wfh-requests",
  "/employee/profile": "my-profile",
  "/employee/settings": "settings",
  "/employee/roles": "roles",
  "/employee/modules": "modules",
  "/employee/project-working-hours": "project-working-hours",
  "/employee/organizations": "organizations",
  "/employee/agreements": "documents",
  "/employee/my-documents": "my-documents",
  "/employee/onboarding": "onboarding",
  "/employee/request-leave-for-employee": "leaves",
  "/employee/developer-tickets": "developer-tickets",
  "/employee/admin-tickets": "admin-tickets",
  "/employee/support-admin-dashboard": "support-admin-dashboard",
};

/**
 * ============================================================
 * CHECK IF ROUTE REQUIRES PERMISSION
 * ============================================================
 */
const getModuleFromRoute = (pathname) => {
  // Check exact match first
  if (ROUTE_TO_MODULE_MAP[pathname]) {
    return ROUTE_TO_MODULE_MAP[pathname];
  }
  
  // Check pattern matches (for routes with params)
  for (const [route, module] of Object.entries(ROUTE_TO_MODULE_MAP)) {
    if (route.includes(":")) {
      // Convert route pattern to regex
      const pattern = route.replace(/:[^/]+/g, "([^/]+)");
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(pathname)) {
        return module;
      }
    }
  }
  
  return null;
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

  // Get current location
  const location = useLocation();

  // ==========================================================
  // GET USER TYPE
  // ==========================================================
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

  // ==========================================================
  // RESTORE ACTIVE USER TYPE
  // ==========================================================
  const restoreActiveUserType = () => {
    const existingActiveType =
      localStorage.getItem("active-user-type");

    if (
      existingActiveType &&
      USER_TYPES.includes(existingActiveType)
    ) {
      return existingActiveType;
    }

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

      return resolvedType;
    }

    return null;
  };

  // ==========================================================
  // VALIDATE TOKEN CONSISTENCY
  // ==========================================================
  const validateTokenConsistency = () => {
    const activeType = restoreActiveUserType();

    if (!activeType) {
      console.warn(
        "ProtectedRoute: No valid active user type."
      );
      return false;
    }

    if (!USER_TYPES.includes(activeType)) {
      console.warn(
        "ProtectedRoute: Invalid active user type:",
        activeType
      );
      return false;
    }

    const expectedTokenKey =
      `${activeType}-token`;

    const token =
      localStorage.getItem(expectedTokenKey);

    if (!isValidToken(token)) {
      console.warn(
        `ProtectedRoute: No valid token found for ${activeType}`
      );
      return false;
    }

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

    const activeToken = getActiveToken();

    if (!isValidToken(activeToken)) {
      console.warn(
        "ProtectedRoute: Active token unavailable."
      );
      return false;
    }

    return true;
  };

  // ==========================================================
  // USER TYPE HELPERS (DEFINED EARLY)
  // ==========================================================
  const userRole = user?.role?.name || user?.role || "";
  const isSupportAdmin =
    userRole === "Support Admin" ||
    userRole === "support_admin" ||
    userRole?.toLowerCase().includes("support admin");

  const hasAllPermissions = user?.permissions?.all === true;
  const isAdmin = user?.type === "admin" || hasAllPermissions;

  const isHR =
    !isSupportAdmin &&
    (user?.type === "hr" ||
      userRole === "HR Manager" ||
      userRole === "HR" ||
      userRole === "hr manager" ||
      userRole?.toLowerCase() === "hr");

  const isManager =
    !isSupportAdmin &&
    (user?.type === "manager" ||
      userRole?.toLowerCase().includes("manager") ||
      userRole?.toLowerCase().includes("team lead") ||
      userRole?.toLowerCase().includes("team_lead") ||
      userRole === "Team Lead" ||
      userRole === "BIM Manager");

  const isTeamLead =
    !isSupportAdmin &&
    (user?.type === "team_lead" ||
      userRole?.toLowerCase().includes("team lead") ||
      userRole?.toLowerCase().includes("team_lead") ||
      userRole === "Team Lead");

  const isEmployee =
    !isSupportAdmin &&
    (user?.type === "employee");

  const isEmployeeType =
    isEmployee ||
    isHR ||
    isManager ||
    isTeamLead ||
    isSupportAdmin;

  // ==========================================================
  // CHECK PERMISSION FOR CURRENT ROUTE
  // ==========================================================
  const checkRoutePermission = () => {
    // If user is admin or has all permissions, allow all
    if (isAdmin || hasAllPermissions) {
      return true;
    }

    // Get the module for the current route
    const currentPath = location.pathname;
    const moduleSlug = getModuleFromRoute(currentPath);

    // If no module mapping found, allow the route (it might be a public route)
    if (!moduleSlug) {
      return true;
    }

    // Check if user has read permission for this module
    const permissions = user?.permissions || {};
    const modulePermission = permissions[moduleSlug];

    // Special handling for "my-" prefixed modules (employee personal modules)
    if (moduleSlug.startsWith("my-")) {
      // These are generally allowed for all authenticated users
      return true;
    }

    // Support Admin specific permissions
    if (isSupportAdmin) {
      // Allow access to support admin dashboard
      if (moduleSlug === "support-admin-dashboard") {
        return true;
      }
      // Allow access to developer tickets
      if (moduleSlug === "developer-tickets") {
        return permissions["developer-tickets"]?.read === true;
      }
      // Allow access to ticket-raise
      if (moduleSlug === "ticket-raise") {
        return true;
      }
      // Allow dashboard
      if (moduleSlug === "dashboard") {
        return true;
      }
    }

    // Check specific permission
    if (modulePermission) {
      return modulePermission.read === true;
    }

    // If no permission found, deny access
    console.warn(
      `ProtectedRoute: No permission found for module "${moduleSlug}"`,
      {
        path: currentPath,
        userType: user?.type,
        hasAllPermissions,
        permissions: permissions
      }
    );
    return false;
  };

  // ==========================================================
  // WAIT FOR AUTH INITIALIZATION
  // ==========================================================
  if (loading) {
    return <Loader fullScreen />;
  }

  // ==========================================================
  // RESTORE ACTIVE TYPE BEFORE AUTH FAILURE
  // ==========================================================
  const activeType = restoreActiveUserType();

  // ==========================================================
  // AUTHENTICATION VALIDATION
  // ==========================================================
  const hasValidToken =
    activeType &&
    isValidToken(
      localStorage.getItem(
        `${activeType}-token`
      )
    );

  // If Redux says authenticated, normal validation
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

    // CHECK PERMISSION FOR THE ROUTE
    const hasRoutePermission = checkRoutePermission();
    
    if (!hasRoutePermission) {
      console.warn(
        "ProtectedRoute: User does not have permission for this route",
        {
          path: location.pathname,
          userType: user?.type,
          module: getModuleFromRoute(location.pathname)
        }
      );

      if (isSupportAdmin) {
        return (
          <Navigate
            to="/employee/support-admin-dashboard"
            replace
          />
        );
      }

      const redirectPath = isAdmin ? "/admin/dashboard" : "/employee/dashboard";
      
      return (
        <Navigate
          to={redirectPath}
          replace
        />
      );
    }
  }

  // ==========================================================
  // REDUX NOT AUTHENTICATED BUT TOKEN STILL EXISTS
  // ==========================================================
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

  if (!activeType) {
    console.warn(
      "ProtectedRoute: Waiting for active user type..."
    );
    return <Loader fullScreen />;
  }

  // ==========================================================
  // USER DASHBOARD
  // ==========================================================
  const getUserDashboard = () => {
    if (isSupportAdmin) {
      return "/employee/support-admin-dashboard";
    }
    if (isAdmin) {
      return "/admin/dashboard";
    }
    return "/employee/dashboard";
  };

  // ==========================================================
  // REQUIRED USER TYPE
  // ==========================================================
  if (requiredType) {
  let hasRequiredType = false;

  switch (requiredType) {
    case "admin":
      hasRequiredType = isAdmin;
      break;
    case "employee":
      hasRequiredType = isEmployeeType; // includes isSupportAdmin
      break;
    case "hr":
      hasRequiredType = isHR; // already false for Support Admin
      break;
    case "manager":
      hasRequiredType = isManager; // already false for Support Admin
      break;
    case "team_lead":
      hasRequiredType = isTeamLead; // already false for Support Admin
      break;
    case "support-admin":
      hasRequiredType = isSupportAdmin;
      break;
    default:
      hasRequiredType =
        activeType === requiredType ||
        user?.type === requiredType ||
        (requiredType === "employee" && isEmployeeType);
      break;
  }
  
    if (!hasRequiredType) {
      const redirectPath = getUserDashboard();

      console.warn(
        "ProtectedRoute: User type authorization failed",
        {
          currentPath: location.pathname,
          requiredType,
          activeType,
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

  // ==========================================================
  // PERMISSION VALIDATION (for requiredPermission prop)
  // ==========================================================
  if (requiredPermission) {
    const permissions =
      user?.permissions || {};

    // Special handling for Support Admin
    if (isSupportAdmin) {
      // Allow access to support-admin-dashboard
      if (requiredPermission === "support-admin-dashboard") {
        // No further permission needed
      }
      // Allow access to developer-tickets if they have permission
      else if (requiredPermission === "developer-tickets") {
        if (permissions["developer-tickets"]?.read !== true) {
          console.warn(
            "ProtectedRoute: Support Admin does not have developer-tickets permission",
            { requiredPermission }
          );
          return (
            <Navigate
              to="/employee/support-admin-dashboard"
              replace
            />
          );
        }
      }
      // For other permissions, check normally
      else {
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
    } else {
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
  }

  // ==========================================================
  // AUTHORIZED
  // ==========================================================
  return children || <Outlet />;
};

export default ProtectedRoute;