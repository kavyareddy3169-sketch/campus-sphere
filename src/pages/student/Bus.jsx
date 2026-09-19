import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, onSnapshot, collection, addDoc } from 'firebase/firestore';
import { Bus as BusIcon, Navigation, AlertCircle, QrCode, Map as MapIcon, ExternalLink } from 'lucide-react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer } from '@react-google-maps/api';
import { QRCodeSVG } from 'qrcode.react';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

// Default fallback map center if route fails
const defaultCenter = { lat: 17.3850, lng: 78.4867 };

const StudentBus = () => {
  const { userData } = useAuth();
  const [liveBusData, setLiveBusData] = useState(null);
  
  // QR Scan State
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  // Google Maps State
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });
  
  const [map, setMap] = useState(null);
  const [directions, setDirections] = useState(null);

  const bus = userData?.bus || { assigned: false, routeName: '', busNumber: '', feeAmount: 0, feeStatus: 'unpaid', pickupLocation: '', destinationName: '' };

  useEffect(() => {
    // If student has a bus assigned, subscribe to its live status in Firestore
    if (bus.assigned && bus.busNumber && trackingEnabled) {
      const busRef = doc(db, 'buses', bus.busNumber);
      
      const unsubscribe = onSnapshot(busRef, (docSnap) => {
        if (docSnap.exists()) {
          setLiveBusData(docSnap.data());
        } else {
          setLiveBusData(null);
        }
      });
      
      return () => unsubscribe();
    }
  }, [bus.assigned, bus.busNumber, trackingEnabled]);

  const onLoad = useCallback(function callback(mapInstance) {
    setMap(mapInstance);
    
    if (!bus.pickupLocation || !bus.destinationName) return;

    if (window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      
      const waypoints = (bus.stops || []).map(stop => ({
        location: { query: stop.name },
        stopover: true
      }));

      directionsService.route(
        {
          origin: { query: bus.pickupLocation },
          destination: { query: bus.destinationName },
          waypoints: waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          } else {
            console.warn(`Directions request failed due to ${status}`);
          }
        }
      );
    }
  }, [bus]);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  const handleSimulateScan = async () => {
    if (bus.feeStatus !== 'paid') {
      alert("Please pay the bus fee to board.");
      return;
    }
    if (!bus.assigned) {
      alert("You are not assigned to any bus.");
      return;
    }

    setIsScanning(true);
    try {
      await addDoc(collection(db, 'busScans'), {
        studentId: userData.studentId,
        studentUid: userData.uid,
        busId: bus.busNumber,
        pickupLocation: bus.pickupLocation || 'Unknown',
        scannedAt: new Date().toISOString(),
        status: 'boarded'
      });
      alert(`Boarded successfully on ${bus.busNumber}!`);
      setTrackingEnabled(true);
    } catch (err) {
      console.error(err);
      alert("Failed to scan QR code");
    } finally {
      setIsScanning(false);
    }
  };

  const openGoogleMapsUrl = () => {
    if (!bus.pickupLocation || !bus.destinationName) {
      alert("Pickup or Destination is not properly configured.");
      return;
    }
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(bus.pickupLocation)}&destination=${encodeURIComponent(bus.destinationName)}`;
    
    if (bus.stops && bus.stops.length > 0) {
      const waypoints = bus.stops.map(s => encodeURIComponent(s.name)).join('|');
      url += `&waypoints=${waypoints}`;
    }
    
    window.open(url, '_blank');
  };

  if (!userData) return <div className="loader mx-auto mt-10"></div>;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold mb-6">Smart Bus Management</h2>

      {!trackingEnabled ? (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BusIcon className="text-primary" /> Bus Assignment
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Assignment Status</span>
                <span className={`font-medium ${bus.assigned ? 'text-success' : 'text-gray-500'}`}>
                  {bus.assigned ? 'Assigned' : 'Not Assigned'}
                </span>
              </div>
              {bus.assigned && (
                <>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Bus Number</span>
                    <span className="font-medium text-gray-900">{bus.busNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Route Name</span>
                    <span className="font-medium text-gray-900">{bus.routeName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Pickup Location</span>
                    <span className="font-medium text-gray-900">{bus.pickupLocation || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Destination</span>
                    <span className="font-medium text-gray-900">{bus.destinationName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Fee Status</span>
                    <span className={`font-medium ${bus.feeStatus === 'paid' ? 'text-success' : 'text-danger'}`}>
                      {bus.feeStatus?.toUpperCase() || 'UNPAID'}
                    </span>
                  </div>
                  
                  {/* Quick Map Access before boarding */}
                  <div className="pt-2">
                     <button onClick={openGoogleMapsUrl} className="btn btn-outline w-full flex items-center justify-center gap-2 text-sm py-2">
                       <MapIcon size={16} /> View Planned Route on Google Maps
                     </button>
                  </div>
                </>
              )}
              
              {bus.assigned && bus.feeStatus !== 'paid' && (
                <div className="bg-danger-bg text-danger p-3 rounded-lg text-sm flex items-start gap-2 mt-4">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p>Please pay your pending bus fee to unlock tracking and boarding.</p>
                </div>
              )}
            </div>
          </div>

          <div className="card flex flex-col items-center justify-center text-center p-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 inline-block">
              <QRCodeSVG 
                value={userData.studentId || userData.uid} 
                size={160}
                level="H"
                includeMargin={true}
              />
            </div>
            <h3 className="text-lg font-semibold mb-2">Your Boarding Pass</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs">
              Present this QR code to the bus scanner to confirm boarding and unlock live tracking.
            </p>
            <button 
              onClick={handleSimulateScan}
              className="btn btn-primary w-full max-w-xs"
              disabled={isScanning || !bus.assigned}
            >
              {isScanning ? 'Scanning...' : 'Simulate Scanner Bypass'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2 uppercase tracking-wide">
              <Navigation className="text-primary" /> BUS TRACKING
            </h3>
            <button className="btn btn-outline text-sm" onClick={() => setTrackingEnabled(false)}>
              Close Tracker
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Map View Panel */}
            <div className="md:col-span-2 bg-gray-200 rounded-lg overflow-hidden h-96 relative flex flex-col items-center justify-center border border-gray-300">
              {loadError ? (
                <div className="text-danger flex flex-col items-center">
                  <AlertCircle size={32} className="mb-2" />
                  Map failed to load.
                </div>
              ) : !isLoaded ? (
                <div>Loading Maps...</div>
              ) : !import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                <div className="text-center p-4">
                   <AlertCircle size={32} className="text-warning mx-auto mb-2" />
                   <p className="font-bold">Missing API Key</p>
                   <p className="text-sm text-gray-500">Provide VITE_GOOGLE_MAPS_API_KEY in .env to view embedded map.</p>
                </div>
              ) : (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={defaultCenter}
                  zoom={12}
                  onLoad={onLoad}
                  onUnmount={onUnmount}
                  options={{ disableDefaultUI: true, zoomControl: true }}
                >
                  {/* Route Render - Google handles the A (Pickup) and B (Destination) markers inherently via DirectionsRenderer */}
                  {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: false }} />}
                </GoogleMap>
              )}
            </div>

            {/* Information Panel */}
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Bus Number & Route</p>
                <p className="font-bold text-lg">{bus.busNumber}</p>
                <p className="font-medium text-gray-700">{bus.routeName}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="mb-3 border-b pb-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pickup Location</p>
                  <p className="font-semibold text-gray-800">{bus.pickupLocation || 'Not Set'}</p>
                </div>
                
                {bus.stops && bus.stops.length > 0 && (
                  <div className="mb-3 border-b pb-2 pl-4 border-l-2 border-l-primary ml-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Intermediate Stops</p>
                    {bus.stops.map((stop, idx) => (
                      <p key={idx} className="font-medium text-gray-700 text-sm py-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        {stop.name}
                      </p>
                    ))}
                  </div>
                )}
                
                <div className="pt-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Destination</p>
                  <p className="font-semibold text-gray-800">{bus.destinationName || 'Not Set'}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bus Status</p>
                {liveBusData && liveBusData.status ? (
                  <p className="font-bold text-success flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success"></span>
                    {liveBusData.status}
                  </p>
                ) : (
                  <p className="font-bold text-warning flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning"></span>
                    Live bus location unavailable
                  </p>
                )}
                
                <p className="text-xs text-gray-400 mt-2">
                  Last Updated: {liveBusData?.lastUpdated ? new Date(liveBusData.lastUpdated).toLocaleTimeString() : 'N/A'}
                </p>
              </div>

              {/* View Route on External Google Maps - Primary requirement */}
              <button 
                onClick={openGoogleMapsUrl}
                className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 mt-4 text-sm uppercase tracking-wide font-bold shadow-md"
              >
                View Route on Google Maps <ExternalLink size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentBus;
