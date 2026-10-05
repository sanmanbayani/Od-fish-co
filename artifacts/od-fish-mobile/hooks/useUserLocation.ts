import { useEffect, useState, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_CACHE_KEY = 'odfish.user.detected_location';

export interface DetectedLocation {
  label: string;
  area: string;
  city?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
}

export function formatLocationAddress(geo: Location.LocationGeocodedAddress): {
  label: string;
  area: string;
  city?: string;
  pincode?: string;
} {
  const city = geo.city || '';
  const pincode = geo.postalCode || undefined;

  // Filter out administrative "Division" strings (e.g. "Pune Division", "Konkan Division")
  const cleanSubregion =
    geo.subregion && !geo.subregion.toLowerCase().includes('division')
      ? geo.subregion
      : undefined;

  // Filter out pure plot/house numbers from name (e.g. "35/4/22", "12A")
  const isPlotNumber = geo.name && /^[\d\s\/\-#]+$/.test(geo.name);
  const cleanName = !isPlotNumber ? geo.name : undefined;

  // Prioritize neighborhood/district (e.g. "Dhankawadi", "Bandra West"), then cleanSubregion, cleanName, street, city
  const area =
    geo.district ||
    cleanSubregion ||
    geo.street ||
    cleanName ||
    city ||
    'Current Location';

  let label = area;
  if (
    city &&
    area.toLowerCase() !== city.toLowerCase() &&
    !area.toLowerCase().includes(city.toLowerCase())
  ) {
    label = `${area}, ${city}`;
  }

  return { label, area, city: city || undefined, pincode };
}

let memoryCachedLocation: DetectedLocation | null = null;

export function getCachedUserLocation(): DetectedLocation | null {
  return memoryCachedLocation;
}

export function useUserLocation(enabled: boolean = true) {
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null>(
    memoryCachedLocation
  );
  const [isLoading, setIsLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const hasRequestedRef = useRef(false);

  // 1. Load cached location on mount for zero-flicker initial render
  useEffect(() => {
    AsyncStorage.getItem(LOCATION_CACHE_KEY)
      .then((cached) => {
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as DetectedLocation;
            memoryCachedLocation = parsed;
            setDetectedLocation((prev) => prev ?? parsed);
          } catch {
            // Ignore parse errors
          }
        }
      })
      .catch(() => {});
  }, []);

  const fetchLocation = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Check existing permission
      let perm = await Location.getForegroundPermissionsAsync();

      // If not yet determined, request it
      if (perm.status !== Location.PermissionStatus.GRANTED && perm.canAskAgain) {
        perm = await Location.requestForegroundPermissionsAsync();
      }

      if (perm.status !== Location.PermissionStatus.GRANTED) {
        setPermissionGranted(false);
        setIsLoading(false);
        return;
      }

      setPermissionGranted(true);

      // Try quick cached position first
      const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
      let coords = lastKnown?.coords;

      // If no last known or older, get fresh current position
      if (!coords) {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coords = current.coords;
      }

      if (coords) {
        const { latitude, longitude } = coords;
        const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });

        if (geocoded && geocoded.length > 0) {
          const formatted = formatLocationAddress(geocoded[0]);
          const locationData: DetectedLocation = {
            ...formatted,
            latitude,
            longitude,
          };

          memoryCachedLocation = locationData;
          setDetectedLocation(locationData);
          await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(locationData)).catch(
            () => {},
          );
        }
      }
    } catch (err) {
      // Silently catch location errors (e.g. GPS disabled, timeout)
      console.warn('Could not detect location:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!enabled || hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    fetchLocation();
  }, [enabled, fetchLocation]);

  return {
    detectedLocation,
    isLoading,
    permissionGranted,
    refetchLocation: fetchLocation,
  };
}
