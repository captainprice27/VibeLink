'use client';

import { useState, useEffect } from 'react';

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
}

interface LocationPermissionProps {
  onLocationGranted: (location: LocationData) => void;
  onLocationDenied: () => void;
}

export default function LocationPermission({
  onLocationGranted,
  onLocationDenied,
}: LocationPermissionProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if permission was already given
    const locationPermission = localStorage.getItem('vibelink-location-permission');
    if (!locationPermission) {
      setShow(true);
    }
  }, []);

  const handleAllow = async () => {
    setLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const location: LocationData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      // Try to get city/country from reverse geocoding (optional)
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.lat}&longitude=${location.lng}&localityLanguage=en`
        );
        if (res.ok) {
          const data = await res.json();
          location.city = data.city || data.locality;
          location.country = data.countryName;
        }
      } catch {
        // Geocoding is optional, continue without it
      }

      localStorage.setItem('vibelink-location-permission', 'granted');
      onLocationGranted(location);
      setShow(false);
    } catch (error) {
      console.error('Error getting location:', error);
      localStorage.setItem('vibelink-location-permission', 'denied');
      onLocationDenied();
      setShow(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = () => {
    localStorage.setItem('vibelink-location-permission', 'denied');
    onLocationDenied();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="location-modal">
      <div className="location-card">
        <div className="location-icon">📍</div>
        <h3>Enable Location</h3>
        <p>
          VibeLink would like to access your location to enhance your experience and
          connect you with nearby users.
        </p>
        <div className="location-buttons">
          <button className="location-deny" onClick={handleDeny} disabled={loading}>
            Not Now
          </button>
          <button className="location-allow" onClick={handleAllow} disabled={loading}>
            {loading ? 'Getting Location...' : 'Allow'}
          </button>
        </div>
      </div>
    </div>
  );
}
