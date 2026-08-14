// src/admin/components/onboarding/SalaryBankDetailsForm.jsx

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiChevronRight,
  FiChevronLeft,
  FiDollarSign,
  FiCreditCard,
  FiSave,
  FiPlus,
  FiTrash2,
  FiEdit,
  FiHome,
  FiMapPin,
  FiLoader,
  FiAlertCircle,
} from "react-icons/fi";
import {
  setStep,
  updateEmployeeDetails,
  saveOnboardingSalary,
  saveOnboardingBanks,
} from "../../store/slices/onboardingSlice";
import { showToast } from "../../components/common/Toast";

const ICON_MAP = {
  FiHome: FiHome,
  FiMapPin: FiMapPin,
};

const SalaryBankDetailsForm = () => {
  const dispatch = useDispatch();
  const onboardingState = useSelector((state) => state.onboarding) || {};
  const { employeeDetails = {}, savedEmployeeId } = onboardingState;

  // --- Dynamic State Management ---
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // 1. Salary Packages State - Static packages
  const [packages, setPackages] = useState({
    package1: {
      id: "package1",
      name: "Package 1 - Home Country / WFH",
      iconName: "FiHome",
      iconClass: "text-blue-500",
      currency: "AED",
      salaryComponents: [],
      isSaved: false,
      totalSalary: 0,
      packageId: null,
    },
    package2: {
      id: "package2",
      name: "Package 2 - Dubai Onsite",
      iconName: "FiMapPin",
      iconClass: "text-green-500",
      currency: "AED",
      salaryComponents: [],
      isSaved: false,
      totalSalary: 0,
      packageId: null,
    },
  });

  // 2. Bank Details States
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankCountry, setBankCountry] = useState("UAE");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankSwift, setBankSwift] = useState("");

  // 3. Payment Cycle State
  const [paymentCycle, setPaymentCycle] = useState("Monthly");

  // 4. Form Errors Validation State
  const [formErrors, setFormErrors] = useState({});
  const [activePackage, setActivePackage] = useState("package1");
  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentPrice, setNewComponentPrice] = useState("");

  // Available currencies
  const currenciesList = [
    { code: "AED", name: "United Arab Emirates Dirham (AED)" },
    { code: "INR", name: "Indian Rupee (INR)" },
    { code: "USD", name: "United States Dollar (USD)" },
    { code: "EUR", name: "Euro (EUR)" },
    { code: "GBP", name: "British Pound (GBP)" },
    { code: "PHP", name: "Philippine Peso (PHP)" },
    { code: "LKR", name: "Sri Lankan Rupee (LKR)" },
  ];

  // ─── Get userId from onboarding state ─────────────────────────────────────
  const getUserId = () => {
    return (
      onboardingState.employeeDetails?.userId ||
      onboardingState.employeeDetails?.user_id ||
      localStorage.getItem('employeeUserId') ||
      localStorage.getItem('onboardingEmployeeUserId') ||
      null
    );
  };

  // ─── Load Draft / Restore Redux State ──────────────────────────────────
  useEffect(() => {
    const draftStr = localStorage.getItem("onboarding-draft");
    let details = employeeDetails;

    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft?.employeeDetails) {
          details = draft.employeeDetails;
        }
      } catch (err) {
        console.error("Failed to parse onboarding draft", err);
      }
    }

    if (details && Object.keys(details).length > 0) {
      // Load packages
      if (details.packages) {
        const updatedPackages = { ...packages };
        if (details.packages.package1) {
          updatedPackages.package1 = {
            ...updatedPackages.package1,
            ...details.packages.package1,
            salaryComponents: details.packages.package1.salaryComponents || [],
            isSaved: details.packages.package1.isSaved || false,
            packageId: details.packages.package1.packageId || null,
          };
        }
        if (details.packages.package2) {
          updatedPackages.package2 = {
            ...updatedPackages.package2,
            ...details.packages.package2,
            salaryComponents: details.packages.package2.salaryComponents || [],
            isSaved: details.packages.package2.isSaved || false,
            packageId: details.packages.package2.packageId || null,
          };
        }
        setPackages(updatedPackages);
      }

      // Load bank accounts
      if (
        Array.isArray(details.bankAccounts) &&
        details.bankAccounts.length > 0
      ) {
        setBankAccounts(details.bankAccounts);
      } else if (details.bankName) {
        setBankAccounts([
          {
            id: Date.now(),
            bankCountry: details.bankCountry || "UAE",
            bankName: details.bankName,
            accountNumber: details.accountNumber,
            bankIfsc: details.bankIfsc || "",
            bankBranch: details.bankBranch || "",
            bankIban: details.bankIban
              ? details.bankIban.replace(/\s/g, "")
              : "",
            bankSwift: details.bankSwift || "",
          },
        ]);
      }

      if (details.paymentCycle) setPaymentCycle(details.paymentCycle);
    }
  }, [employeeDetails]);

  // ─── Save to localStorage and Redux ─────────────────────────────────────
  const saveToStorageAndRedux = (data) => {
    // Update Redux
    dispatch(updateEmployeeDetails(data));

    // Update localStorage draft
    const draftStr = localStorage.getItem("onboarding-draft");
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        draft.employeeDetails = {
          ...draft.employeeDetails,
          ...data,
        };
        localStorage.setItem("onboarding-draft", JSON.stringify(draft));
      } catch (err) {
        console.error("Failed to update draft:", err);
      }
    } else {
      // Create new draft if none exists
      const newDraft = {
        ...onboardingState,
        employeeDetails: {
          ...onboardingState.employeeDetails,
          ...data,
        },
      };
      localStorage.setItem("onboarding-draft", JSON.stringify(newDraft));
    }
  };

  // Compute total salary for a package
  const computePackageTotal = (components) => {
    return components.reduce(
      (sum, comp) => sum + (comp.price || comp.value || 0),
      0,
    );
  };

  // ─── Validation Functions ──────────────────────────────────────────────
  const validatePackage = (pkg) => {
    return pkg.salaryComponents.length > 0 && pkg.isSaved === true;
  };

  const validateAllPackages = () => {
    const errors = {};

    if (!validatePackage(packages.package1)) {
      errors.package1 = "Package 1 must be configured and saved";
    }

    if (!validatePackage(packages.package2)) {
      errors.package2 = "Package 2 must be configured and saved";
    }

    return errors;
  };

  // ─── Actions: Salary Package Management ──────────────────────────────────
  const handlePackageCurrencyChange = (pkgId, currency) => {
    setPackages((prev) => ({
      ...prev,
      [pkgId]: {
        ...prev[pkgId],
        currency,
      },
    }));
  };

  const handleAddSalaryComponent = (pkgId) => {
    if (!newComponentName.trim()) {
      showToast("Component name cannot be empty", "error");
      return;
    }
    const priceNum = parseFloat(newComponentPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast("Price must be a number greater than 0", "error");
      return;
    }

    const pkg = packages[pkgId];
    if (
      pkg.salaryComponents.some(
        (c) => c.name.toLowerCase() === newComponentName.trim().toLowerCase(),
      )
    ) {
      showToast(
        `Component "${newComponentName.trim()}" already exists in this package!`,
        "error",
      );
      return;
    }

    const newComponent = {
      id: Date.now(),
      name: newComponentName.trim(),
      price: priceNum,
    };

    setPackages((prev) => ({
      ...prev,
      [pkgId]: {
        ...prev[pkgId],
        salaryComponents: [...prev[pkgId].salaryComponents, newComponent],
      },
    }));

    setNewComponentName("");
    setNewComponentPrice("");
    setValidationErrors((prev) => ({ ...prev, [pkgId]: "" }));
    showToast("Component added successfully!", "success");
  };

  const handleDeleteSalaryComponent = (pkgId, componentId) => {
    setPackages((prev) => ({
      ...prev,
      [pkgId]: {
        ...prev[pkgId],
        salaryComponents: prev[pkgId].salaryComponents.filter(
          (c) => c.id !== componentId,
        ),
      },
    }));
  };

  const handleSaveSalaryPackage = (pkgId) => {
    const pkg = packages[pkgId];
    if (pkg.salaryComponents.length === 0) {
      showToast(
        `Please add at least one salary component to ${pkg.name} before saving`,
        "error",
      );
      return;
    }

    const total = computePackageTotal(pkg.salaryComponents);
    const updatedPkg = {
      ...pkg,
      isSaved: true,
      totalSalary: total,
    };

    setPackages((prev) => ({
      ...prev,
      [pkgId]: updatedPkg,
    }));

    // Save to Redux and localStorage immediately
    saveToStorageAndRedux({
      packages: {
        ...packages,
        [pkgId]: updatedPkg,
      },
    });

    setValidationErrors((prev) => ({ ...prev, [pkgId]: "" }));
    showToast(`${pkg.name} salary structure saved!`, "success");
  };

  const handleEditPackage = (pkgId) => {
    setPackages((prev) => ({
      ...prev,
      [pkgId]: {
        ...prev[pkgId],
        isSaved: false,
      },
    }));
  };

  // ─── Bank Details Functions ──────────────────────────────────────────────
  const handleBankCountryChange = (e) => {
    const selectedCountry = e.target.value;
    setBankCountry(selectedCountry);
    setBankIfsc("");
    setBankBranch("");
    setBankIban("");
    setBankSwift("");
    setFormErrors({});
  };

  const handleBankNameChange = (e) => {
    const val = e.target.value;
    setBankName(val);
    if (!val.trim()) {
      setFormErrors((prev) => ({ ...prev, bankName: "Bank name is required" }));
    } else if (val.trim().length < 2) {
      setFormErrors((prev) => ({
        ...prev,
        bankName: "Bank name must be at least 2 characters",
      }));
    } else {
      setFormErrors((prev) => ({ ...prev, bankName: "" }));
    }
  };

  const handleAccountNumberChange = (e) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9-\s]/g, "");
    setBankAccountNumber(val);

    const cleanVal = val.replace(/[\s-]/g, "");
    if (!val.trim()) {
      setFormErrors((prev) => ({
        ...prev,
        accountNumber: "Account number is required",
      }));
    } else if (
      bankCountry === "India" &&
      (cleanVal.length < 9 || cleanVal.length > 18)
    ) {
      setFormErrors((prev) => ({
        ...prev,
        accountNumber: "Indian bank account numbers must be 9 to 18 digits",
      }));
    } else if (
      bankCountry === "UAE" &&
      (cleanVal.length < 8 || cleanVal.length > 16)
    ) {
      setFormErrors((prev) => ({
        ...prev,
        accountNumber: "UAE bank account numbers must be 8 to 16 digits",
      }));
    } else {
      setFormErrors((prev) => ({ ...prev, accountNumber: "" }));
    }
  };

  const handleIfscChange = (e) => {
    const val = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 11);
    setBankIfsc(val);

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!val) {
      setFormErrors((prev) => ({ ...prev, ifsc: "IFSC Code is required" }));
    } else if (val.length < 11) {
      setFormErrors((prev) => ({
        ...prev,
        ifsc: "IFSC Code must be exactly 11 characters",
      }));
    } else if (!ifscRegex.test(val)) {
      setFormErrors((prev) => ({
        ...prev,
        ifsc: "Format must be: 4 letters, 0, then 6 alphanumeric (e.g. HDFC0000123)",
      }));
    } else {
      setFormErrors((prev) => ({ ...prev, ifsc: "" }));
    }
  };

  const handleBranchChange = (e) => {
    const val = e.target.value;
    setBankBranch(val);
    if (!val.trim()) {
      setFormErrors((prev) => ({ ...prev, branch: "Branch name is required" }));
    } else {
      setFormErrors((prev) => ({ ...prev, branch: "" }));
    }
  };

  const handleIbanChange = (e) => {
    let val = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 23);

    let formatted = "";
    for (let i = 0; i < val.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += " ";
      formatted += val[i];
    }
    setBankIban(formatted);

    if (!val) {
      setFormErrors((prev) => ({ ...prev, iban: "IBAN is required" }));
    } else if (!val.startsWith("AE")) {
      setFormErrors((prev) => ({
        ...prev,
        iban: "UAE IBAN must start with 'AE'",
      }));
    } else if (val.length < 23) {
      setFormErrors((prev) => ({
        ...prev,
        iban: `IBAN must be exactly 23 characters (current: ${val.length})`,
      }));
    } else {
      setFormErrors((prev) => ({ ...prev, iban: "" }));
    }
  };

  const handleSwiftChange = (e) => {
    const val = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 11);
    setBankSwift(val);

    const swiftRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    if (!val) {
      setFormErrors((prev) => ({
        ...prev,
        swift: "SWIFT/BIC Code is required",
      }));
    } else if (val.length !== 8 && val.length !== 11) {
      setFormErrors((prev) => ({
        ...prev,
        swift: "SWIFT/BIC Code must be 8 or 11 characters",
      }));
    } else if (!swiftRegex.test(val)) {
      setFormErrors((prev) => ({ ...prev, swift: "Invalid SWIFT/BIC format" }));
    } else {
      setFormErrors((prev) => ({ ...prev, swift: "" }));
    }
  };

  const handleAddBankDetails = () => {
    let errors = {};
    if (!bankName.trim()) errors.bankName = "Bank name is required";
    if (!bankAccountNumber.trim())
      errors.accountNumber = "Account number is required";

    if (bankCountry === "India") {
      if (!bankIfsc.trim()) {
        errors.ifsc = "IFSC Code is required";
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc)) {
        errors.ifsc = "Invalid IFSC Code format";
      }
      if (!bankBranch.trim()) errors.branch = "Branch name is required";
    } else {
      const rawIban = bankIban.replace(/\s/g, "");
      if (!bankIban.trim()) {
        errors.iban = "IBAN is required";
      } else if (!/^AE[A-Z0-9]{21}$/.test(rawIban)) {
        errors.iban = "Invalid UAE IBAN format (AE followed by 21 characters)";
      }
      if (!bankSwift.trim()) {
        errors.swift = "SWIFT/BIC Code is required";
      } else if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bankSwift)) {
        errors.swift = "Invalid SWIFT/BIC Code format";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast("Please correct the errors in the bank details form", "error");
      return;
    }

    const newBank = {
      id: Date.now(),
      bankCountry,
      bankName,
      accountNumber: bankAccountNumber,
      bankIfsc,
      bankBranch,
      bankIban: bankIban.replace(/\s/g, ""),
      bankSwift,
    };

    const updatedBankAccounts = [...bankAccounts, newBank];
    setBankAccounts(updatedBankAccounts);

    // Save to Redux and localStorage immediately
    saveToStorageAndRedux({
      bankAccounts: updatedBankAccounts,
    });

    setBankName("");
    setBankAccountNumber("");
    setBankIfsc("");
    setBankBranch("");
    setBankIban("");
    setBankSwift("");
    setFormErrors({});

    showToast("Bank details added successfully!", "success");
  };

  const handleDeleteBank = (id) => {
    const updatedBankAccounts = bankAccounts.filter((b) => b.id !== id);
    setBankAccounts(updatedBankAccounts);

    // Save to Redux and localStorage immediately
    saveToStorageAndRedux({
      bankAccounts: updatedBankAccounts,
    });
  };

  // ─── Draft Saving ────────────────────────────────────────────────────────
  const handleSaveDraft = () => {
    setIsSavingDraft(true);

    const sanitizedPackages = {
      package1: {
        ...packages.package1,
        icon: undefined,
        iconName: packages.package1.iconName || "FiHome",
        currency:
          typeof packages.package1.currency === "string"
            ? packages.package1.currency
            : "AED",
        packageId: packages.package1.packageId,
        salaryComponents: packages.package1.salaryComponents.map((comp) => ({
          ...comp,
          price:
            typeof comp.price === "number"
              ? comp.price
              : parseFloat(comp.price) || 0,
        })),
      },
      package2: {
        ...packages.package2,
        icon: undefined,
        iconName: packages.package2.iconName || "FiMapPin",
        currency:
          typeof packages.package2.currency === "string"
            ? packages.package2.currency
            : "AED",
        packageId: packages.package2.packageId,
        salaryComponents: packages.package2.salaryComponents.map((comp) => ({
          ...comp,
          price:
            typeof comp.price === "number"
              ? comp.price
              : parseFloat(comp.price) || 0,
        })),
      },
    };

    const draftState = {
      ...onboardingState,
      employeeDetails: {
        ...onboardingState.employeeDetails,
        packages: sanitizedPackages,
        paymentCycle,
        bankAccounts: bankAccounts.map((bank) => ({
          ...bank,
          accountNumber: bank.accountNumber || "",
          bankName: bank.bankName || "",
        })),
      },
    };

    try {
      localStorage.setItem("onboarding-draft", JSON.stringify(draftState));
      setPackages(sanitizedPackages);
      showToast("Draft saved successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to save draft", "error");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // ─── Final Submit - Save to API ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // ─── Validate both packages are saved ──────────────────────────────────
      const packageErrors = validateAllPackages();
      setValidationErrors(packageErrors);

      if (Object.keys(packageErrors).length > 0) {
        const errorMessages = Object.values(packageErrors);
        showToast(
          `Please configure both salary packages: ${errorMessages.join(", ")}`,
          "error",
        );
        setIsSubmitting(false);
        return;
      }

      if (bankAccounts.length === 0) {
        showToast(
          "Please add at least one Bank Account before continuing",
          "warning",
        );
        setIsSubmitting(false);
        return;
      }

      // ─── Get userId ──────────────────────────────────────────────────────────
      const userId = getUserId();
      if (!userId) {
        showToast("User ID not found. Please save employee details first.", "error");
        setIsSubmitting(false);
        return;
      }


      // ─── Prepare Salary Data ────────────────────────────────────────────────
      const salaryPayload = {
        user_id: parseInt(userId),
        payment_cycle: paymentCycle,
        packages: []
      };

      // Add package1 if saved
      if (packages.package1.isSaved && packages.package1.salaryComponents.length > 0) {
        salaryPayload.packages.push({
          name: packages.package1.name || "Package 1 - Home Country / WFH",
          is_active: true,
          currency: packages.package1.currency || "AED",
          salary_components: packages.package1.salaryComponents.map((comp) => ({
            component_name: comp.name,
            value: typeof comp.price === "number" ? comp.price : parseFloat(comp.price) || 0,
          })),
        });
      }

      // Add package2 if saved
      if (packages.package2.isSaved && packages.package2.salaryComponents.length > 0) {
        salaryPayload.packages.push({
          name: packages.package2.name || "Package 2 - Dubai Onsite",
          is_active: true,
          currency: packages.package2.currency || "AED",
          salary_components: packages.package2.salaryComponents.map((comp) => ({
            component_name: comp.name,
            value: typeof comp.price === "number" ? comp.price : parseFloat(comp.price) || 0,
          })),
        });
      }

      // ─── Save Salary to API ──────────────────────────────────────────────────
      let salaryResult;
      try {
        salaryResult = await dispatch(saveOnboardingSalary(salaryPayload)).unwrap();
        showToast("Salary packages saved successfully!", "success");
      } catch (salaryError) {
        console.error("[SalaryBankDetailsForm] Salary save error:", salaryError);
        showToast(salaryError?.message || "Failed to save salary packages", "error");
        setIsSubmitting(false);
        return;
      }

      // ─── Update packages with API response data ─────────────────────────────
      // The API returns the saved packages with their IDs and components
      if (salaryResult?.data?.packages) {
        const apiPackages = salaryResult.data.packages;
        
        // Update package1 with API response
        if (apiPackages.package1) {
          const updatedPkg1 = {
            ...packages.package1,
            packageId: apiPackages.package1.id,
            name: apiPackages.package1.name || packages.package1.name,
            currency: apiPackages.package1.currency || packages.package1.currency,
            isSaved: true,
            totalSalary: apiPackages.package1.total_monthly_salary || computePackageTotal(packages.package1.salaryComponents),
            salaryComponents: (apiPackages.package1.salary_components || []).map((comp) => ({
              id: comp.id,
              name: comp.component_name,
              price: comp.value,
            })),
          };
          setPackages((prev) => ({
            ...prev,
            package1: updatedPkg1,
          }));
          
          // Update Redux and localStorage with the API response
          saveToStorageAndRedux({
            packages: {
              ...packages,
              package1: updatedPkg1,
            },
          });
        }
        
        // Update package2 with API response
        if (apiPackages.package2) {
          const updatedPkg2 = {
            ...packages.package2,
            packageId: apiPackages.package2.id,
            name: apiPackages.package2.name || packages.package2.name,
            currency: apiPackages.package2.currency || packages.package2.currency,
            isSaved: true,
            totalSalary: apiPackages.package2.total_monthly_salary || computePackageTotal(packages.package2.salaryComponents),
            salaryComponents: (apiPackages.package2.salary_components || []).map((comp) => ({
              id: comp.id,
              name: comp.component_name,
              price: comp.value,
            })),
          };
          setPackages((prev) => ({
            ...prev,
            package2: updatedPkg2,
          }));
          
          // Update Redux and localStorage with the API response
          saveToStorageAndRedux({
            packages: {
              ...packages,
              package2: updatedPkg2,
            },
          });
        }
      }

      // ─── Prepare Bank Data ──────────────────────────────────────────────────
      const bankPayload = {
        user_id: parseInt(userId),
        bank_details: bankAccounts.map((account) => ({
          bank_country: account.bankCountry,
          bank_name: account.bankName,
          account_number: account.accountNumber,
          ifsc_code: account.bankIfsc || null,
          branch_name: account.bankBranch || null,
          iban_number: account.bankIban || null,
          swift_code: account.bankSwift || null,
        })),
      };

      // ─── Save Banks to API ───────────────────────────────────────────────────
      let bankResult;
      try {
        bankResult = await dispatch(saveOnboardingBanks(bankPayload)).unwrap();
        showToast("Bank details saved successfully!", "success");
      } catch (bankError) {
        console.error("[SalaryBankDetailsForm] Bank save error:", bankError);
        showToast(bankError?.message || "Failed to save bank details", "error");
        setIsSubmitting(false);
        return;
      }

      // ─── Update bank accounts with API response data ────────────────────────
      if (bankResult?.data?.bank_details) {
        const apiBankDetails = bankResult.data.bank_details;
        const updatedBankAccounts = apiBankDetails.map((bank, index) => ({
          id: bank.id || Date.now() + index,
          bankCountry: bank.bank_country || bankAccounts[index]?.bankCountry || "UAE",
          bankName: bank.bank_name || bankAccounts[index]?.bankName || "",
          accountNumber: bank.account_number || bankAccounts[index]?.accountNumber || "",
          bankIfsc: bank.ifsc_code || bankAccounts[index]?.bankIfsc || "",
          bankBranch: bank.branch_name || bankAccounts[index]?.bankBranch || "",
          bankIban: bank.iban_number || bankAccounts[index]?.bankIban || "",
          bankSwift: bank.swift_code || bankAccounts[index]?.bankSwift || "",
        }));
        
        setBankAccounts(updatedBankAccounts);
        
        // Update Redux and localStorage with the API response
        saveToStorageAndRedux({
          bankAccounts: updatedBankAccounts,
        });
      }

      // ─── Save payment cycle ──────────────────────────────────────────────────
      saveToStorageAndRedux({
        paymentCycle,
      });

      // ─── Move to next step (Review) ──────────────────────────────────────
      dispatch(setStep(4));
      showToast("All financial details saved successfully!", "success");

    } catch (error) {
      console.error("[SalaryBankDetailsForm] Unexpected error:", error);
      showToast("An unexpected error occurred. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    dispatch(setStep(2));
  };

  const getIconComponent = (iconName) => {
    return ICON_MAP[iconName] || FiHome;
  };

  // ─── Render Package ──────────────────────────────────────────────────────
  const renderPackage = (pkgId, pkg) => {
    const isActive = activePackage === pkgId;
    const total = computePackageTotal(pkg.salaryComponents);
    const IconComponent = getIconComponent(pkg.iconName);
    const hasError = validationErrors[pkgId];

    return (
      <div
        className={`border rounded-2xl overflow-hidden transition-all ${
          isActive
            ? "border-green-500 ring-2 ring-green-500/20"
            : hasError && !pkg.isSaved
              ? "border-red-400 ring-2 ring-red-500/20"
              : "border-gray-200 dark:border-gray-700"
        }`}
      >
        {/* Package Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-all ${
            hasError && !pkg.isSaved
              ? "bg-red-50/70 dark:bg-red-900/10 border-red-200 dark:border-red-800"
              : "bg-gray-50/70 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700"
          }`}
          onClick={() => setActivePackage(pkgId)}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                hasError && !pkg.isSaved
                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
              }`}
            >
              <IconComponent className={`w-5 h-5 ${pkg.iconClass}`} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                {pkg.name}
                {hasError && !pkg.isSaved && (
                  <span className="ml-2 text-xs text-red-500 font-normal">
                    <FiAlertCircle className="inline mr-1" />
                    Required
                  </span>
                )}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {pkg.isSaved
                  ? `✅ Saved • ${typeof pkg.currency === "string" ? pkg.currency : "AED"} ${total.toLocaleString()}`
                  : "⚠️ Not configured - Required"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pkg.isSaved && (
              <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-full">
                Active
              </span>
            )}
            {!pkg.isSaved && (
              <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 rounded-full">
                Required
              </span>
            )}
            <span className="text-gray-400">
              <FiChevronRight
                className={`transform transition-transform ${isActive ? "rotate-90" : ""}`}
              />
            </span>
          </div>
        </div>

        {/* Package Content */}
        {isActive && (
          <div className="p-5 space-y-5 bg-white dark:bg-gray-800/30">
            {!pkg.isSaved ? (
              <div className="space-y-5">
                {/* Currency Selector */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    Currency <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={
                      typeof pkg.currency === "string" ? pkg.currency : "AED"
                    }
                    onChange={(e) =>
                      handlePackageCurrencyChange(pkgId, e.target.value)
                    }
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white transition-all outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 cursor-pointer"
                  >
                    {currenciesList.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Add Component */}
                <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/50 space-y-4">
                  <h5 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Add Component
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Component name"
                        value={newComponentName}
                        onChange={(e) => setNewComponentName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-green-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        step="any"
                        placeholder={`Amount (${pkg.currency})`}
                        value={newComponentPrice}
                        onChange={(e) => setNewComponentPrice(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-green-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddSalaryComponent(pkgId)}
                      className="py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1"
                    >
                      <FiPlus size={16} />
                      Add
                    </button>
                  </div>
                </div>

                {/* Components List */}
                {pkg.salaryComponents.length > 0 ? (
                  <div className="overflow-hidden border border-gray-100 dark:border-gray-700/80 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/60 text-left">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                        <tr>
                          <th className="px-4 py-3">Component</th>
                          <th className="px-4 py-3 text-right">Value</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
                        {pkg.salaryComponents.map((comp) => (
                          <tr
                            key={comp.id}
                            className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10"
                          >
                            <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                              {comp.name}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                              {pkg.currency}{" "}
                              {comp.price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteSalaryComponent(pkgId, comp.id)
                                }
                                className="p-1 text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-green-50/30 dark:bg-green-950/10 font-bold border-t-2 border-green-200/50">
                          <td className="px-4 py-3 text-green-700 dark:text-green-400 uppercase tracking-wider">
                            Total
                          </td>
                          <td className="px-4 py-3 text-right text-green-700 dark:text-green-400">
                            {pkg.currency}{" "}
                            {total.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-4 text-xs text-gray-400 italic">
                    No components added yet. Add Basic Salary and other
                    allowances.
                  </p>
                )}

                {/* Save Button */}
                {pkg.salaryComponents.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveSalaryPackage(pkgId)}
                      className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-2 hover:scale-[1.02]"
                    >
                      <FiSave size={14} />
                      Save {pkg.name}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Saved View
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Currency
                    </p>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/30">
                      {typeof pkg.currency === "string" ? pkg.currency : "AED"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Total Monthly Salary
                    </p>
                    <p className="text-lg font-extrabold text-green-600 dark:text-green-400">
                      {typeof pkg.currency === "string" ? pkg.currency : "AED"}{" "}
                      {total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleEditPackage(pkgId)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-950/40 rounded-xl transition-all border border-green-150/40 dark:border-green-900/30 hover:scale-[1.03]"
                  >
                    <FiEdit size={14} />
                    Modify Structure
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn space-y-8 pb-10">
      {/* Page Header */}
      <div className="space-y-2">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Salary & Bank Details
        </h2>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
          Configure employee salary packages and payment information.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Salary Packages Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-100 dark:border-gray-700/80 overflow-hidden">
          <div className="px-6 md:px-8 py-5 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center">
                <FiDollarSign size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Salary Packages
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Both packages must be configured and saved
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  packages.package1.isSaved && packages.package2.isSaved
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}
              >
                {packages.package1.isSaved && packages.package2.isSaved
                  ? "✓ Both Ready"
                  : "⚠️ Both Required"}
              </span>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 rounded-xl hover:bg-green-100 dark:hover:bg-green-950/40 transition-all border border-green-100 dark:border-green-900/30 shadow-sm"
              >
                <FiSave size={16} />
                {isSavingDraft ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Package 1 */}
            {renderPackage("package1", packages.package1)}

            {/* Package 2 */}
            {renderPackage("package2", packages.package2)}
          </div>
        </div>

        {/* Bank Details Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-100 dark:border-gray-700/80 overflow-hidden">
          <div className="px-6 md:px-8 py-5 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center">
              <FiCreditCard size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Bank Details
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Add employee bank account information
              </p>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Bank Details Form */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    Bank Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bankCountry}
                    onChange={handleBankCountryChange}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white transition-all outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 cursor-pointer"
                  >
                    <option value="UAE">United Arab Emirates (UAE)</option>
                    <option value="India">India</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Emirates NBD, HDFC Bank"
                    value={bankName}
                    onChange={handleBankNameChange}
                    className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-xl text-gray-900 dark:text-white transition-all outline-none ${
                      formErrors.bankName
                        ? "border-red-500 focus:ring-4 focus:ring-red-500/10 focus:border-red-500"
                        : "border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
                    }`}
                  />
                  {formErrors.bankName && (
                    <p className="text-xs font-semibold text-red-500">
                      {formErrors.bankName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 101004561239"
                    value={bankAccountNumber}
                    onChange={handleAccountNumberChange}
                    className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-xl text-gray-900 dark:text-white transition-all outline-none ${
                      formErrors.accountNumber
                        ? "border-red-500 focus:ring-4 focus:ring-red-500/10 focus:border-red-500"
                        : "border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
                    }`}
                  />
                  {formErrors.accountNumber && (
                    <p className="text-xs font-semibold text-red-500">
                      {formErrors.accountNumber}
                    </p>
                  )}
                </div>

                {/* Payment Cycle */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    Payment Cycle <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentCycle}
                    onChange={(e) => setPaymentCycle(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white transition-all outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 cursor-pointer"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                    <option value="Quarterly">Quarterly</option>
                  </select>
                </div>

                {bankCountry === "India" ? (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        IFSC Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC0000240"
                        value={bankIfsc}
                        onChange={handleIfscChange}
                        className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-xl text-gray-900 dark:text-white transition-all outline-none font-mono tracking-wider ${
                          formErrors.ifsc
                            ? "border-red-500 focus:ring-4 focus:ring-red-500/10 focus:border-red-500"
                            : "border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
                        }`}
                      />
                      {formErrors.ifsc && (
                        <p className="text-xs font-semibold text-red-500">
                          {formErrors.ifsc}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        Branch Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bandra East, Mumbai"
                        value={bankBranch}
                        onChange={handleBranchChange}
                        className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-xl text-gray-900 dark:text-white transition-all outline-none ${
                          formErrors.branch
                            ? "border-red-500 focus:ring-4 focus:ring-red-500/10 focus:border-red-500"
                            : "border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
                        }`}
                      />
                      {formErrors.branch && (
                        <p className="text-xs font-semibold text-red-500">
                          {formErrors.branch}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        IBAN Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. AE55 0230 0000 1234 5678 901"
                        value={bankIban}
                        onChange={handleIbanChange}
                        className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-xl text-gray-900 dark:text-white transition-all outline-none font-mono tracking-wide ${
                          formErrors.iban
                            ? "border-red-500 focus:ring-4 focus:ring-red-500/10 focus:border-red-500"
                            : "border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
                        }`}
                      />
                      {formErrors.iban && (
                        <p className="text-xs font-semibold text-red-500">
                          {formErrors.iban}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        SWIFT/BIC Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. EBILAEADXXX"
                        value={bankSwift}
                        onChange={handleSwiftChange}
                        className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-xl text-gray-900 dark:text-white transition-all outline-none font-mono tracking-wider ${
                          formErrors.swift
                            ? "border-red-500 focus:ring-4 focus:ring-red-500/10 focus:border-red-500"
                            : "border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
                        }`}
                      />
                      {formErrors.swift && (
                        <p className="text-xs font-semibold text-red-500">
                          {formErrors.swift}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddBankDetails}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-2 hover:scale-[1.02]"
                >
                  <FiPlus size={14} />
                  Add Bank Account
                </button>
              </div>
            </div>

            {/* Bank Accounts List */}
            {bankAccounts.length > 0 && (
              <div className="overflow-x-auto border border-gray-150 dark:border-gray-700/80 rounded-2xl shadow-inner mt-6">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/80 text-left">
                  <thead className="bg-gray-50/70 dark:bg-gray-800/40 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-4">Country</th>
                      <th className="px-6 py-4">Bank Details</th>
                      <th className="px-6 py-4">Identifier</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-750 bg-white dark:bg-gray-800/20">
                    {bankAccounts.map((bank) => (
                      <tr
                        key={bank.id}
                        className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10 transition-colors"
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30">
                            {bank.bankCountry}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              {bank.bankName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              Account:{" "}
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {bank.accountNumber}
                              </span>
                            </p>
                            {bank.bankCountry === "India" &&
                              bank.bankBranch && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                  Branch:{" "}
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                                    {bank.bankBranch}
                                  </span>
                                </p>
                              )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {bank.bankCountry === "India" ? (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                                IFSC
                              </span>
                              <span className="font-mono text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 px-2.5 py-1 rounded border border-gray-200 dark:border-gray-800">
                                {bank.bankIfsc}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                                IBAN
                              </span>
                              <span className="font-mono text-xs font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded border border-gray-200 dark:border-gray-800 block w-fit">
                                {bank.bankIban}
                              </span>
                              {bank.bankSwift && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold block">
                                  SWIFT:{" "}
                                  <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100/50 dark:bg-gray-900/50 px-1.5 py-0.5 rounded">
                                    {bank.bankSwift}
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteBank(bank.id)}
                            className="p-2 text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-soft">
          <button
            type="button"
            onClick={handleBack}
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-bold text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white transition-all rounded-xl hover:-translate-x-1 disabled:opacity-50"
          >
            <FiChevronLeft size={20} />
            Back
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !packages.package1.isSaved || !packages.package2.isSaved || bankAccounts.length === 0}
            className={`w-full sm:w-auto px-8 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg whitespace-nowrap ${
              packages.package1.isSaved &&
              packages.package2.isSaved &&
              bankAccounts.length > 0
                ? "bg-green-500 hover:bg-green-600 text-white hover:scale-[1.02]"
                : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500 dark:text-gray-400 opacity-60"
            }`}
          >
            {isSubmitting ? (
              <>
                <FiLoader className="animate-spin" size={16} />
                Saving...
              </>
            ) : (
              <>
                Save and Continue
                <FiChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SalaryBankDetailsForm;