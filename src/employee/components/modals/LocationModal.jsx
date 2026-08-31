// LocationModal.jsx - FIXED VERSION WITH USER TIMEZONE SUPPORT
import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
  getLocationWithTimezone,
  getAddressFromCoordinates,
} from "../../services/locationServise";
import { getCountryFromTimezone } from "../../utils/timezoneCountryMap";

// Simple Map Component using Leaflet (or you can use Google Maps)
import MapPicker from "./MapPicker";

import { storeLocationData } from "../../services/locationStorage";

const LocationModal = ({ isOpen, onClose, onConfirm, type = "punch-in" }) => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [country, setCountry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countrySource, setCountrySource] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Manual edit fields
  const [manualAddress, setManualAddress] = useState("");
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [manualCountry, setManualCountry] = useState("");
  const [manualTimezone, setManualTimezone] = useState("");

  // Get user from Redux
  const { user } = useSelector((state) => state.auth);

  // Get current timezone from browser (fallback only)
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (isOpen) {
      fetchLocation();
    }
  }, [isOpen]);

  // Helper to get timezone offset for a specific timezone
  const getTimezoneOffsetMinutes = (timezone) => {
    try {
      const date = new Date();
      const formatter = new Intl.DateTimeFormat("en", {
        timeZone: timezone,
        timeZoneName: "short",
      });
      const parts = formatter.formatToParts(date);
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      if (tzPart) {
        const match = tzPart.value.match(/([+-])(\d{1,2}):?(\d{2})?/);
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

  // Helper to get timezone offset string
  const getTimezoneOffset = (timezone) => {
    try {
      const date = new Date();
      const formatter = new Intl.DateTimeFormat("en", {
        timeZone: timezone,
        timeZoneName: "longOffset",
      });
      const parts = formatter.formatToParts(date);
      const offsetPart = parts.find((p) => p.type === "timeZoneName");
      return offsetPart?.value || "Unknown";
    } catch {
      return "Unknown";
    }
  };

  const fetchLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get location with timezone (this now fetches timezone from country)
      const locationData = await getLocationWithTimezone();
      setLocation(locationData);

      // Use the timezone from locationData (which came from country/address)
      // Only fallback to user profile or browser if needed
      const userTimezone = user?.timezone;
      const detectedTimezone = locationData.timezone || browserTimezone;
      
      // Determine the correct timezone to use
      let finalTimezone = detectedTimezone;
      
      // If user has a timezone in their profile and it's different,
      // use the detected one (from country) as it's more accurate
      if (userTimezone && userTimezone !== detectedTimezone) {
        console.log(`🔄 Detected timezone: ${detectedTimezone}, User profile: ${userTimezone}`);
        // Prefer the detected timezone from country
        finalTimezone = detectedTimezone;
        // Override locationData with detected timezone
        locationData.timezone = detectedTimezone;
        locationData.timezone_offset_minutes = getTimezoneOffsetMinutes(detectedTimezone);
        locationData.timezone_offset = getTimezoneOffset(detectedTimezone);
      } else if (detectedTimezone) {
        finalTimezone = detectedTimezone;
      }

      // Populate manual fields with detected data
      setManualLatitude(locationData.latitude?.toString() || "");
      setManualLongitude(locationData.longitude?.toString() || "");
      setManualTimezone(finalTimezone || browserTimezone);

      // Get country from location data
      const countryFromData = locationData.country;
      const countryFromTimezone = getCountryFromTimezone(finalTimezone || browserTimezone);
      
      // Use country from address (most accurate)
      let finalCountry = countryFromData || countryFromTimezone || "Unknown";
      let source = locationData.source || "address";

      setCountry(finalCountry);
      setCountrySource(source);
      setManualCountry(finalCountry);
      
      // Log the final timezone being used
      console.log(`✅ Final timezone: ${finalTimezone} (source: ${source})`);
      console.log(`✅ Final country: ${finalCountry}`);
      
    } catch (err) {
      console.error("❌ Location fetch error:", err);
      setError(err.message || "Failed to get location");

      // Fallback: try to get timezone
      try {
        // Use user's timezone first, then browser
        const fallbackTimezone = user?.timezone || browserTimezone;
        const fallbackCountry = getCountryFromTimezone(fallbackTimezone);
        if (fallbackCountry && fallbackCountry !== "Unknown") {
          setCountry(fallbackCountry);
          setCountrySource("timezone-fallback");
          setManualCountry(fallbackCountry);
          setManualTimezone(fallbackTimezone);
        }
      } catch (tzError) {
        console.warn("Could not get timezone for fallback:", tzError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle map location selection
  const handleMapLocationSelect = (selectedLocation) => {
    setManualLatitude(selectedLocation.lat.toString());
    setManualLongitude(selectedLocation.lng.toString());
    setManualAddress(selectedLocation.address || "");
    setManualCountry(selectedLocation.country || manualCountry);
    setManualTimezone(
      selectedLocation.timezone || manualTimezone || browserTimezone,
    );

    // Update the location object with selected coordinates
    setLocation({
      ...location,
      latitude: parseFloat(selectedLocation.lat),
      longitude: parseFloat(selectedLocation.lng),
      timezone: selectedLocation.timezone || location?.timezone || browserTimezone,
    });

    // Update address
    setAddress({
      ...address,
      display_name: selectedLocation.address || address?.display_name || "",
    });

    // Update country
    if (selectedLocation.country) {
      setCountry(selectedLocation.country);
    }

    setShowMapPicker(false);
    setIsEditing(true);

    // Auto-fill the address field
    if (selectedLocation.address) {
      setManualAddress(selectedLocation.address);
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (!isEditing) {
      // Entering edit mode - populate fields with current data
      setManualAddress(address?.display_name || manualAddress || "");
      setManualLatitude(location?.latitude?.toString() || manualLatitude || "");
      setManualLongitude(
        location?.longitude?.toString() || manualLongitude || "",
      );
      setManualCountry(country || manualCountry || "");
      setManualTimezone(
        location?.timezone || manualTimezone || browserTimezone,
      );
    }
    setIsEditing(!isEditing);
  };

  // Handle manual field changes
  const handleManualFieldChange = (field, value) => {
    switch (field) {
      case "address":
        setManualAddress(value);
        break;
      case "latitude":
        setManualLatitude(value);
        break;
      case "longitude":
        setManualLongitude(value);
        break;
      case "country":
        setManualCountry(value);
        break;
      case "timezone":
        setManualTimezone(value);
        break;
      default:
        break;
    }
  };

  // Validate and confirm location
  const handleConfirm = () => {
    let finalLat = parseFloat(manualLatitude);
    let finalLng = parseFloat(manualLongitude);

    // If in edit mode, use manual values
    if (isEditing) {
      // Validate coordinates
      if (isNaN(finalLat) || isNaN(finalLng)) {
        setError("Please enter valid coordinates (latitude and longitude)");
        return;
      }

      if (finalLat < -90 || finalLat > 90) {
        setError("Latitude must be between -90 and 90");
        return;
      }

      if (finalLng < -180 || finalLng > 180) {
        setError("Longitude must be between -180 and 180");
        return;
      }

      const locationPayload = {
      latitude: finalLat,
      longitude: finalLng,
      address: manualAddress || `${finalLat}, ${finalLng}`, // ✅ Manual edit uses manualAddress
      accuracy: location?.accuracy || null,
      timestamp: new Date().toISOString(),
      timezone: manualTimezone || browserTimezone,
      timezone_offset: manualTimezone
        ? getTimezoneOffset(manualTimezone)
        : location?.timezone_offset,
      timezone_offset_minutes: manualTimezone
        ? getTimezoneOffsetMinutes(manualTimezone)
        : location?.timezone_offset_minutes,
      work_location: manualCountry || "Unknown",
      country_source: "manual-edit",
    };

    storeLocationData(locationPayload);
    onConfirm(locationPayload);
  } else {
    // Use detected location
    if (!location) {
      setError("Location not detected. Please try again or edit manually.");
      return;
    }

    // ✅ Use the readable address from location
    const displayAddress = location.address || 
                          address?.readable_address ||
                          address?.display_name ||
                          `${location.latitude}, ${location.longitude}`;

    const locationPayload = {
      latitude: location.latitude,
      longitude: location.longitude,
      address: displayAddress, // ✅ This will be the readable address
      accuracy: location.accuracy,
      timestamp: location.timestamp,
      timezone: location.timezone,
      timezone_offset: location.timezone_offset,
      timezone_offset_minutes: location.timezone_offset_minutes,
      work_location: country || "Unknown",
      country_source: countrySource,
    };

    console.log("📍 Confirming location payload:", locationPayload);
    onConfirm(locationPayload);
  } 
  };

  const getAccuracyColor = () => {
    if (!location?.accuracy) return "text-gray-500";
    if (location.accuracy <= 50) return "text-green-500";
    if (location.accuracy <= 200) return "text-yellow-500";
    return "text-red-500";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] rounded-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            {isEditing ? "Edit Location" : "Verify Your Location"}
          </h3>
          {!loading && (
            <button
              onClick={toggleEditMode}
              className={`text-sm flex items-center gap-1 transition-colors ${
                isEditing
                  ? "text-red-500 hover:text-red-600"
                  : "text-green-500 hover:text-green-600"
              }`}
            >
              <i className={`fas ${isEditing ? "fa-times" : "fa-pen"}`}></i>
              {isEditing ? "Cancel Edit" : "Edit"}
            </button>
          )}
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-[var(--muted)]">
              Getting your location and timezone...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 my-4">
            <p className="text-red-500 text-sm">{error}</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={fetchLocation}
                className="text-sm text-green-500 hover:underline"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  setError(null);
                  setIsEditing(true);
                }}
                className="text-sm text-blue-500 hover:underline"
              >
                Edit Manually
              </button>
              <button
                onClick={onClose}
                className="text-sm text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <button
              onClick={() => setShowMapPicker(true)}
              className="w-full mb-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <i className="fas fa-map"></i>
              {isEditing ? "Select Location on Map" : "View on Map"}
            </button>

            <div className="bg-[var(--surface2)] rounded-lg p-4 my-4">
              <div className="flex items-start gap-3">
                <i
                  className={`fas ${isEditing ? "fa-edit" : "fa-map-marker-alt"} text-green-500 mt-1`}
                ></i>
                <div className="flex-1 space-y-3">
                  {isEditing ? (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-[var(--muted)] block mb-1">
                          <i className="fas fa-map-pin mr-1"></i> Address
                        </label>
                        <input
                          type="text"
                          value={manualAddress}
                          onChange={(e) =>
                            handleManualFieldChange("address", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm"
                          placeholder="Enter address"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-[var(--muted)] block mb-1">
                            <i className="fas fa-arrows-alt-h mr-1"></i> Latitude
                          </label>
                          <input
                            type="text"
                            value={manualLatitude}
                            onChange={(e) =>
                              handleManualFieldChange("latitude", e.target.value)
                            }
                            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm"
                            placeholder="0.000000"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[var(--muted)] block mb-1">
                            <i className="fas fa-arrows-alt-v mr-1"></i> Longitude
                          </label>
                          <input
                            type="text"
                            value={manualLongitude}
                            onChange={(e) =>
                              handleManualFieldChange("longitude", e.target.value)
                            }
                            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm"
                            placeholder="0.000000"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-[var(--muted)] block mb-1">
                            <i className="fas fa-flag mr-1"></i> Country
                          </label>
                          <input
                            type="text"
                            value={manualCountry}
                            onChange={(e) =>
                              handleManualFieldChange("country", e.target.value)
                            }
                            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm"
                            placeholder="Country"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[var(--muted)] block mb-1">
                            <i className="fas fa-clock mr-1"></i> Timezone
                          </label>
                          <input
                            type="text"
                            value={manualTimezone}
                            onChange={(e) =>
                              handleManualFieldChange("timezone", e.target.value)
                            }
                            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm"
                            placeholder="Asia/Kolkata"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold mb-1">
                        📍 Location Detected
                      </p>
                      <p className="text-xs text-[var(--muted)] mb-2">
      {location?.address || 
        address?.display_name ||
        address?.readable_address ||
        address?.address?.road ||
        address?.address?.neighbourhood ||
        address?.address?.city ||
        (location?.latitude && location?.longitude
          ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
          : "Location not available")}
    </p>
                      <div className="text-xs text-[var(--muted)] space-y-1">
                        {location?.latitude && location?.longitude && (
                          <p>
                            Coordinates: {location.latitude.toFixed(6)},{" "}
                            {location.longitude.toFixed(6)}
                          </p>
                        )}
                        {location?.accuracy && (
                          <p
                            className={`${getAccuracyColor()} flex items-center gap-1`}
                          >
                            <i className="fas fa-chart-line text-xs"></i>
                            Accuracy: {Math.round(location.accuracy)}m
                          </p>
                        )}
                        <p className="text-blue-500 flex items-center gap-1">
                          <i className="fas fa-clock text-xs"></i>
                          Timezone: {location?.timezone || "Unknown"}
                        </p>
                        <p className="text-purple-500 flex items-center gap-1">
                          <i className="fas fa-globe text-xs"></i>
                          UTC Offset: {location?.timezone_offset || "Unknown"}
                        </p>
                        {country && (
                          <p className="text-green-500 flex items-center gap-1">
                            <i className="fas fa-flag text-xs"></i>
                            Country: {country}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface2)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                disabled={!location && !isEditing}
              >
                Confirm {type === "punch-in" ? "Punch In" : "Punch Out"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <MapPicker
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onSelect={handleMapLocationSelect}
          initialLat={parseFloat(manualLatitude) || location?.latitude || 0}
          initialLng={parseFloat(manualLongitude) || location?.longitude || 0}
        />
      )}
    </div>
  );
};

export default LocationModal;