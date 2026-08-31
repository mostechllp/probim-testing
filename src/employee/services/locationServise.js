// locationService.js - Fetches timezone based on country from address

// Get current location from browser
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
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

// locationService.js - Updated getAddressFromCoordinates with better error handling

// Reverse geocoding using OpenStreetMap to get address with country
export const getAddressFromCoordinates = async (latitude, longitude) => {
  if (!latitude || !longitude) {
    return null;
  }

  try {
    // ✅ Try with better parameters and proper headers
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=en&namedetails=1`,
      {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Probim/1.0 (support@probim.com)'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.display_name) {
      // ✅ Build a more readable address
      const addressParts = [];
      const addr = data.address || {};
      
      // Add components in order of specificity
      if (addr.road) addressParts.push(addr.road);
      if (addr.neighbourhood) addressParts.push(addr.neighbourhood);
      if (addr.suburb) addressParts.push(addr.suburb);
      if (addr.city || addr.town || addr.village) {
        addressParts.push(addr.city || addr.town || addr.village);
      }
      if (addr.state) addressParts.push(addr.state);
      if (addr.country) addressParts.push(addr.country);
      
      // If no specific components, use display_name
      const readableAddress = addressParts.length > 0 
        ? addressParts.join(', ') 
        : data.display_name;
      
      console.log('✅ Address fetched successfully:', readableAddress);
      
      return {
        display_name: readableAddress,
        road: addr.road,
        city: addr.city || addr.town || addr.village,
        state: addr.state,
        country: addr.country,
        country_code: addr.country_code,
        postcode: addr.postcode,
        address: addr,
        readable_address: readableAddress
      };
    }
    
    console.warn('⚠️ No address data returned from Nominatim');
    return null;
  } catch (error) {
    console.error('❌ Reverse geocoding error:', error);
    return null;
  }
};

// Import timezone mapping
import { timezoneCountryMap, getCountryFromTimezone as getCountryFromTz } from '../utils/timezoneCountryMap';

// Get timezone based on country name using the mapping
export const getTimezoneFromCountry = (countryName) => {
  if (!countryName) return null;
  
  // Create reverse mapping from timezoneCountryMap
  const countryToTimezoneMap = {};
  for (const [timezone, countries] of Object.entries(timezoneCountryMap)) {
    const countryList = Array.isArray(countries) ? countries : [countries];
    for (const c of countryList) {
      countryToTimezoneMap[c.toLowerCase()] = timezone;
    }
  }
  
  // Try exact match
  const normalizedCountry = countryName.toLowerCase().trim();
  if (countryToTimezoneMap[normalizedCountry]) {
    return countryToTimezoneMap[normalizedCountry];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(countryToTimezoneMap)) {
    if (key.includes(normalizedCountry) || normalizedCountry.includes(key)) {
      return value;
    }
  }
  
  // Special cases for common variations
  const specialCases = {
    'uae': 'Asia/Dubai',
    'united arab emirates': 'Asia/Dubai',
    'dubai': 'Asia/Dubai',
    'saudi': 'Asia/Riyadh',
    'ksa': 'Asia/Riyadh',
    'usa': 'America/New_York',
    'us': 'America/New_York',
    'uk': 'Europe/London',
    'gb': 'Europe/London',
  };
  
  if (specialCases[normalizedCountry]) {
    return specialCases[normalizedCountry];
  }
  
  return null;
};

// Get timezone offset for a specific timezone (in minutes)
export const getTimezoneOffsetForTz = (timezone) => {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    if (offsetPart) {
      const match = offsetPart.value.match(/([+-])(\d{1,2}):?(\d{2})?/); // ✅ 1-2 digits
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        const hours = parseInt(match[2]) || 0;
        const mins = parseInt(match[3]) || 0;
        return sign * (hours * 60 + mins);
      }
    }
    return -new Date().getTimezoneOffset();
  } catch {
    return -new Date().getTimezoneOffset();
  }
};

// Get timezone offset string (for display)
export const getTimezoneOffsetString = (timezone) => {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    return offsetPart?.value || 'Unknown';
  } catch {
    return 'Unknown';
  }
};

// IP-based timezone fallback (if country lookup fails)
export const getTimezoneFromIP = async () => {
  try {
    // Try ip-api.com first
    const response = await fetch('https://ip-api.com/json/');
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success' && data.timezone) {
        return {
          timezone: data.timezone,
          country: data.country,
          country_code: data.countryCode,
          city: data.city,
        };
      }
    }
    
    // Try ipapi.co as backup
    const ipResponse = await fetch('https://ipapi.co/json/');
    if (ipResponse.ok) {
      const data = await ipResponse.json();
      if (data.timezone) {
        return {
          timezone: data.timezone,
          country: data.country_name,
          country_code: data.country_code,
          city: data.city,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn('IP-based timezone failed:', error);
    return null;
  }
};

// locationService.js - Update the getLocationWithTimezone function

export const getLocationWithTimezone = async () => {
  try {
    const location = await getCurrentLocation();
    
    if (!location.latitude || !location.longitude) {
      throw new Error('No coordinates available');
    }
    
    const addressData = await getAddressFromCoordinates(
      location.latitude,
      location.longitude
    );
    
    console.log('📍 Address data received:', addressData);
    
    const countryName = addressData?.country || addressData?.address?.country;
    
    let timezone = null;
    let timezoneSource = 'unknown';
    let finalCountry = countryName || 'Unknown';
    
    if (countryName) {
      timezone = getTimezoneFromCountry(countryName);
      if (timezone) {
        timezoneSource = 'country-address';
        console.log(`✅ Timezone from country "${countryName}": ${timezone}`);
      }
    }
    
    if (!timezone) {
      console.warn('Country lookup failed, trying IP-based timezone...');
      const ipData = await getTimezoneFromIP();
      if (ipData && ipData.timezone) {
        timezone = ipData.timezone;
        timezoneSource = 'ip-api';
        finalCountry = ipData.country || finalCountry;
        console.log(`✅ Timezone from IP: ${timezone}`);
      }
    }
    
    if (!timezone) {
      console.warn('All lookups failed, using browser timezone as fallback');
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      timezoneSource = 'browser-fallback';
      const countryFromTz = getCountryFromTz(timezone);
      finalCountry = countryFromTz || finalCountry;
    }
    
    const tzOffset = getTimezoneOffsetForTz(timezone);
    const tzOffsetString = getTimezoneOffsetString(timezone);
    
    // ✅ Get the readable address - PRIORITIZE readable_address from addressData
    let displayAddress;
    
    // First, try to get the readable address from addressData
    if (addressData?.readable_address) {
      displayAddress = addressData.readable_address;
    } else if (addressData?.display_name) {
      displayAddress = addressData.display_name;
    } else if (addressData?.address) {
      // Build address from address components
      const addr = addressData.address;
      const parts = [];
      if (addr.road) parts.push(addr.road);
      if (addr.city || addr.town || addr.village) {
        parts.push(addr.city || addr.town || addr.village);
      }
      if (addr.state) parts.push(addr.state);
      if (addr.country) parts.push(addr.country);
      displayAddress = parts.length > 0 ? parts.join(', ') : null;
    }
    
    // Final fallback - use coordinates
    if (!displayAddress) {
      displayAddress = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    }
    
    console.log('📍 Final address to use:', displayAddress);
    
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: new Date().toISOString(),
      timezone: timezone,
      timezone_offset: tzOffset,
      timezone_offset_minutes: tzOffset,
      timezone_offset_string: tzOffsetString,
      country: finalCountry,
      country_code: addressData?.country_code || addressData?.address?.country_code,
      city: addressData?.city || addressData?.address?.city || addressData?.address?.town,
      address: displayAddress, // ✅ This is the readable address
      address_details: addressData,
      source: timezoneSource,
    };
    
  } catch (error) {
    console.error('Error getting location with timezone:', error);
    
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzOffset = getTimezoneOffsetForTz(browserTz);
    const countryFromTz = getCountryFromTz(browserTz);
    
    return {
      timezone: browserTz,
      timezone_offset: tzOffset,
      timezone_offset_minutes: tzOffset,
      country: countryFromTz || 'Unknown',
      address: 'Location not available',
      source: 'browser-fallback',
    };
  }
};
// Legacy exports for backward compatibility
export const getCurrentTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const getTimezoneOffsetMinutes = () => {
  return -new Date().getTimezoneOffset();
};

export const getTimezoneOffsetFormatted = () => {
  const offset = new Date().getTimezoneOffset();
  const sign = offset <= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const getTimezoneInfo = () => {
  const timezone = getCurrentTimezone();
  return {
    timezone: timezone,
    timezone_offset: getTimezoneOffsetFormatted(),
    timezone_offset_minutes: getTimezoneOffsetMinutes(),
    timestamp: new Date().toISOString()
  };
};