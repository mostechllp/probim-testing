import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  clearError,
  loginUser,
  setRememberMe,
  requestPasswordReset,
  resetPassword,
} from "../store/slices/authSlice";
import { showToast } from "../components/common/Toast";
import { useAppTheme } from "../context/ThemeContext";
import apiClient, { clearAllTokens } from "../utils/apiClient";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMeState] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resetStep, setResetStep] = useState(1);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, userType, user } = useSelector(
    (state) => state.auth,
  );

  const { primaryColor } = useAppTheme();

  const getRedirectPath = (userObj, resolvedUserType) => {
    const roleName = userObj?.role?.name || userObj?.role || "";
    const isSupportAdmin =
      roleName === "Support Admin" ||
      roleName === "support_admin" ||
      roleName?.toLowerCase?.().includes("support admin");

    if (isSupportAdmin) {
      return "/employee/support-admin-dashboard";
    }

    return resolvedUserType === "admin"
      ? "/admin/dashboard"
      : "/employee/dashboard";
  };

  // --- Token Cleanup on Mount ---
  // replace the token-cleanup useEffect with:
  useEffect(() => {
    // FIX: this previously only checked admin/hr/employee
    // tokens, missing manager and team_lead — so stale
    // sessions for those roles were never cleaned up here.
    const hasAnyRoleToken = [
      "admin",
      "hr",
      "employee",
      "manager",
      "team_lead",
    ].some((type) => localStorage.getItem(`${type}-token`));

    const activeType = localStorage.getItem("active-user-type");

    if (hasAnyRoleToken && !activeType) {
      clearAllTokens();
      localStorage.removeItem("remember-me");
      localStorage.removeItem("remembered-email");
      localStorage.removeItem("user-type");
    }
  }, []);

  // Load remembered email if exists
  useEffect(() => {
    const remembered = localStorage.getItem("remember-me") === "true";
    const savedEmail = localStorage.getItem("remembered-email");
    if (remembered && savedEmail) {
      setEmail(savedEmail);
      setRememberMeState(true);
    }
  }, []);

  // Redirect based on user type after successful login
  useEffect(() => {
    if (isAuthenticated && userType) {
      const tokenKey = `${userType}-token`;
      const tokenExists = localStorage.getItem(tokenKey);
      const activeType = localStorage.getItem("active-user-type");

      if (!tokenExists || (activeType && activeType !== userType)) {
        console.warn(
          "⚠️ Token mismatch or missing, clearing and redirecting to login",
        );
        clearAllTokens();
        localStorage.removeItem("user-type");
        navigate("/login", { replace: true });
        return;
      }

      const redirectPath = getRedirectPath(user, userType);
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, userType, user, navigate]);

  // Show error toast if login fails
  useEffect(() => {
    if (error) {
      showToast(error, "error");
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      showToast("Please fill in all fields", "error");
      return;
    }

    // Clear all existing tokens before login
    clearAllTokens();
    localStorage.removeItem("user-type");
    localStorage.removeItem("active-user-type");

    // Store remember me preference
    dispatch(setRememberMe(rememberMe));

    try {
      const result = await dispatch(loginUser({ email, password })).unwrap();

      // The loginUser thunk already handles token storage
      // No need to store tokens again here

      // Force navigation
      const userType = result.user?.type;
      if (userType) {
        const redirectPath = getRedirectPath(result.user, userType);
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 100);
      }
    } catch (error) {
      console.log("Login failed:", error);
    }
  };

  const adjustColor = (color, percent) => {
    let r, g, b;
    if (color.startsWith("#")) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    } else {
      return color;
    }

    r = Math.max(0, Math.min(255, r + (r * percent) / 100));
    g = Math.max(0, Math.min(255, g + (g * percent) / 100));
    b = Math.max(0, Math.min(255, b + (b * percent) / 100));

    return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
  };

  const darkerColor = adjustColor(primaryColor, -15);

  const handleForgotPassword = () => {
    setResetEmail(email || "");
    setResetStep(1);
    setCodeSent(false);
    setResetCode("");
    setNewPassword("");
    setShowForgotPassword(true);
  };

  const handleRequestCode = async () => {
    if (!resetEmail) {
      showToast("Please enter your email address", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    setIsRequestingCode(true);
    try {
      const result = await dispatch(
        requestPasswordReset({ email: resetEmail }),
      ).unwrap();
      showToast(result.message || "Reset code sent to your email!", "success");
      setCodeSent(true);
      setResetStep(2);
    } catch (error) {
      showToast(
        error || "Failed to send reset code. Please try again.",
        "error",
      );
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode) {
      showToast("Please enter the reset code", "error");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setIsResetting(true);
    try {
      const result = await dispatch(
        resetPassword({
          code: resetCode,
          password: newPassword,
        }),
      ).unwrap();

      showToast(result.message || "Password reset successfully!", "success");
      setShowForgotPassword(false);
      setResetEmail("");
      setResetCode("");
      setNewPassword("");
      setResetStep(1);
      setCodeSent(false);
    } catch (error) {
      showToast(
        error || "Failed to reset password. Please try again.",
        "error",
      );
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape" && showForgotPassword) {
        setShowForgotPassword(false);
        setResetStep(1);
        setCodeSent(false);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [showForgotPassword]);

  // ... (JSX remains the same)
  return (
    // Your existing JSX here...
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div
        className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center p-10"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${darkerColor})`,
          transition: "background 0.3s ease",
        }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 text-center text-white max-w-md">
          <div className="mb-8">
            <img
              src="https://violet-leopard-500489.hostingersite.com/hr/public/assets/images/hr-logo2.jpg"
              alt="Logo"
              className="w-20 h-20 object-contain rounded-lg bg-white p-2 mx-auto shadow-lg"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4">Human Resource Management</h1>
          <p className="text-lg opacity-90 mb-10">
            Unified portal for administrators and employees. Seamlessly manage
            attendance, leaves, reports, and more in one place.
          </p>
          <div className="space-y-3 text-left">
            {[
              "Employee Directory & Profiles",
              "Smart Attendance Tracking",
              "Real-time Analytics & Reports",
              "Leave Management System",
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-xl"
              >
                <i className="fas fa-check-circle"></i>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Please enter your credentials to sign in
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary-custom focus:ring-2 focus:ring-primary-custom/20 transition-all"
                  placeholder="your@email.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary-custom focus:ring-2 focus:ring-primary-custom/20 transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <i
                    className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                  ></i>
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMeState(e.target.checked)}
                  className="w-4 h-4 transition-all"
                  style={{ accentColor: primaryColor }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                backgroundColor: primaryColor,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = adjustColor(
                  primaryColor,
                  -10,
                ))
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = primaryColor)
              }
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Authenticating...
                </>
              ) : (
                <>
                  <i className="fas fa-arrow-right-to-bracket"></i> Sign In
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal - Two Step Process */}
      {showForgotPassword && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => {
            setShowForgotPassword(false);
            setResetStep(1);
            setCodeSent(false);
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-slideUp max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <i
                    className="fas fa-key text-sm"
                    style={{ color: primaryColor }}
                  ></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {resetStep === 1 ? "Reset Password" : "Enter Reset Code"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetStep(1);
                  setCodeSent(false);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Step 1: Request Code */}
            {resetStep === 1 && (
              <>
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enter your email address and we'll send you a code to reset
                    your password.
                  </p>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRequestCode();
                          }
                        }}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary-custom focus:ring-2 focus:ring-primary-custom/20 transition-all"
                        placeholder="your@email.com"
                        disabled={isRequestingCode}
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetStep(1);
                      setCodeSent(false);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    disabled={isRequestingCode}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestCode}
                    disabled={isRequestingCode || !resetEmail}
                    className="flex-1 px-4 py-2.5 rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: primaryColor,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = adjustColor(
                        primaryColor,
                        -10,
                      ))
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = primaryColor)
                    }
                  >
                    {isRequestingCode ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i> Send Code
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Enter Code & New Password */}
            {resetStep === 2 && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <i className="fas fa-check-circle text-green-500"></i>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Code sent to <strong>{resetEmail}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Reset Code
                    </label>
                    <div className="relative">
                      <i className="fas fa-shield-alt absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      <input
                        type="text"
                        value={resetCode}
                        onChange={(e) =>
                          setResetCode(e.target.value.toUpperCase())
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleResetPassword();
                          }
                        }}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary-custom focus:ring-2 focus:ring-primary-custom/20 transition-all uppercase"
                        placeholder="Enter 6-digit code"
                        disabled={isResetting}
                        maxLength={6}
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Enter the 6-digit code sent to your email
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleResetPassword();
                          }
                        }}
                        className="w-full pl-11 pr-11 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary-custom focus:ring-2 focus:ring-primary-custom/20 transition-all"
                        placeholder="New password (min 6 characters)"
                        disabled={isResetting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <i
                          className={`fas ${showNewPassword ? "fa-eye-slash" : "fa-eye"}`}
                        ></i>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setResetStep(1);
                      setCodeSent(false);
                      setResetCode("");
                      setNewPassword("");
                    }}
                    className="px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    disabled={isResetting}
                  >
                    <i className="fas fa-arrow-left mr-1"></i> Back
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={isResetting || !resetCode || !newPassword}
                    className="flex-1 px-4 py-2.5 rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: primaryColor,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = adjustColor(
                        primaryColor,
                        -10,
                      ))
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = primaryColor)
                    }
                  >
                    {isResetting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Resetting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i> Reset Password
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
