// locationService.js - Updated with PHP-compatible timezone mapping
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.watchPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        let errorMessage = "Location access denied";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Please allow location access to punch in";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        reject(new Error(errorMessage));
      },
      options
    );
  });
};

// Map browser timezone names to PHP-compatible timezone identifiers
const getPHPCompatibleTimezone = (browserTimezone) => {
  // Mapping of common browser timezone names to PHP-compatible ones
  const timezoneMap = {
    // India
    'Asia/Calcutta': 'Asia/Kolkata',
    'Asia/Kolkata': 'Asia/Kolkata',
    
    // United States
    'America/New_York': 'America/New_York',
    'America/Los_Angeles': 'America/Los_Angeles',
    'America/Chicago': 'America/Chicago',
    'America/Denver': 'America/Denver',
    'America/Phoenix': 'America/Phoenix',
    
    // Europe
    'Europe/London': 'Europe/London',
    'Europe/Paris': 'Europe/Paris',
    'Europe/Berlin': 'Europe/Berlin',
    'Europe/Moscow': 'Europe/Moscow',
    
    // Asia
    'Asia/Tokyo': 'Asia/Tokyo',
    'Asia/Shanghai': 'Asia/Shanghai',
    'Asia/Hong_Kong': 'Asia/Hong_Kong',
    'Asia/Singapore': 'Asia/Singapore',
    'Asia/Dubai': 'Asia/Dubai',
    
    // Australia
    'Australia/Sydney': 'Australia/Sydney',
    'Australia/Melbourne': 'Australia/Melbourne',
    'Australia/Perth': 'Australia/Perth',
    
    // Add more mappings as needed
  };
  
  return timezoneMap[browserTimezone] || browserTimezone;
};

// Get current timezone from browser with PHP compatibility
export const getCurrentTimezone = () => {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const phpTimezone = getPHPCompatibleTimezone(browserTimezone);
  
  return phpTimezone;
};

// Get timezone offset in minutes (for PHP compatibility)
export const getTimezoneOffsetMinutes = () => {
  return -new Date().getTimezoneOffset(); // Returns 330 for IST
};

// Get timezone offset in ±HH:MM format (for display)
export const getTimezoneOffsetFormatted = () => {
  const offset = new Date().getTimezoneOffset();
  const sign = offset <= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Get complete timezone info (PHP-compatible)
export const getTimezoneInfo = () => {
  return {
    timezone: getCurrentTimezone(), // Now returns PHP-compatible name (e.g., 'Asia/Kolkata')
    timezone_offset: getTimezoneOffsetFormatted(), // For display
    timezone_offset_minutes: getTimezoneOffsetMinutes(), // For backend calculations
    timestamp: new Date().toISOString()
  };
};

// Get location with timezone (combines both)
export const getLocationWithTimezone = async () => {
  try {
    const location = await getCurrentLocation();
    const timezoneInfo = getTimezoneInfo();
    
    return {
      ...location,
      ...timezoneInfo
    };
  } catch (error) {
    console.error("Error getting location:", error);
    // Return at least timezone info if location fails
    return getTimezoneInfo();
  }
};

// Reverse geocoding using OpenStreetMap
export const getAddressFromCoordinates = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Probim/1.0 (hr@yopmail.com)'
        }
      }
    );
    const data = await response.json();
    return {
      display_name: data.display_name,
      road: data.address?.road,
      city: data.address?.city || data.address?.town || data.address?.village,
      state: data.address?.state,
      country: data.address?.country,
      postcode: data.address?.postcode
    };
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
};