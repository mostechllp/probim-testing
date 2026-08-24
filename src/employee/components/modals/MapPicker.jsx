// MapPicker.jsx - Fixed with proper timezone from coordinates
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in production
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icon for selected location
const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// ─── TIMEZONE HELPERS ────────────────────────────────────────────────────

// Get timezone from coordinates using GeoNames API
const getTimezoneFromCoordinates = async (lat, lng) => {
  try {
    // Using GeoNames API (free, no API key required for limited usage)
    const response = await fetch(
      `https://api.geonames.org/timezoneJSON?lat=${lat}&lng=${lng}&username=demo`
    );
    const data = await response.json();
    
    if (data && data.timezoneId) {
      return data.timezoneId;
    }
    return null;
  } catch (error) {
    console.warn('Error fetching timezone from coordinates:', error);
    return null;
  }
};

// Fallback: Get timezone from coordinates using the TimezoneDB API
const getTimezoneFromCoordinatesFallback = async (lat, lng) => {
  try {
    // Using a free timezone API
    const response = await fetch(
      `https://api.timezonedb.com/v2.1/get-time-zone?key=YOUR_API_KEY&format=json&by=position&lat=${lat}&lng=${lng}`
    );
    const data = await response.json();
    
    if (data && data.zoneName) {
      return data.zoneName;
    }
    return null;
  } catch (error) {
    console.warn('Error fetching timezone from fallback API:', error);
    return null;
  }
};

// Map country/timezone manually based on coordinates (as ultimate fallback)
const getTimezoneFromCountry = (country) => {
  const timezoneMap = {
    'Iraq': 'Asia/Baghdad',
    'India': 'Asia/Kolkata',
    'United Arab Emirates': 'Asia/Dubai',
    'Dubai': 'Asia/Dubai',
    'Saudi Arabia': 'Asia/Riyadh',
    'Kuwait': 'Asia/Kuwait',
    'Qatar': 'Asia/Qatar',
    'Bahrain': 'Asia/Bahrain',
    'Oman': 'Asia/Muscat',
    'Yemen': 'Asia/Aden',
    'Jordan': 'Asia/Amman',
    'Lebanon': 'Asia/Beirut',
    'Egypt': 'Africa/Cairo',
    'United States': 'America/New_York',
    'UK': 'Europe/London',
    'United Kingdom': 'Europe/London',
    // Add more as needed
  };
  
  return timezoneMap[country] || null;
};

// ─── Map Events Component ──────────────────────────────────────────────
const MapEvents = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// ─── Draggable Marker Component ──────────────────────────────────────────
const DraggableMarker = ({ position, onDragEnd }) => {
  const markerRef = useRef(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        onDragEnd(latlng.lat, latlng.lng);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={selectedIcon}
    >
      <Popup>
        <div className="text-sm">
          <p className="font-semibold">📍 Selected Location</p>
          <p className="text-xs text-gray-500">
            {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
};

// ─── MAIN MAP PICKER COMPONENT ──────────────────────────────────────────
const MapPicker = ({ isOpen, onClose, onSelect, initialLat = 0, initialLng = 0 }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState({
    lat: initialLat,
    lng: initialLng,
    address: '',
    country: '',
    city: '',
    state: '',
    postalCode: '',
    timezone: '' // Store timezone here
  });
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([initialLat || 20.5937, initialLng || 78.9629]);
  const [mapZoom, setMapZoom] = useState(13);

  // Get user's current location on mount
  useEffect(() => {
    if (isOpen && initialLat === 0 && initialLng === 0) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setMapCenter([latitude, longitude]);
            setSelectedLocation(prev => ({
              ...prev,
              lat: latitude,
              lng: longitude
            }));
            reverseGeocode(latitude, longitude);
          },
          (error) => {
            console.warn("Could not get user location:", error);
            setMapCenter([25.2048, 55.2708]); // Default to Dubai
          }
        );
      }
    }
  }, [isOpen, initialLat, initialLng]);

  // Reverse geocode using OpenStreetMap Nominatim
  const reverseGeocode = async (lat, lng) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'HRMS-App/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        const address = data.address || {};
        const country = address.country || 
                       address.country_code?.toUpperCase() ||
                       data.display_name?.split(',').pop()?.trim() ||
                       '';
        
        // ─── GET TIMEZONE FROM COORDINATES ────────────────────────────
        let timezone = await getTimezoneFromCoordinates(lat, lng);
        
        // If timezone not found, try fallback
        if (!timezone) {
          timezone = await getTimezoneFromCoordinatesFallback(lat, lng);
        }
        
        // If still not found, use country-based mapping
        if (!timezone) {
          timezone = getTimezoneFromCountry(country);
        }
        
        // If still no timezone, use a default based on region
        if (!timezone) {
          // Default fallback based on rough coordinates
          if (lat > 20 && lat < 40 && lng > 40 && lng < 60) {
            timezone = 'Asia/Baghdad'; // Iraq region
          } else if (lat > 20 && lat < 40 && lng > 60 && lng < 80) {
            timezone = 'Asia/Kolkata'; // India region
          } else if (lat > 20 && lat < 40 && lng > -130 && lng < -60) {
            timezone = 'America/New_York'; // US region
          } else if (lat > 35 && lat < 70 && lng > -10 && lng < 40) {
            timezone = 'Europe/London'; // Europe region
          } else {
            timezone = 'UTC';
          }
        }
        
        setSelectedLocation({
          ...selectedLocation,
          lat,
          lng,
          address: data.display_name,
          country: country,
          city: address.city || address.town || address.village || '',
          state: address.state || address.region || '',
          postalCode: address.postcode || '',
          timezone: timezone // ✅ Set the correct timezone
        });
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle map click
  const handleMapClick = async (lat, lng) => {
    setSelectedLocation({
      ...selectedLocation,
      lat,
      lng
    });
    setMapCenter([lat, lng]);
    await reverseGeocode(lat, lng);
  };

  // Handle marker drag end
  const handleMarkerDragEnd = async (lat, lng) => {
    setSelectedLocation({
      ...selectedLocation,
      lat,
      lng
    });
    setMapCenter([lat, lng]);
    await reverseGeocode(lat, lng);
  };

  // Search for location
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'HRMS-App/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        setMapCenter([lat, lng]);
        setMapZoom(15);
        await reverseGeocode(lat, lng);
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error("Search failed:", error);
      alert('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Confirm selection - NOW USES CORRECT TIMEZONE FROM COORDINATES
  const handleConfirm = () => {
    if (selectedLocation.lat && selectedLocation.lng) {
      onSelect({
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        address: selectedLocation.address,
        country: selectedLocation.country,
        city: selectedLocation.city,
        state: selectedLocation.state,
        postalCode: selectedLocation.postalCode,
        timezone: selectedLocation.timezone || 'UTC' // ✅ Use the timezone from coordinates
      });
    }
    onClose();
  };

  // Use current location
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          setMapZoom(15);
          await reverseGeocode(latitude, longitude);
          setLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get your current location. Please search or click on the map.");
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-[var(--surface)] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--border)] flex-shrink-0">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <i className="fas fa-map text-green-500"></i>
            Select Location on Map
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Search Bar & Controls */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex-1 min-w-[200px] flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for a location..."
                className="flex-1 px-4 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-green-500"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
              </button>
            </div>
            <button
              onClick={handleUseCurrentLocation}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <i className="fas fa-location-dot mr-1"></i>
              Current Location
            </button>
          </div>

          {/* Map Container */}
          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg h-[400px] relative overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              attributionControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapEvents onMapClick={handleMapClick} />
              
              {selectedLocation.lat && selectedLocation.lng && (
                <DraggableMarker
                  position={[selectedLocation.lat, selectedLocation.lng]}
                  onDragEnd={handleMarkerDragEnd}
                />
              )}
            </MapContainer>
            
            {loading && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                  <span className="text-sm">Getting location...</span>
                </div>
              </div>
            )}
            
            <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none">
              <i className="fas fa-hand-pointer mr-1"></i>
              Click on map or drag marker
            </div>
          </div>

          {/* Selected Location Details */}
          <div className="mt-4 p-3 bg-[var(--surface2)] border border-[var(--border)] rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center">
                <span className="text-[var(--muted)] w-20">Latitude:</span>
                <span className="font-mono text-[var(--text)]">
                  {selectedLocation.lat ? selectedLocation.lat.toFixed(6) : '--'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-[var(--muted)] w-20">Longitude:</span>
                <span className="font-mono text-[var(--text)]">
                  {selectedLocation.lng ? selectedLocation.lng.toFixed(6) : '--'}
                </span>
              </div>
              {selectedLocation.country && (
                <div className="flex items-center col-span-1">
                  <span className="text-[var(--muted)] w-20">Country:</span>
                  <span className="font-semibold text-green-500">{selectedLocation.country}</span>
                </div>
              )}
              {selectedLocation.timezone && (
                <div className="flex items-center col-span-1">
                  <span className="text-[var(--muted)] w-20">Timezone:</span>
                  <span className="font-semibold text-blue-500">{selectedLocation.timezone}</span>
                </div>
              )}
              {selectedLocation.city && (
                <div className="flex items-center col-span-1">
                  <span className="text-[var(--muted)] w-20">City:</span>
                  <span className="text-[var(--text)]">{selectedLocation.city}</span>
                </div>
              )}
              {selectedLocation.address && (
                <div className="col-span-2 mt-1 pt-1 border-t border-[var(--border)]">
                  <span className="text-[var(--muted)]">Address:</span>
                  <span className="ml-2 text-xs text-[var(--text)]">{selectedLocation.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-[var(--border)] flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface2)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLocation.lat || !selectedLocation.lng}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-check mr-2"></i>
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapPicker;