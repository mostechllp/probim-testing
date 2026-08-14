import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchRolePermissions } from "../admin/store/slices/roleSlice";

export const usePermissions = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { rolePermissions } = useSelector((state) => state.roles);
  const [userPermissions, setUserPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  const userRoleId = user?.role?.id;
  const userType = user?.type || "employee";

  useEffect(() => {
    const loadPermissions = async () => {
      
      if (userType === "admin") {
        // Admin has all permissions
        setUserPermissions({ all: true });
        setLoading(false);
        return;
      }

      // First check if user has permissions directly in the user object
      if (user?.permissions) {
        setUserPermissions(user.permissions);
        setLoading(false);
        return;
      }

      if (userRoleId) {
        // Check if we already have permissions for this role in Redux
        if (rolePermissions[userRoleId]) {
          setUserPermissions(rolePermissions[userRoleId]);
          setLoading(false);
        } else {
          // Fetch permissions for the role
          const result = await dispatch(fetchRolePermissions(userRoleId));
          if (result.payload) {
            setUserPermissions(result.payload);
          }
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [dispatch, userRoleId, userType, rolePermissions, user]);

  const hasPermission = (module, action = "read") => {
    
    // Admin has all permissions
    if (userType === "admin") return true;
    
    // If permissions object has 'all' flag
    if (userPermissions.all === true) return true;
    
    // Check if permission exists for the module
    if (module && userPermissions[module]) {
      const hasAccess = userPermissions[module][action] === true;
      return hasAccess;
    }
    
    return false;
  };

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(({ module, action = "read" }) => 
      hasPermission(module, action)
    );
  };

  const hasAllPermissions = (permissionList) => {
    return permissionList.every(({ module, action = "read" }) => 
      hasPermission(module, action)
    );
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userType,
    permissions: userPermissions,
    loading,
  };
};