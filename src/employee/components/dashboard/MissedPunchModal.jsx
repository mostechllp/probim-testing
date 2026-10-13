// file: src/employee/components/modals/MissedPunchModal.jsx

import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "../../../components/common/Toast";
import apiClient from "../../../utils/apiClient";
import { fetchDashboardData } from "../../store/slices/attendanceSlice";
import { TimeInputWorking } from "../common/TimeInputForWorkingHrs";
import MapView from "../common/MapView";
import { storeLocationData, getStoredLocationData } from "../../services/locationStorage";

// Re-use the formatDateDisplay helper or import it
const formatDateDisplay = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

// Get browser timezone
const getBrowserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// The formatHoursAndMinutes function already works with minutes
const formatHoursAndMinutes = (minutes) => {
  if (!minutes || minutes <= 0) return "0h 0m";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0 && mins === 0) return "0h 0m";
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

// Replace the formatTimeDisplay function with this version that handles minutes
const formatTimeDisplay = (time) => {
  if (!time) return "0 min";
  const num = parseFloat(time);
  if (isNaN(num) || num === 0) return "0 min";
  const hours = Math.floor(num / 60);
  const minutes = num % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
  return `${hours} hr ${minutes} min`;
};

// Convert 24-hour time to 12-hour format for display
const convertTo12Hour = (time24) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

// Extract country from address
const extractCountryFromAddress = (address) => {
  if (!address) return "Unknown";
  const parts = address.split(",").map(s => s.trim());
  return parts[parts.length - 1] || "Unknown";
};

// ✅ NEW: Get timezone from coordinates using Nominatim
const getTimezoneFromCoordinates = async (latitude, longitude) => {
  try {
    // First try to get address details which includes country
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
    );
    const data = await response.json();
    
    if (data && data.address) {
      const country = data.address.country || "";
      const countryCode = data.address.country_code || "";
      
      // Map country to timezone
      const timezoneMap = {
        'United Arab Emirates': { timezone: 'Asia/Dubai', offset: 240 },
        'Saudi Arabia': { timezone: 'Asia/Riyadh', offset: 180 },
        'India': { timezone: 'Asia/Kolkata', offset: 330 },
        'United States': { timezone: 'America/New_York', offset: -300 },
        'United Kingdom': { timezone: 'Europe/London', offset: 60 },
        'Australia': { timezone: 'Australia/Sydney', offset: 660 },
        'Singapore': { timezone: 'Asia/Singapore', offset: 480 },
        'Malaysia': { timezone: 'Asia/Kuala_Lumpur', offset: 480 },
        'Philippines': { timezone: 'Asia/Manila', offset: 480 },
        'Japan': { timezone: 'Asia/Tokyo', offset: 540 },
        'South Korea': { timezone: 'Asia/Seoul', offset: 540 },
        'China': { timezone: 'Asia/Shanghai', offset: 480 },
        'Hong Kong': { timezone: 'Asia/Hong_Kong', offset: 480 },
        'Taiwan': { timezone: 'Asia/Taipei', offset: 480 },
        'Thailand': { timezone: 'Asia/Bangkok', offset: 420 },
        'Vietnam': { timezone: 'Asia/Ho_Chi_Minh', offset: 420 },
        'Indonesia': { timezone: 'Asia/Jakarta', offset: 420 },
        'Pakistan': { timezone: 'Asia/Karachi', offset: 300 },
        'Bangladesh': { timezone: 'Asia/Dhaka', offset: 360 },
        'Sri Lanka': { timezone: 'Asia/Colombo', offset: 330 },
        'Nepal': { timezone: 'Asia/Kathmandu', offset: 345 },
        'Afghanistan': { timezone: 'Asia/Kabul', offset: 270 },
        'Iraq': { timezone: 'Asia/Baghdad', offset: 180 },
        'Iran': { timezone: 'Asia/Tehran', offset: 210 },
        'Turkey': { timezone: 'Europe/Istanbul', offset: 180 },
        'Egypt': { timezone: 'Africa/Cairo', offset: 120 },
        'South Africa': { timezone: 'Africa/Johannesburg', offset: 120 },
        'Nigeria': { timezone: 'Africa/Lagos', offset: 60 },
        'Kenya': { timezone: 'Africa/Nairobi', offset: 180 },
        'Brazil': { timezone: 'America/Sao_Paulo', offset: -180 },
        'Argentina': { timezone: 'America/Buenos_Aires', offset: -180 },
        'Chile': { timezone: 'America/Santiago', offset: -240 },
        'Mexico': { timezone: 'America/Mexico_City', offset: -360 },
        'Canada': { timezone: 'America/Toronto', offset: -300 },
        'France': { timezone: 'Europe/Paris', offset: 60 },
        'Germany': { timezone: 'Europe/Berlin', offset: 60 },
        'Italy': { timezone: 'Europe/Rome', offset: 60 },
        'Spain': { timezone: 'Europe/Madrid', offset: 60 },
        'Portugal': { timezone: 'Europe/Lisbon', offset: 0 },
        'Netherlands': { timezone: 'Europe/Amsterdam', offset: 60 },
        'Belgium': { timezone: 'Europe/Brussels', offset: 60 },
        'Switzerland': { timezone: 'Europe/Zurich', offset: 60 },
        'Austria': { timezone: 'Europe/Vienna', offset: 60 },
        'Sweden': { timezone: 'Europe/Stockholm', offset: 60 },
        'Norway': { timezone: 'Europe/Oslo', offset: 60 },
        'Denmark': { timezone: 'Europe/Copenhagen', offset: 60 },
        'Finland': { timezone: 'Europe/Helsinki', offset: 120 },
        'Poland': { timezone: 'Europe/Warsaw', offset: 60 },
        'Ukraine': { timezone: 'Europe/Kyiv', offset: 120 },
        'Russia': { timezone: 'Europe/Moscow', offset: 180 },
        'New Zealand': { timezone: 'Pacific/Auckland', offset: 720 },
      };
      
      // Try exact match
      let tzInfo = timezoneMap[country];
      
      // Try partial match if exact not found
      if (!tzInfo) {
        for (const [key, value] of Object.entries(timezoneMap)) {
          if (country.includes(key) || key.includes(country)) {
            tzInfo = value;
            break;
          }
        }
      }
      
      if (tzInfo) {
        return {
          timezone: tzInfo.timezone,
          timezone_offset_minutes: tzInfo.offset,
          country: country,
        };
      }
    }
    
    // Fallback: use browser timezone
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: browserTz }));
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const offsetMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
    
    return {
      timezone: browserTz,
      timezone_offset_minutes: offsetMinutes,
      country: data?.address?.country || 'Unknown',
    };
  } catch (error) {
    console.error('Error fetching timezone from coordinates:', error);
    // Fallback to browser timezone
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: browserTz }));
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const offsetMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
    
    return {
      timezone: browserTz,
      timezone_offset_minutes: offsetMinutes,
      country: 'Unknown',
    };
  }
};

// ✅ FIXED: Format time as HH:MM:SS (no date or timezone)
const formatTimeOnly = (timeStr) => {
  if (!timeStr) return null;
  
  // If time already has seconds, return as is
  if (timeStr.split(':').length === 3) {
    return timeStr;
  }
  
  // If time has only HH:MM, add :00 seconds
  if (timeStr.split(':').length === 2) {
    return `${timeStr}:00`;
  }
  
  return timeStr;
};

const MissedPunchModal = ({ isOpen, onClose, selectedDate, onSuccess }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const dashboardData = useSelector(
    (state) => state.EmpAttendance?.dashboardData,
  );

  const [punchInTime, setPunchInTime] = useState("");
  const [punchOutTime, setPunchOutTime] = useState("");
  const [reason, setReason] = useState("");
  const [requestType] = useState("missed_punch_in");
  const [projects, setProjects] = useState([]);
  const [projectTimes, setProjectTimes] = useState({});
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timezone, setTimezone] = useState(getBrowserTimezone());
  const [timezoneOffset, setTimezoneOffset] = useState(-new Date().getTimezoneOffset());
  const [maxWorkingHours, setMaxWorkingHours] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [confirmNoProjects, setConfirmNoProjects] = useState(false);

  // Location states
  const [location, setLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [tempLocation, setTempLocation] = useState(null);
  
  // Search location states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Get employee ID for fetching projects
  const employeeId = dashboardData?.employee?.id || user?.employee?.id;

  // Calculate working hours from punch in time and punch out time
  const calculateWorkingHours = (punchIn, punchOut, date) => {
    if (!punchIn || !punchOut) {
      setMaxWorkingHours(0);
      return;
    }

    let punchInDateObj, punchOutDateObj;
    const baseDate = date ? new Date(date) : new Date();

    try {
      // Parse punch in time
      if (punchIn.includes(":")) {
        const parts = punchIn.split(":");
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        punchInDateObj = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate(),
          hours,
          minutes,
          seconds,
        );
      } else {
        punchInDateObj = new Date(punchIn);
      }

      if (isNaN(punchInDateObj.getTime())) {
        console.warn("Invalid punch in time:", punchIn);
        setMaxWorkingHours(0);
        return;
      }
    } catch (error) {
      console.error("Error parsing punch in time:", error);
      setMaxWorkingHours(0);
      return;
    }

    try {
      // Parse punch out time
      if (punchOut.includes(":")) {
        const parts = punchOut.split(":");
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        punchOutDateObj = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate(),
          hours,
          minutes,
          seconds,
        );
      } else {
        punchOutDateObj = new Date(punchOut);
      }

      if (punchOutDateObj < punchInDateObj) {
        punchOutDateObj.setDate(punchOutDateObj.getDate() + 1);
      }
    } catch (error) {
      console.error("Error parsing punch out time:", error);
      punchOutDateObj = new Date();
    }

    const diffMs = punchOutDateObj - punchInDateObj;
    const diffMinutes = diffMs / (1000 * 60);
    const maxMinutes = Math.max(0, Math.min(Math.floor(diffMinutes), 24 * 60));
    setMaxWorkingHours(maxMinutes);
  };

  // Auto-cap project times when maxWorkingHours changes or total exceeds it
  useEffect(() => {
    if (maxWorkingHours > 0 && Object.keys(projectTimes).length > 0) {
      let total = 0;
      Object.values(projectTimes).forEach((time) => {
        if (time) {
          const num = parseFloat(time);
          if (!isNaN(num)) total += num;
        }
      });
      
      if (total > maxWorkingHours) {
        let newTotal = 0;
        const cappedTimes = { ...projectTimes };
        let lastProjectId = null;
        
        for (const [id, time] of Object.entries(projectTimes)) {
          if (time && parseFloat(time) > 0) {
            lastProjectId = id;
          }
        }
        
        if (lastProjectId) {
          for (const [id, time] of Object.entries(projectTimes)) {
            if (id !== lastProjectId && time && parseFloat(time) > 0) {
              newTotal += parseFloat(time);
            }
          }
          
          const remaining = Math.max(0, maxWorkingHours - newTotal);
          cappedTimes[lastProjectId] = String(Math.round(remaining));
          setProjectTimes(cappedTimes);
        }
      }
    }
  }, [maxWorkingHours, projectTimes]);

  // Recalculate working hours when punch in/out times change
  useEffect(() => {
    if (isOpen && punchInTime && punchOutTime) {
      calculateWorkingHours(punchInTime, punchOutTime, selectedDate);
    }
  }, [punchInTime, punchOutTime, selectedDate, isOpen]);

  // Fetch employee projects when modal opens
  useEffect(() => {
    if (isOpen && employeeId) {
      fetchProjects();
      // Get stored location if available
      const storedLocation = getStoredLocationData();
      if (storedLocation) {
        setLocation(storedLocation);
        if (storedLocation.timezone) {
          setTimezone(storedLocation.timezone);
        }
        if (storedLocation.timezone_offset_minutes !== undefined) {
          setTimezoneOffset(storedLocation.timezone_offset_minutes);
        }
      } else {
        // Or get from dashboard data
        const punchLocation = dashboardData?.today_attendance?.punch_in_location;
        if (punchLocation) {
          const locationData = {
            latitude: punchLocation.latitude,
            longitude: punchLocation.longitude,
            address: punchLocation.address || "Unknown location",
            work_location: punchLocation.work_location || extractCountryFromAddress(punchLocation.address),
            timezone: punchLocation.timezone || getBrowserTimezone(),
            timezone_offset_minutes: punchLocation.timezone_offset_minutes || -new Date().getTimezoneOffset(),
          };
          setLocation(locationData);
          setTimezone(locationData.timezone);
          setTimezoneOffset(locationData.timezone_offset_minutes);
        }
      }
    }
  }, [isOpen, employeeId]);

  // ✅ FIXED: Get user's current location with timezone from address
  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser", "error");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          
          const address = data.display_name || `${latitude}, ${longitude}`;
          const country = extractCountryFromAddress(address);
          
          // ✅ Get timezone from coordinates
          const timezoneInfo = await getTimezoneFromCoordinates(latitude, longitude);
          
          const locationData = {
            latitude,
            longitude,
            address,
            work_location: country,
            timezone: timezoneInfo?.timezone || getBrowserTimezone(),
            timezone_offset_minutes: timezoneInfo?.timezone_offset_minutes || -new Date().getTimezoneOffset(),
          };
          
          setLocation(locationData);
          setTimezone(locationData.timezone);
          setTimezoneOffset(locationData.timezone_offset_minutes);
          storeLocationData(locationData);
          showToast("Location fetched successfully", "success");
        } catch (error) {
          console.error("Error getting address:", error);
          // Fallback: use coordinates only
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: `${position.coords.latitude}, ${position.coords.longitude}`,
            work_location: "Unknown",
            timezone: getBrowserTimezone(),
            timezone_offset_minutes: -new Date().getTimezoneOffset(),
          };
          setLocation(locationData);
          setTimezone(locationData.timezone);
          setTimezoneOffset(locationData.timezone_offset_minutes);
          storeLocationData(locationData);
        }
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        showToast("Unable to get location. Please check your permissions.", "error");
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Search for locations using Nominatim
  const searchLocation = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      
      const results = data.map((item) => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        display_name: item.display_name,
        address: item.display_name,
        class: item.class,
        type: item.type,
      }));
      
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } catch (error) {
      console.error("Error searching location:", error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debounce
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(query);
    }, 500);
  };

  // ✅ FIXED: Select a location from search results with timezone
  const selectSearchResult = async (result) => {
    const country = extractCountryFromAddress(result.address);
    
    // Get timezone from coordinates
    const timezoneInfo = await getTimezoneFromCoordinates(result.lat, result.lon);
    
    const locationData = {
      latitude: result.lat,
      longitude: result.lon,
      address: result.address,
      work_location: country,
      timezone: timezoneInfo?.timezone || getBrowserTimezone(),
      timezone_offset_minutes: timezoneInfo?.timezone_offset_minutes || -new Date().getTimezoneOffset(),
    };
    
    setTempLocation(locationData);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    showToast("Location selected from search", "success");
  };

  // Open location picker for editing
  const openLocationPicker = () => {
    setTempLocation(location ? { ...location } : null);
    setEditingLocation(true);
    setShowLocationPicker(true);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // ✅ FIXED: Save location from picker
  const saveLocation = () => {
    if (tempLocation) {
      setLocation(tempLocation);
      setTimezone(tempLocation.timezone || getBrowserTimezone());
      setTimezoneOffset(tempLocation.timezone_offset_minutes || -new Date().getTimezoneOffset());
      storeLocationData(tempLocation);
      showToast("Location updated successfully", "success");
    }
    setShowLocationPicker(false);
    setEditingLocation(false);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Cancel location editing
  const cancelLocationEdit = () => {
    setShowLocationPicker(false);
    setEditingLocation(false);
    setTempLocation(null);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  // Update location on map click or drag
  const handleMapClick = async (lat, lng) => {
    if (tempLocation) {
      // Get timezone for new coordinates
      const timezoneInfo = await getTimezoneFromCoordinates(lat, lng);
      setTempLocation({
        ...tempLocation,
        latitude: lat,
        longitude: lng,
        timezone: timezoneInfo?.timezone || tempLocation.timezone || getBrowserTimezone(),
        timezone_offset_minutes: timezoneInfo?.timezone_offset_minutes || tempLocation.timezone_offset_minutes || -new Date().getTimezoneOffset(),
      });
    }
  };

  // Fetch projects
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await apiClient.get(
        `/employee/project-assignments/${employeeId}`,
      );

      let projectsData = [];
      if (
        response.data?.data?.projects &&
        Array.isArray(response.data.data.projects)
      ) {
        projectsData = response.data.data.projects;
      } else if (
        response.data?.projects &&
        Array.isArray(response.data.projects)
      ) {
        projectsData = response.data.projects;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        projectsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        projectsData = response.data;
      }
      setProjects(projectsData);
    } catch (error) {
      console.error("Error fetching projects:", error);
      showToast("Failed to load projects", "error");
    } finally {
      setLoadingProjects(false);
    }
  };

  // Calculate total hours whenever project times change
  useEffect(() => {
    let total = 0;
    Object.values(projectTimes).forEach((time) => {
      if (time) {
        const num = parseFloat(time);
        if (!isNaN(num)) total += num;
      }
    });
    const roundedTotal = Math.round(total * 100) / 100;
    setTotalHours(roundedTotal);
  }, [projectTimes]);

  // Set default times when modal opens
  useEffect(() => {
    if (isOpen) {
      setPunchInTime("09:00");
      setPunchOutTime("18:00");
      setProjectTimes({});
      setConfirmNoProjects(false);
      setTotalHours(0);
      setMaxWorkingHours(0);
    }
  }, [isOpen]);

  const handleClose = () => {
    setPunchInTime("");
    setPunchOutTime("");
    setReason("");
    setProjectTimes({});
    setProjects([]);
    setConfirmNoProjects(false);
    setTotalHours(0);
    setMaxWorkingHours(0);
    setShowLocationPicker(false);
    setEditingLocation(false);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    onClose();
  };

  const handleTimeChange = (projectId, time) => {
    if (time === "" || time === null || time === undefined) {
      setProjectTimes((prev) => ({ ...prev, [projectId]: "" }));
      return;
    }
    
    const num = parseFloat(time);
    if (!isNaN(num) && num >= 0) {
      let cappedValue = num;
      if (maxWorkingHours > 0 && num > maxWorkingHours) {
        cappedValue = maxWorkingHours;
        showToast(
          `Value capped to ${formatHoursAndMinutes(maxWorkingHours)} (maximum working hours)`,
          "warning",
          "Auto-capped"
        );
      }
      setProjectTimes((prev) => ({ ...prev, [projectId]: String(Math.round(cappedValue)) }));
    } else if (time === "" || time === "." || time === "0") {
      setProjectTimes((prev) => ({ ...prev, [projectId]: time }));
    }
  };

  const isAtLeastOneProjectFilled = () => {
    if (projects.length === 0) {
      return confirmNoProjects;
    }
    return projects.some((project) => {
      const time = projectTimes[project.id];
      return time && time.trim() !== "" && parseFloat(time) > 0;
    });
  };

  // ✅ FIXED: Handle submit with time only format (HH:MM:SS)
  const handleSubmit = async () => {
    // Validate required fields
    if (!selectedDate) {
      showToast("Please select a date", "error", "Validation Error");
      return;
    }

    if (!punchInTime) {
      showToast("Please enter punch-in time", "error", "Validation Error");
      return;
    }

    if (!punchOutTime) {
      showToast("Please enter punch-out time", "error", "Validation Error");
      return;
    }

    if (!reason || reason.trim().length < 5) {
      showToast(
        "Please provide a valid reason (minimum 5 characters)",
        "error",
        "Validation Error",
      );
      return;
    }

    // Validate location
    if (!location || !location.latitude || !location.longitude) {
      showToast(
        "Please provide your location",
        "error",
        "Location Required",
      );
      return;
    }

    if (projects.length > 0) {
      const atLeastOneFilled = projects.some((project) => {
        const time = projectTimes[project.id];
        return time && time.trim() !== "" && parseFloat(time) > 0;
      });

      if (!atLeastOneFilled) {
        showToast(
          "Please enter hours for at least one project",
          "error",
          "Validation Error",
        );
        return;
      }

      if (totalHours === 0) {
        showToast("Total hours cannot be zero", "error", "Validation Error");
        return;
      }

      if (maxWorkingHours > 0 && totalHours > maxWorkingHours) {
        showToast(
          `Total hours (${formatHoursAndMinutes(totalHours)}) exceeds working hours (${formatHoursAndMinutes(maxWorkingHours)})`,
          "error",
          "Validation Error",
        );
        return;
      }
    } else {
      if (!confirmNoProjects) {
        showToast(
          "Please confirm you want to submit without projects",
          "error",
          "Validation Error",
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // ✅ Get the correct timezone from location
      const tz = location.timezone || getBrowserTimezone();
      const tzOffset = location.timezone_offset_minutes !== undefined 
        ? location.timezone_offset_minutes 
        : -new Date().getTimezoneOffset();

      // ✅ Format time as HH:MM:SS only (no date, no timezone)
      const punchInTimeFormatted = formatTimeOnly(punchInTime);
      const punchOutTimeFormatted = formatTimeOnly(punchOutTime);

      console.log("📤 Submitting with timezone:", tz);
      console.log("📤 Timezone offset:", tzOffset);
      console.log("📤 Punch In Time:", punchInTimeFormatted);
      console.log("📤 Punch Out Time:", punchOutTimeFormatted);

      const payload = {
        type: requestType,
        request_date: selectedDate,
        reason: reason.trim(),
        timezone: tz,
        punch_in_time: punchInTimeFormatted, // ✅ Only time: HH:MM:SS
        punch_out_time: punchOutTimeFormatted, // ✅ Only time: HH:MM:SS
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          work_location: location.work_location || extractCountryFromAddress(location.address),
          timezone: tz,
          timezone_offset_minutes: tzOffset,
        },
      };

      if (projects.length > 0 && Object.keys(projectTimes).length > 0) {
        const projectTimeEntries = Object.entries(projectTimes)
          .filter(([_, time]) => time && parseFloat(time) > 0)
          .map(([projectId, time]) => ({
            project_id: parseInt(projectId),
            time_minutes: Math.round(parseFloat(time)),
          }));

        if (projectTimeEntries.length > 0) {
          payload.project_times = projectTimeEntries;
        }
      }

      await apiClient.post("/employee/missed-punch", payload);

      showToast(
        `Missed punch request sent successfully for ${formatDateDisplay(selectedDate)}`,
        "success",
        "Request Sent",
      );

      handleClose();
      await dispatch(fetchDashboardData()).unwrap();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      let errorMessage = "Failed to submit request";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      if (error?.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0]?.[0];
        if (firstError) {
          errorMessage = firstError;
        }
      }

      showToast(errorMessage, "error", "Request Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isSubmitDisabled = () => {
    if (isSubmitting) return true;
    if (!punchInTime || !punchOutTime) return true;
    if (!reason || reason.trim().length < 5) return true;
    if (!location || !location.latitude || !location.longitude) return true;

    if (projects.length > 0) {
      const atLeastOneFilled = projects.some((project) => {
        const time = projectTimes[project.id];
        return time && time.trim() !== "" && parseFloat(time) > 0;
      });
      if (!atLeastOneFilled) return true;
      if (totalHours === 0) return true;
      if (maxWorkingHours > 0 && totalHours > maxWorkingHours) return true;
    } else {
      if (!confirmNoProjects) return true;
    }

    return false;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-[var(--surface)] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-slide-up">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-[var(--surface)] z-10 pb-2 border-b border-[var(--border)]">
          <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <i className="fas fa-clock text-orange-500"></i>
            Missed Punch Request
          </h3>
          <button
            onClick={handleClose}
            className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="space-y-4 mt-4">
          {/* Request Type - Disabled and prefilled */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Request Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value="Missed Punch In"
              disabled
              className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm cursor-not-allowed opacity-75"
            />
            <input type="hidden" value={requestType} />
          </div>

          {/* Date - Disabled */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              disabled
              className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm cursor-not-allowed opacity-75"
            />
          </div>

          {/* Punch In Time - Required */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Punch In Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={punchInTime}
              onChange={(e) => setPunchInTime(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              step="60"
              required
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              Timezone: {timezone} (UTC{timezoneOffset >= 0 ? '+' : ''}{Math.floor(timezoneOffset / 60)}:{String(Math.abs(timezoneOffset) % 60).padStart(2, '0')})
            </p>
          </div>

          {/* Punch Out Time - Required */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Punch Out Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={punchOutTime}
              onChange={(e) => setPunchOutTime(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              step="60"
              required
            />
          </div>

          {/* Location Section */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              <i className="fas fa-map-marker-alt text-green-500 mr-1"></i>
              Location <span className="text-red-500">*</span>
            </label>
            
            {!location ? (
              <button
                onClick={getCurrentLocation}
                disabled={isLoadingLocation}
                className="w-full py-3 px-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2"
              >
                {isLoadingLocation ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Getting location...
                  </>
                ) : (
                  <>
                    <i className="fas fa-location-dot"></i>
                    Get Current Location
                  </>
                )}
              </button>
            ) : (
              <div className="bg-[var(--surface2)] rounded-lg p-3 border border-[var(--border)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text)] font-medium truncate">
                      {location.address || "Unknown location"}
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      <span className="font-medium">Country:</span> {location.work_location || extractCountryFromAddress(location.address)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      <span className="font-medium">Coordinates:</span> {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      <span className="font-medium">Timezone:</span> {location.timezone || getBrowserTimezone()} (UTC{location.timezone_offset_minutes >= 0 ? '+' : ''}{Math.floor((location.timezone_offset_minutes || 0) / 60)}:{String(Math.abs(location.timezone_offset_minutes || 0) % 60).padStart(2, '0')})
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={openLocationPicker}
                      className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition-colors"
                    >
                      <i className="fas fa-edit mr-1"></i>
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setLocation(null);
                        storeLocationData(null);
                      }}
                      className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs hover:bg-red-500/20 transition-colors"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Working Hours Summary */}
          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-semibold text-[var(--text)]">
                  Punch In Time:
                </span>
                <span className="ml-2 text-sm text-[var(--text)]">
                  {punchInTime ? convertTo12Hour(punchInTime) : "—"}
                </span>
              </div>
              <div>
                <span className="text-sm font-semibold text-[var(--text)]">
                  Punch Out Time:
                </span>
                <span className="ml-2 text-sm text-[var(--text)]">
                  {punchOutTime ? convertTo12Hour(punchOutTime) : "—"}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-500/20">
              <div>
                <span className="text-sm font-semibold text-[var(--text)]">
                  Total Working Hours:
                </span>
                <span className="ml-2 text-lg font-bold text-blue-500">
                  {maxWorkingHours > 0
                    ? formatHoursAndMinutes(maxWorkingHours)
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-sm font-semibold text-[var(--text)]">
                  Allocated:
                </span>
                <span
                  className={`ml-2 text-lg font-bold ${
                    totalHours > maxWorkingHours && maxWorkingHours > 0
                      ? "text-red-500"
                      : totalHours === 0
                        ? "text-gray-400"
                        : "text-green-500"
                  }`}
                >
                  {formatHoursAndMinutes(totalHours)}
                </span>
              </div>
            </div>

            {maxWorkingHours > 0 && totalHours > 0 && (
              <div className="mt-2">
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      totalHours > maxWorkingHours
                        ? "bg-red-500"
                        : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min((totalHours / maxWorkingHours) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
                <div className="text-xs text-[var(--muted)] mt-1">
                  {totalHours > maxWorkingHours
                    ? `⚠️ Over by ${formatHoursAndMinutes(totalHours - maxWorkingHours)}`
                    : `${formatHoursAndMinutes(maxWorkingHours - totalHours)} remaining`}
                </div>
              </div>
            )}
          </div>

          {/* Project Times - Required */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--text)]">
                Project Times <span className="text-red-500">*</span>
                <span className="text-xs text-[var(--muted)] ml-2 font-normal">
                  (At least one project required)
                </span>
              </label>
            </div>

            {loadingProjects ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
                <div className="text-sm text-[var(--muted)]">
                  Loading your projects...
                </div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-6 bg-[var(--surface2)] rounded-xl">
                <div className="text-sm text-[var(--muted)]">
                  No projects assigned to you
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <input
                    type="checkbox"
                    id="confirmNoProjects"
                    checked={confirmNoProjects}
                    onChange={(e) => setConfirmNoProjects(e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded border-[var(--border)] focus:ring-orange-500"
                  />
                  <label
                    htmlFor="confirmNoProjects"
                    className="text-sm text-[var(--text)]"
                  >
                    I confirm I want to submit without projects
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                {projects.map((project) => {
                  const timeValue = projectTimes[project.id] || "";
                  const isFilled = timeValue && parseFloat(timeValue) > 0;

                  return (
                    <div
                      key={project.id}
                      className={`flex items-center justify-between bg-[var(--surface2)] p-3 rounded-lg border transition-all ${
                        isFilled
                          ? "border-orange-500/30"
                          : "border-gray-300/30 dark:border-gray-600/30"
                      } hover:border-orange-500/50`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-[var(--text)] truncate block">
                          {project.name}
                        </span>
                        {project.description && (
                          <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-36">
                          <TimeInputWorking
                            value={timeValue}
                            onChange={(e) =>
                              handleTimeChange(project.id, e.target.value)
                            }
                            maxHours={maxWorkingHours}
                            className="text-sm"
                          />
                        </div>
                        <span className="text-xs text-[var(--muted)] w-20 text-right">
                          {formatTimeDisplay(timeValue)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Validation Messages */}
          {projects.length > 0 && (
            <div className="mt-2 space-y-2">
              {!isAtLeastOneProjectFilled() && (
                <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20 flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle text-yellow-500"></i>
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">
                    Please enter hours for at least one project.
                  </span>
                </div>
              )}
              {totalHours === 0 && isAtLeastOneProjectFilled() && (
                <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20 flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle text-yellow-500"></i>
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">
                    Total hours cannot be zero.
                  </span>
                </div>
              )}
              {maxWorkingHours > 0 && totalHours > maxWorkingHours && (
                <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20 flex items-center gap-2">
                  <i className="fas fa-exclamation-circle text-red-500"></i>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    Total hours ({formatHoursAndMinutes(totalHours)}) exceeds
                    working hours ({formatHoursAndMinutes(maxWorkingHours)})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Reason - Required */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a valid reason for this request (minimum 5 characters)..."
              rows="3"
              className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              <i className="fas fa-info-circle mr-1"></i>
              Minimum 5 characters required
            </p>
          </div>

          {/* Timezone (hidden) */}
          <input type="hidden" value={timezone} />

          {/* Buttons */}
          <div className="flex gap-3 pt-2 border-t border-[var(--border)] mt-4">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] font-medium text-sm hover:bg-[var(--surface3)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled()}
              className="flex-1 py-2.5 px-4 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Send Request
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Location Picker Modal with Search */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="bg-[var(--surface)] rounded-xl max-w-2xl w-full max-h-[90vh] shadow-2xl animate-slide-up flex flex-col">
            {/* Header - Fixed */}
            <div className="flex justify-between items-center p-4 border-b border-[var(--border)] flex-shrink-0">
              <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                <i className="fas fa-map-marked-alt text-blue-500"></i>
                Edit Location
              </h3>
              <button
                onClick={cancelLocationEdit}
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* Search Location */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  <i className="fas fa-search text-blue-500 mr-1"></i>
                  Search Location
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search for a city, address, or place..."
                    className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10"
                  />
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"></i>
                  {isSearching && (
                    <i className="fas fa-spinner fa-spin absolute right-3 top-1/2 -translate-y-1/2 text-blue-500"></i>
                  )}
                  
                  {/* Search Results Dropdown */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          onClick={() => selectSearchResult(result)}
                          className="w-full text-left px-3 py-2 hover:bg-[var(--surface2)] transition-colors border-b border-[var(--border)] last:border-b-0"
                        >
                          <div className="text-sm text-[var(--text)]">
                            {result.display_name}
                          </div>
                          <div className="text-xs text-[var(--muted)]">
                            {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {showSearchResults && searchResults.length === 0 && searchQuery.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg p-3 text-center">
                      <span className="text-sm text-[var(--muted)]">No locations found</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Map */}
              <div className="h-[280px] rounded-xl overflow-hidden border border-[var(--border)] mb-4">
                <MapView
                  latitude={tempLocation?.latitude || 25.2048}
                  longitude={tempLocation?.longitude || 55.2708}
                  address={tempLocation?.address}
                  onMapClick={handleMapClick}
                  interactive={true}
                />
              </div>

              {/* Location Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={tempLocation?.address || ""}
                    onChange={(e) => setTempLocation({
                      ...tempLocation,
                      address: e.target.value,
                      work_location: extractCountryFromAddress(e.target.value),
                    })}
                    className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={tempLocation?.latitude || ""}
                      onChange={(e) => setTempLocation({
                        ...tempLocation,
                        latitude: parseFloat(e.target.value),
                      })}
                      className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.000000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={tempLocation?.longitude || ""}
                      onChange={(e) => setTempLocation({
                        ...tempLocation,
                        longitude: parseFloat(e.target.value),
                      })}
                      className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.000000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
                    Work Location (Country)
                  </label>
                  <input
                    type="text"
                    value={tempLocation?.work_location || extractCountryFromAddress(tempLocation?.address) || ""}
                    onChange={(e) => setTempLocation({
                      ...tempLocation,
                      work_location: e.target.value,
                    })}
                    className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Country name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={tempLocation?.timezone || getBrowserTimezone()}
                    onChange={(e) => setTempLocation({
                      ...tempLocation,
                      timezone: e.target.value,
                    })}
                    className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Timezone (e.g., Asia/Kolkata)"
                  />
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Offset: UTC{tempLocation?.timezone_offset_minutes >= 0 ? '+' : ''}
                    {Math.floor((tempLocation?.timezone_offset_minutes || 0) / 60)}:
                    {String(Math.abs(tempLocation?.timezone_offset_minutes || 0) % 60).padStart(2, '0')}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex gap-3 p-4 border-t border-[var(--border)] flex-shrink-0">
              <button
                onClick={cancelLocationEdit}
                className="flex-1 py-2.5 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] font-medium text-sm hover:bg-[var(--surface3)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveLocation}
                className="flex-1 py-2.5 px-4 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 transition-colors"
              >
                <i className="fas fa-save mr-2"></i>
                Save Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissedPunchModal;