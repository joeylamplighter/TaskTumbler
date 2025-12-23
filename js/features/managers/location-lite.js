// js/components/location-lite.js
window.useLocationsLite = ({ data, setData, locationInput, setLocationInput, notify }) => {
  const [showLocManager, setShowLocManager] = React.useState(false);
  const [isLocLoading, setIsLocLoading] = React.useState(false);
  const [allLocations] = window.useLocations(); // Subscribes to DataManager.locations

  const getTaskLocationOnce = async () => {
    if (!navigator.geolocation) return notify?.("GPS not supported", "🚫");
    
    setIsLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const locName = `Point (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`;
        setLocationInput(locName);
        setIsLocLoading(false);
        notify?.("Location captured", "📍");
      },
      (err) => {
        setIsLocLoading(false);
        notify?.("GPS Error", "❌");
      }
    );
  };

  const saveLocationToTaskAndDB = () => {
    const cleanLoc = String(locationInput || '').trim();
    if (!cleanLoc) return;

    const exists = allLocations.some(l => l.name.toLowerCase() === cleanLoc.toLowerCase());
    if (!exists) {
      window.DataManager?.locations?.add({
        name: cleanLoc,
        id: 'loc_' + Date.now()
      });
    }
    notify?.("Location saved", "💾");
  };

  // Logic to render the Locations Manager via Portal
  const LocationsOverlay = () => {
    if (!showLocManager) return null;
    return (
      <window.LocationsManager
        locations={allLocations}
        setLocations={(newList) => window.DataManager?.locations?.setAll(newList)}
        onClose={() => setShowLocManager(false)}
      />
    );
  };

  return {
    showLocManager,
    setShowLocManager,
    allLocations,
    isLocLoading,
    getTaskLocationOnce,
    saveLocationToTaskAndDB,
    LocationsOverlay
  };
};