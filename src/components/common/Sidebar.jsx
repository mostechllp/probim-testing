import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const ADMIN_ROUTE_MAP = {
  dashboard: "/admin/dashboard",
  onboarding: "/admin/employees/onboarding",
  offboarding: "/admin/employees/offboarding",
  employees: "/admin/employees",
  attendance: "/admin/attendances",
  "attendance-requests": "/admin/attendance-requests",
  "wfh-requests": "/admin/wfh",
  documents: "/admin/agreements",
  leaves: "/admin/leaves",
  "my-leaves": "/admin/my-leaves",
  "task-reports": "/admin/task-reports",
  reports: "/admin/reports",
  projects: "/admin/projects",
  "project-assignments": "/admin/project-assignments",
  payroll: "/admin/payroll",
  roles: "/admin/roles",
  settings: "/admin/settings",
  "my-tasks": "/admin/my-tasks",
  organizations: "/admin/organizations",
  agreements: "/admin/agreements",
  "role-management": "/admin/role-management",
  wfh: "/admin/wfh",
  "my-wfh-requests": "/admin/my-wfh-requests",
  "my-payroll": "/employee/payroll",
  "my-documents": "/employee/my-documents",
};

const EMPLOYEE_ROUTE_MAP = {
  dashboard: "/employee/dashboard",
  onboarding: "/employee/onboarding",
  employees: "/employee/employees",
  attendance: "/employee/attendance",
  "attendance-requests": "/employee/attendance-requests",
  "my-attendance-requests": "/employee/my-attendance-requests",
  documents: "/employee/agreements",
  "my-documents": "/employee/my-documents",
  "task-reports": "/employee/task-reports",
  reports: "/employee/reports",
  projects: "/employee/projects",
  settings: "/employee/settings",
  leaves: "/employee/leave-management",
  "my-leaves": "/employee/leaves",
  "my-wfh-requests": "/employee/my-wfh",
  "wfh-requests": "/employee/wfh",
  payroll: "/employee/payroll",
  roles: "/employee/roles",
  "my-tasks": "/employee/my-tasks",
  "my-profile": "/employee/profile",
  "project-assignments": "/employee/project-assignments",
  wfh: "/employee/wfh",
  "my-payroll": "/employee/payroll",
};

const ICON_MAP = {
  dashboard: "fas fa-chart-line",
  onboarding: "fas fa-user-plus",
  offboarding: "fas fa-user-minus",
  employees: "fas fa-users",
  attendance: "fas fa-fingerprint",
  "attendance-requests": "fas fa-clock",
  "my-attendance-requests": "fas fa-clock",
  "wfh-requests": "fas fa-house-user",
  "my-wfh-requests": "fas fa-house-user",
  documents: "fas fa-file-signature",
  "my-documents": "fas fa-file-signature",
  leaves: "fas fa-calendar-check",
  "my-leaves": "fas fa-calendar-alt",
  "task-reports": "fas fa-tasks",
  reports: "fas fa-chart-bar",
  projects: "fas fa-folder",
  "project-assignments": "fas fa-user-check",
  payroll: "fas fa-file-invoice-dollar",
  roles: "fas fa-user-shield",
  settings: "fas fa-gear",
  "my-tasks": "fas fa-list-check",
  "my-profile": "fas fa-user-circle",
  organizations: "fas fa-building",
  agreements: "fas fa-file",
  "role-management": "fas fa-user-shield",
  wfh: "fas fa-house-user",
  "my-payroll": "fas fa-file-invoice-dollar",
};

// Configuration for parent menus and their children
const PARENT_MENU_CONFIG = {
  leaves: {
    label: "Leaves",
    icon: "fas fa-calendar-check",
    children: ["leaves", "my-leaves"],
    roles: [
      "HR Manager",
      "hr manager",
      "HR",
      "manager",
      "team_lead",
      "Team Lead",
      "BIM Manager",
    ],
    order: 999,
  },
  tasks: {
    label: "Tasks",
    icon: "fas fa-tasks",
    children: ["task-reports", "my-tasks"],
    roles: [
      "HR Manager",
      "hr manager",
      "HR",
      "manager",
      "team_lead",
      "Team Lead",
      "BIM Manager",
    ],
    order: 1000,
  },
  wfh: {
    label: "WFH Requests",
    icon: "fas fa-house-user",
    children: ["wfh-requests", "my-wfh-requests"],
    roles: [
      "HR Manager",
      "hr manager",
      "HR",
      "manager",
      "team_lead",
      "Team Lead",
      "BIM Manager",
    ],
    order: 998,
  },
  // NEW: Attendance Requests parent menu
  attendance_requests: {
    label: "Attendance Requests",
    icon: "fas fa-clock",
    children: ["attendance-requests", "my-attendance-requests"],
    roles: [
      "HR Manager",
      "hr manager",
      "HR",
      "manager",
      "team_lead",
      "Team Lead",
      "BIM Manager",
    ],
    order: 997,
  },
};

// Define which modules are children (for filtering)
const ALL_CHILDREN = Object.values(PARENT_MENU_CONFIG).flatMap(
  (config) => config.children,
);

// Define modules that should be hidden (aliases/duplicates)
const HIDDEN_MODULES = ["role-management", "agreements", "wfh"]; // Added wfh back to hidden

// Define order of standalone modules
const MODULE_ORDER = {
  dashboard: 1,
  onboarding: 2,
  employees: 3,
  offboarding: 4,
  projects: 5,
  "project-assignments": 6,
  attendance: 7,
  "attendance-requests": 8,
  "my-attendance-requests": 9,
  documents: 10,
  leaves: 11,
  "my-leaves": 12,
  "task-reports": 13,
  "my-tasks": 14,
  "wfh-requests": 15,
  "my-wfh-requests": 16,
  reports: 17,
  payroll: 18,
  "my-payroll": 18,
  roles: 19,
  organizations: 20,
  agreements: 21,
  settings: 22,
  "role-management": 23,
  "my-profile": 24,
  "my-documents": 25,
};

const Sidebar = ({ isOpen, setIsOpen }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [setIsOpen]);

  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location, isMobile, setIsOpen]);

  // Determine which route map to use based on user type
  const activeRouteMap =
    user?.type === "admin" ? ADMIN_ROUTE_MAP : EMPLOYEE_ROUTE_MAP;

  // Get user role and type
  const userRole = user?.role?.name || user?.role || "";
  const userType = user?.type || "";

  // Check if user is HR
  const isHR =
    userType === "hr" ||
    userRole === "HR Manager" ||
    userRole === "HR" ||
    userRole === "hr manager" ||
    userRole?.toLowerCase() === "hr";

  // Check if user is Manager or Team Lead
  const isManager =
    userType === "manager" ||
    userType === "team_lead" ||
    userRole?.toLowerCase().includes("manager") ||
    userRole?.toLowerCase().includes("team lead") ||
    userRole?.toLowerCase().includes("team_lead") ||
    userRole === "Team Lead" ||
    userRole === "BIM Manager";

  // Check if user has all permissions (Super Admin or Admin with all permissions)
  const hasAllPermissions = user?.permissions?.all === true;

  // Check if user is admin (either type admin or has all permissions)
  const isAdmin = userType === "admin" || hasAllPermissions;

  // Check if user should see parent menus (HR, Manager, Team Lead, or Admin)
  const shouldShowParentMenus = isHR || isManager || isAdmin;

  // Get permissions from user object
  const permissions = user?.permissions || {};

  // Check if user has read permission for a module
  const hasReadPermission = (slug) => {
    // If user has 'all' permission (Super Admin), allow all
    if (hasAllPermissions) return true;

    // If user is admin type, allow all
    if (userType === "admin") return true;

    // Check specific permission for the module
    const modulePermission = permissions[slug];
    if (modulePermission) {
      return modulePermission.read === true;
    }

    // If no permission found, check if it's a public module
    const publicModules = [
      "dashboard",
      "my-leaves",
      "my-tasks",
      "task-reports",
      "my-wfh-requests",
      "my-profile",
      "my-attendance-requests", // Added this
    ];
    if (publicModules.includes(slug)) return true;

    return false;
  };

  // Check if module should be shown
  const shouldShowModule = (slug) => {
    // Always show dashboard
    if (slug === "dashboard") return true;

    // Hide hidden modules (duplicates, sensitive)
    if (HIDDEN_MODULES.includes(slug)) return false;

    // Hide sensitive modules for users without all permissions
    if (!hasAllPermissions && HIDDEN_MODULES.includes(slug)) return false;

    // Check if user has permission
    return hasReadPermission(slug);
  };

  // Get all available modules from API and filter
  const apiModules = (user?.sidebar_modules || [])
    .filter((mod) => {
      // Must be active
      if (mod.status !== "active") return false;

      // Must have a route mapped
      if (!activeRouteMap[mod.slug]) {
        console.warn(`No route mapping found for slug: ${mod.slug}`);
        return false;
      }

      // Check if module should be shown
      if (!shouldShowModule(mod.slug)) return false;

      return true;
    })
    .map((mod) => mod.slug);

  const allModules = [...apiModules];

  // Build navigation with submenus
  const buildNavItems = () => {
    const navItems = [];
    const processedSlugs = new Set();
    const parentItems = [];
    const standaloneItems = [];

    // Create parent menus for users with appropriate roles
    if (shouldShowParentMenus) {
      Object.entries(PARENT_MENU_CONFIG).forEach(([parentKey, config]) => {
        // Check if user has access to this parent menu
        const hasRoleAccess =
          config.roles.some(
            (role) =>
              userRole === role ||
              userRole?.toLowerCase() === role.toLowerCase() ||
              userRole?.toLowerCase().includes(role.toLowerCase()) ||
              userType === role,
          ) || isAdmin;

        if (!hasRoleAccess) return;

        // Get children that exist in allModules
        const availableChildren = config.children.filter((child) => {
          return allModules.includes(child) && hasReadPermission(child);
        });

        // Show parent menu if there are 2 or more children
        if (availableChildren.length >= 2) {
          const children = availableChildren.map((childSlug) => {
            const module = user?.sidebar_modules?.find(
              (m) => m.slug === childSlug,
            );
            return {
              slug: childSlug,
              label: module?.name || childSlug,
              path: activeRouteMap[childSlug],
              icon: ICON_MAP[childSlug] || "fas fa-circle",
            };
          });

          const isActive = children.some(
            (child) => location.pathname === child.path,
          );

          parentItems.push({
            type: "parent",
            slug: parentKey,
            label: config.label,
            icon: config.icon,
            children: children,
            isActive: isActive,
            order: config.order || 500,
          });

          children.forEach((child) => processedSlugs.add(child.slug));
        }
        // If there's only 1 child, add it as a standalone item
        else if (availableChildren.length === 1) {
          const childSlug = availableChildren[0];
          const module = user?.sidebar_modules?.find(
            (m) => m.slug === childSlug,
          );

          const childLabel = module?.name || childSlug;
          const childIcon = ICON_MAP[childSlug] || "fas fa-circle";

          standaloneItems.push({
            type: "single",
            slug: childSlug,
            label: childLabel,
            path: activeRouteMap[childSlug],
            icon: childIcon,
            order: (config.order || 500) - 1,
          });

          processedSlugs.add(childSlug);
        }
      });
    } else {
      // For regular employees, show my-leaves, my-tasks, my-wfh-requests, my-documents, my-attendance-requests as standalone
      const employeeStandalone = [
        "my-leaves",
        "my-tasks",
        "my-wfh-requests",
        "my-documents",
        "my-attendance-requests", // Added this
      ];
      employeeStandalone.forEach((slug) => {
        if (allModules.includes(slug) && hasReadPermission(slug)) {
          const module = user?.sidebar_modules?.find((m) => m.slug === slug);
          standaloneItems.push({
            type: "single",
            slug: slug,
            label: module?.name || slug,
            path: activeRouteMap[slug],
            icon: ICON_MAP[slug] || "fas fa-circle",
            order: MODULE_ORDER[slug] || 100,
          });
          processedSlugs.add(slug);
        }
      });
    }

    // Add all standalone modules (skip children that are already in parent menus)
    allModules.forEach((slug) => {
      // Skip if already processed
      if (processedSlugs.has(slug)) return;

      const module = user?.sidebar_modules?.find((m) => m.slug === slug);
      let label = module?.name || slug;
      
      // Keep the original labels from the API
      // Don't override labels - let the API name be the display name
      
      standaloneItems.push({
        type: "single",
        slug: slug,
        label: label,
        path: activeRouteMap[slug],
        icon: ICON_MAP[slug] || "fas fa-circle",
        order: MODULE_ORDER[slug] || 100,
      });
    });

    const allItems = [...standaloneItems, ...parentItems];
    allItems.sort((a, b) => (a.order || 0) - (b.order || 0));

    return allItems;
  };

  const navItems = buildNavItems();

  const toggleMenu = (slug) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  const isMenuExpanded = (slug) => {
    if (isMobile) return expandedMenus[slug] || false;
    return expandedMenus[slug] || false;
  };

  const showChevron = !isMobile && isOpen;

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-gray-900 z-50 transition-all duration-300
          flex flex-col
          ${
            isMobile
              ? `${isOpen ? "translate-x-0" : "-translate-x-full"} w-64`
              : "w-[72px] hover:w-64 group"
          }
        `}
        onMouseEnter={() => !isMobile && setIsOpen(true)}
        onMouseLeave={() => !isMobile && setIsOpen(false)}
      >
        {/* Logo Section */}
        <div className="flex-shrink-0 py-5 px-4 border-b border-white/10 flex justify-center items-center">
          <img
            src="https://violet-leopard-500489.hostingersite.com/hr/public/assets/images/hr-logo2.jpg"
            alt="HMR Logo"
            className={`object-contain rounded-lg bg-white p-1 transition-all duration-300 ${
              !isMobile && !isOpen ? "w-10 h-10" : "w-12 h-12"
            }`}
          />
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent hover:scrollbar-thumb-gray-600">
          {navItems.map((item) => {
            if (item.type === "parent") {
              const expanded = isMenuExpanded(item.slug);
              // Check if sidebar is expanded (hovered or open)
              const isSidebarExpanded = isMobile ? isOpen : isOpen;

              return (
                <div key={item.slug} className="mb-1">
                  <div
                    onClick={() => toggleMenu(item.slug)}
                    className={`
            flex items-center gap-3 px-5 py-3 mx-2 rounded-xl 
            transition-all duration-200 cursor-pointer select-none
            ${item.isActive ? "bg-green-500/20 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"}
          `}
                  >
                    <i className={item.icon + " w-6 text-lg flex-shrink-0"}></i>
                    <span
                      className={`flex-1 transition-opacity duration-200 ${
                        !isMobile && !isOpen
                          ? "opacity-0 group-hover:opacity-100"
                          : "opacity-100"
                      }`}
                    >
                      {item.label}
                    </span>
                    {/* Show chevron only when sidebar is expanded OR on mobile */}
                    {(isMobile || isOpen) && (
                      <i
                        className={`fas fa-chevron-${expanded ? "up" : "down"} text-xs transition-transform duration-200 flex-shrink-0`}
                      ></i>
                    )}
                  </div>

                  {/* Show submenu only when:
            1. On mobile: when menu is toggled
            2. On desktop: when sidebar is expanded (hovered/open) AND menu is toggled
        */}
                  {((isMobile && expandedMenus[item.slug]) ||
                    (!isMobile && isOpen && expanded)) && (
                    <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-700/50 pl-2">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.slug}
                          to={child.path}
                          onClick={() => {
                            if (isMobile) setIsOpen(false);
                          }}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-5 py-2 mx-2 rounded-xl transition-all duration-200 cursor-pointer ${
                              isActive
                                ? "bg-green-500/20 text-white"
                                : "text-gray-400 hover:text-white hover:bg-white/10"
                            }`
                          }
                        >
                          <i
                            className={
                              child.icon + " w-6 text-sm flex-shrink-0"
                            }
                          ></i>
                          <span className="text-sm">{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <NavLink
                key={item.slug}
                to={item.path}
                end={
                  item.path === "/admin/employees" ||
                  item.path === "/admin/dashboard" ||
                  item.path === "/employee/dashboard"
                }
                onClick={() => isMobile && setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3 mx-2 rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap overflow-hidden ${
                    isActive
                      ? "bg-green-500/20 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`
                }
              >
                <i className={item.icon + " w-6 text-lg flex-shrink-0"}></i>
                <span
                  className={`transition-opacity duration-200 ${
                    !isMobile && !isOpen
                      ? "opacity-0 group-hover:opacity-100"
                      : "opacity-100"
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;