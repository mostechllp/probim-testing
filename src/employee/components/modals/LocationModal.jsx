// LocationModal.jsx - FIXED VERSION WITH EDIT BUTTON ALWAYS VISIBLE
import { useState, useEffect, useRef } from "react";
import {
  getLocationWithTimezone,
  getAddressFromCoordinates,
} from "../../services/locationServise";
import { getCountryFromTimezone } from "../../utils/timezoneCountryMap";

// Simple Map Component using Leaflet (or you can use Google Maps)
import MapPicker from "./MapPicker";

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

  // Get current timezone from browser
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (isOpen) {
      fetchLocation();
    }
  }, [isOpen]);

  const fetchLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get location with timezone
      const locationData = await getLocationWithTimezone();
      setLocation(locationData);

      // Populate manual fields with detected data
      setManualLatitude(locationData.latitude?.toString() || "");
      setManualLongitude(locationData.longitude?.toString() || "");
      setManualTimezone(locationData.timezone || browserTimezone);

      // Get country from timezone
      const countryFromTimezone = getCountryFromTimezone(locationData.timezone);

      // Try to get address
      let countryFromAddress = null;
      let addressData = null;

      if (locationData.latitude && locationData.longitude) {
        try {
          addressData = await getAddressFromCoordinates(
            locationData.latitude,
            locationData.longitude,
          );
          setAddress(addressData);
          setManualAddress(addressData?.display_name || "");

          if (addressData) {
            countryFromAddress =
              addressData.address?.country ||
              addressData.address?.country_name ||
              addressData.country ||
              addressData.display_name?.split(",").pop()?.trim() ||
              null;

          }
        } catch (err) {
          console.warn(
            "Could not fetch address, falling back to timezone:",
            err,
          );
        }
      }

      // Determine final country
      let finalCountry = countryFromAddress || countryFromTimezone || "Unknown";
      let source = countryFromAddress
        ? "address"
        : countryFromTimezone
          ? "timezone"
          : "fallback";

      if (
        finalCountry === "Unknown" &&
        countryFromTimezone &&
        countryFromTimezone !== "Unknown"
      ) {
        finalCountry = countryFromTimezone;
        source = "timezone";
      }

      if (countryFromAddress && countryFromAddress !== "Unknown") {
        finalCountry = countryFromAddress;
        source = "address";
      }

      setCountry(finalCountry);
      setCountrySource(source);
      setManualCountry(finalCountry);
    } catch (err) {
      console.error("❌ Location fetch error:", err);
      setError(err.message || "Failed to get location");

      // Fallback: try to get timezone
      try {
        const fallbackCountry = getCountryFromTimezone(browserTimezone);
        if (fallbackCountry && fallbackCountry !== "Unknown") {
          setCountry(fallbackCountry);
          setCountrySource("timezone-fallback");
          setManualCountry(fallbackCountry);
          setManualTimezone(browserTimezone);
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
      timezone:
        selectedLocation.timezone || location?.timezone || browserTimezone,
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
        address: manualAddress || `${finalLat}, ${finalLng}`,
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

      onConfirm(locationPayload);
    } else {
      // Use detected location
      if (!location) {
        setError("Location not detected. Please try again or edit manually.");
        return;
      }

      const locationPayload = {
        latitude: location.latitude,
        longitude: location.longitude,
        address:
          address?.display_name ||
          address?.address?.road ||
          address?.address?.neighbourhood ||
          address?.address?.city ||
          `${location.latitude}, ${location.longitude}`,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        timezone: location.timezone,
        timezone_offset: location.timezone_offset,
        timezone_offset_minutes: location.timezone_offset_minutes,
        work_location: country || "Unknown",
        country_source: countrySource,
      };

      onConfirm(locationPayload);
    }
  };

  // Helper to get timezone offset
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

  const getTimezoneOffsetMinutes = (timezone) => {
    try {
      const date = new Date();
      const formatter = new Intl.DateTimeFormat("en", {
        timeZone: timezone,
        timeZoneName: "short",
      });
      // Simplified: get UTC offset in minutes
      const utcDate = new Date(
        date.toLocaleString("en-US", { timeZone: "UTC" }),
      );
      const tzDate = new Date(
        date.toLocaleString("en-US", { timeZone: timezone }),
      );
      return Math.round((tzDate - utcDate) / 60000);
    } catch {
      return -new Date().getTimezoneOffset();
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
          {/* ✅ EDIT BUTTON - Always visible when not loading */}
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
            {/* ✅ Show Map Picker Button - Always visible when not loading */}
            <button
              onClick={() => setShowMapPicker(true)}
              className="w-full mb-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <i className="fas fa-map"></i>
              {isEditing ? "Select Location on Map" : "View on Map"}
            </button>

            {/* Location Display / Edit Fields */}
            <div className="bg-[var(--surface2)] rounded-lg p-4 my-4">
              <div className="flex items-start gap-3">
                <i
                  className={`fas ${isEditing ? "fa-edit" : "fa-map-marker-alt"} text-green-500 mt-1`}
                ></i>
                <div className="flex-1 space-y-3">
                  {isEditing ? (
                    // Edit Mode - Show input fields
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
                            <i className="fas fa-arrows-alt-h mr-1"></i>{" "}
                            Latitude
                          </label>
                          <input
                            type="text"
                            value={manualLatitude}
                            onChange={(e) =>
                              handleManualFieldChange(
                                "latitude",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm"
                            placeholder="0.000000"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[var(--muted)] block mb-1">
                            <i className="fas fa-arrows-alt-v mr-1"></i>{" "}
                            Longitude
                          </label>
                          <input
                            type="text"
                            value={manualLongitude}
                            onChange={(e) =>
                              handleManualFieldChange(
                                "longitude",
                                e.target.value,
                              )
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
                              handleManualFieldChange(
                                "timezone",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm"
                            placeholder="Asia/Kolkata"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    // Display Mode - Show detected location
                    <>
                      <p className="text-sm font-semibold mb-1">
                        📍 Location Detected
                      </p>
                      <p className="text-xs text-[var(--muted)] mb-2">
                        {address?.display_name ||
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