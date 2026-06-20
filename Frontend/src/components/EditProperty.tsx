import React, { useEffect, useRef, useState, ChangeEvent, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

type Coords = { lat: number; lng: number };

const EditProperty: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    projectName: '',
    developmentType: '',
    totalArea: '',
    areaUnit: 'Sq Yards',
    // Plot dimensions (match PostProperty)
    northSideLength: '',
    southSideLength: '',
    eastSideLength: '',
    westSideLength: '',
    facing: '',
    roadSize: '',
    developerRatio: '',
    // Location
    city: 'Hyderabad',
    locality: '',
    landmark: '',
    coordinates: { lat: 17.385044, lng: 78.486671 } as Coords,
    mapLink: '',
    // Pricing & misc
    goodwill: '',
    advance: '',
    description: '',
    // server-only fields we may preserve
    selectedAmenities: [] as string[],
    imageUrl: '',
  });

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [useMapLink, setUseMapLink] = useState(false);
  const [mapLinkInput, setMapLinkInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  const localityAutocompleteRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const localityInputRef = useRef<HTMLInputElement>(null);
  const mapLinkInputRef = useRef<HTMLInputElement>(null);

  const cities = [
    { value: 'Hyderabad', label: 'Hyderabad' },
    { value: 'Bengaluru', label: 'Bengaluru' },
    { value: 'Chennai', label: 'Chennai' },
    { value: 'Mumbai', label: 'Mumbai' },
    { value: 'Delhi', label: 'Delhi' },
    { value: 'Kolkata', label: 'Kolkata' },
    { value: 'Pune', label: 'Pune' },
    { value: 'Ahmedabad', label: 'Ahmedabad' },
    { value: 'Jaipur', label: 'Jaipur' },
    { value: 'Kochi', label: 'Kochi' },
    { value: 'Lucknow', label: 'Lucknow' },
    { value: 'Chandigarh', label: 'Chandigarh' },
  ];
  const roadSizes = ['20', '40', '60', '80', '100'];
  const facings = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'];
  const ratios = ['50:50', '60:40', '70:30', '80:20'];
  const showDimensions = formData.areaUnit !== 'Acres';

  // ---------- Load existing project ----------
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`https://homefeet.onrender.com/api/properties/${id}`);
        const data = await res.json();

        if (!res.ok || !data?.project) {
          throw new Error(data?.error || 'Failed to fetch property');
        }

        const p = data.project;

        // coordinates may be stored as a JSON string in DB; normalize to object
        let coords: Coords = { lat: 17.385044, lng: 78.486671 };
        if (typeof p.coordinates === 'string') {
          try {
            const parsed = JSON.parse(p.coordinates);
            if (parsed?.lat && parsed?.lng) coords = { lat: Number(parsed.lat), lng: Number(parsed.lng) };
          } catch {}
        } else if (p.coordinates?.lat && p.coordinates?.lng) {
          coords = { lat: Number(p.coordinates.lat), lng: Number(p.coordinates.lng) };
        }

        const mapLink =
          p.map && typeof p.map === 'string' && p.map.includes('maps.google')
            ? p.map
            : `https://maps.google.com/?q=${coords.lat},${coords.lng}`;

        setFormData(prev => ({
          ...prev,
          projectName: p.projectName || '',
          developmentType: p.developmentType || '',
          totalArea: p.totalArea || '',
          areaUnit: p.areaUnit || 'Sq Yards',
          northSideLength: p.northSideLength || '',
          southSideLength: p.southSideLength || '',
          eastSideLength: p.eastSideLength || '',
          westSideLength: p.westSideLength || '',
          facing: p.facing || '',
          roadSize: p.roadSize || '',
          developerRatio: p.developerRatio || '',
          city: p.city || 'Hyderabad',
          locality: p.locality || '',
          landmark: p.landmark || '',
          coordinates: coords,
          mapLink,
          goodwill: p.goodwill || '',
          advance: p.advance || '',
          description: p.description || '',
          selectedAmenities: Array.isArray(p.selectedAmenities) ? p.selectedAmenities : [],
          imageUrl: p.imageUrl || '',
        }));

        setMapLinkInput(mapLink);
      } catch (err: any) {
        alert(err.message || 'Failed to load property');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  // ---------- Google Maps boot ----------
  useEffect(() => {
    const ensureMaps = () => {
      if (!window.google) {
        const script = document.createElement('script');
        const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error('Google Maps API key missing. Set VITE_GOOGLE_MAPS_API_KEY to enable maps.');
          return;
        }
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
        script.async = true;
        script.defer = true;

        window.initMap = () => {
          setIsMapLoaded(true);
          initializeMap();
          setTimeout(() => {
            initializeLocalityAutocomplete();
          }, 100);
        };

        script.onerror = () => {
          console.error('Failed to load Google Maps API');
          alert('Failed to load Google Maps. Please check your API key and internet connection.');
        };

        document.head.appendChild(script);
      } else {
        setIsMapLoaded(true);
        initializeMap();
        initializeLocalityAutocomplete();
      }
    };

    // Only try to load the map after initial data is loaded (so we have coordinates)
    if (!loading) ensureMaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const initializeMap = () => {
    if (window.google && document.getElementById('map')) {
      try {
        mapRef.current = new window.google.maps.Map(document.getElementById('map'), {
          center: formData.coordinates,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          draggable: false,
          zoomControl: true,
          scrollwheel: false,
          disableDoubleClickZoom: true,
        });

        markerRef.current = new window.google.maps.Marker({
          position: formData.coordinates,
          map: mapRef.current,
          draggable: false,
          title: 'Property Location',
        });
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }
  };

  const initializeLocalityAutocomplete = () => {
    if (window.google && localityInputRef.current && !useMapLink) {
      try {
        localityAutocompleteRef.current = new window.google.maps.places.Autocomplete(localityInputRef.current, {
          types: ['sublocality', 'neighborhood', 'locality'],
          componentRestrictions: { country: 'IN' },
          fields: ['formatted_address', 'geometry', 'address_components', 'name'],
          bounds: new window.google.maps.LatLngBounds(
            new window.google.maps.LatLng(17.2, 78.2),
            new window.google.maps.LatLng(17.6, 78.8)
          ),
          strictBounds: true,
        });

        localityAutocompleteRef.current.addListener('place_changed', handleLocalitySelect);
      } catch (error) {
        console.error('Error initializing locality autocomplete:', error);
      }
    }
  };

  const moveMapToLocation = (lat: number, lng: number) => {
    if (mapRef.current && markerRef.current) {
      const position = { lat, lng };
      mapRef.current.setCenter(position);
      mapRef.current.setZoom(15);
      markerRef.current.setPosition(position);
    }
  };

  const handleLocalitySelect = () => {
    try {
      const place = localityAutocompleteRef.current.getPlace();
      if (place?.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        let localityName = place.name || '';
        place.address_components?.forEach((component: any) => {
          if (
            component.types.includes('sublocality_level_1') ||
            component.types.includes('sublocality') ||
            component.types.includes('neighborhood')
          ) {
            localityName = component.long_name;
          }
        });

        setFormData(prev => ({
          ...prev,
          locality: localityName,
          coordinates: { lat, lng },
          mapLink: `https://maps.google.com/?q=${lat},${lng}`,
        }));
        setMapLinkInput(`https://maps.google.com/?q=${lat},${lng}`);
        moveMapToLocation(lat, lng);
      }
    } catch (error) {
      console.error('Error handling locality selection:', error);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          if (window.google) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
              if (status === 'OK' && results[0]) {
                let localityName = '';
                results[0].address_components.forEach((component: any) => {
                  if (
                    component.types.includes('sublocality_level_1') ||
                    component.types.includes('sublocality') ||
                    component.types.includes('neighborhood')
                  ) {
                    localityName = component.long_name;
                  }
                });

                setFormData(prev => ({
                  ...prev,
                  locality: localityName,
                  coordinates: { lat, lng },
                  mapLink: `https://maps.google.com/?q=${lat},${lng}`,
                }));
                setMapLinkInput(`https://maps.google.com/?q=${lat},${lng}`);
                moveMapToLocation(lat, lng);
              }
            });
          }
        },
        error => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const extractCoordinatesFromMapLink = (link: string) => {
    const patterns = [
      /maps\.google\.com.*?@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /maps\.google\.com.*?q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /maps\.google\.com.*?ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /maps\.google\.com.*?center=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /goo\.gl\/maps\/.*?@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    ];
    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
    }
    return null;
  };

  const handleMapLinkChange = (e: ChangeEvent<HTMLInputElement>) => {
    const link = e.target.value;
    setMapLinkInput(link);

    if (link.trim()) {
      const coords = extractCoordinatesFromMapLink(link);
      if (coords) {
        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: coords }, (results: any, status: string) => {
            if (status === 'OK' && results[0]) {
              let localityName = '';
              results[0].address_components.forEach((component: any) => {
                if (
                  component.types.includes('sublocality_level_1') ||
                  component.types.includes('sublocality') ||
                  component.types.includes('neighborhood')
                ) {
                  localityName = component.long_name;
                }
              });

              setFormData(prev => ({
                ...prev,
                locality: localityName,
                coordinates: coords,
                mapLink: `https://maps.google.com/?q=${coords.lat},${coords.lng}`,
              }));

              moveMapToLocation(coords.lat, coords.lng);
            }
          });
        }
      }
    }
  };

  const toggleMapLinkMode = () => {
    setUseMapLink(!useMapLink);
    if (!useMapLink) {
      // to map-link mode
      setFormData(prev => ({ ...prev, locality: '' }));
    } else {
      // back to locality mode
      setMapLinkInput('');
      setTimeout(() => initializeLocalityAutocomplete(), 100);
    }
  };

  // ---------- Form events ----------
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return alert('You must be logged in.');

    const data = new FormData();

    // Append simple fields (skip coordinates & mapLink; we map them to server keys)
    const entries = { ...formData } as any;
    delete entries.coordinates;
    delete entries.mapLink;

    Object.entries(entries).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (key === 'selectedAmenities') {
          data.append(key, JSON.stringify(value));
        } else {
          data.append(key, value as string);
        }
      }
    });

    // Add location keys as expected by backend
    data.set('city', formData.city);
    data.set('locality', formData.locality);
    data.set('landmark', formData.landmark);
    data.set('map', formData.mapLink);
    data.set('coordinates', JSON.stringify(formData.coordinates));

    if (imageFile) data.append('image', imageFile);

    try {
      const res = await fetch(`https://homefeet.onrender.com/api/properties/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error('Unexpected server response');
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Update failed');
      }

      alert('Property updated successfully!');
      navigate('/posted-properties'); // adjust to your route for the list page
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-teal-700">Property Details</h2>

      <input
        name="projectName"
        value={formData.projectName}
        onChange={handleChange}
        placeholder="Project Name"
        className="w-full border p-2 rounded"
        required
      />

      <select
        name="developmentType"
        value={formData.developmentType}
        onChange={handleChange}
        className="w-full border p-2 rounded"
        required
      >
        <option value="">Select Development Type</option>
        <option value="villa">Villa</option>
        <option value="standalone">Standalone</option>
        <option value="high-rise">High-rise</option>
        <option value="plotted">Plotted</option>
        <option value="mixed">Mixed</option>
      </select>

      <div className="grid grid-cols-2 gap-4">
        <input
          name="totalArea"
          value={formData.totalArea}
          onChange={handleChange}
          placeholder="Total Area"
          className="border p-2 rounded"
          type="number"
          min="0"
          step="any"
          required
        />
        <select name="areaUnit" onChange={handleChange} value={formData.areaUnit} className="border p-2 rounded">
          <option value="Sq Yards">Sq Yards</option>
          <option value="Sq Ft">Sq Ft</option>
          <option value="Acres">Acres</option>
        </select>
      </div>

      {showDimensions && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-teal-600">Plot Dimensions (in feet)</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              name="northSideLength"
              value={formData.northSideLength}
              onChange={handleChange}
              placeholder="North Side Length (ft)"
              className="border p-2 rounded"
              type="number"
              min="0"
              step="any"
            />
            <input
              name="southSideLength"
              value={formData.southSideLength}
              onChange={handleChange}
              placeholder="South Side Length (ft)"
              className="border p-2 rounded"
              type="number"
              min="0"
              step="any"
            />
            <input
              name="eastSideLength"
              value={formData.eastSideLength}
              onChange={handleChange}
              placeholder="East Side Length (ft)"
              className="border p-2 rounded"
              type="number"
              min="0"
              step="any"
            />
            <input
              name="westSideLength"
              value={formData.westSideLength}
              onChange={handleChange}
              placeholder="West Side Length (ft)"
              className="border p-2 rounded"
              type="number"
              min="0"
              step="any"
            />
          </div>
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <p>
              <strong>Note:</strong> Enter the length of each side of your plot in feet to capture irregular plots.
            </p>
          </div>
        </div>
      )}

      <select name="facing" onChange={handleChange} value={formData.facing} className="w-full border p-2 rounded">
        <option value="">Facing</option>
        {facings.map(f => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <select onChange={e => setFormData(prev => ({ ...prev, roadSize: e.target.value }))} className="border p-2 rounded" value="">
          <option value="">Select Road Size (m)</option>
          {roadSizes.map(size => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <input
          name="roadSize"
          value={formData.roadSize}
          onChange={handleChange}
          className="border p-2 rounded flex-grow"
          placeholder="Or enter road size"
        />
      </div>

      <div className="flex gap-2">
        <select
          onChange={e => setFormData(prev => ({ ...prev, developerRatio: e.target.value }))}
          className="border p-2 rounded"
          value=""
        >
          <option value="">Select Development Ratio (Owner : Builder)</option>
          {ratios.map(r => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          name="developerRatio"
          value={formData.developerRatio}
          onChange={handleChange}
          className="border p-2 rounded flex-grow"
          placeholder="Or enter custom ratio"
        />
      </div>

      <h2 className="text-2xl font-bold text-teal-700 mt-6">Location Details</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
          <select
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full border p-2 rounded focus:ring-2 focus:ring-teal-500"
            required
          >
            {cities.map(city => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
          <input
            type="checkbox"
            id="useMapLink"
            checked={useMapLink}
            onChange={toggleMapLinkMode}
            className="w-4 h-4 text-teal-600"
          />
          <label htmlFor="useMapLink" className="text-sm text-gray-700">
            Use Google Maps link instead (paste your Google Maps link here)
          </label>
        </div>

        {useMapLink ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🔗 Paste Google Maps Link *</label>
            <input
              ref={mapLinkInputRef}
              type="text"
              value={mapLinkInput}
              onChange={handleMapLinkChange}
              placeholder="Paste your Google Maps link here"
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-teal-500"
              disabled={!isMapLoaded}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Paste any Google Maps link and we'll extract the location automatically</p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Locality *
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="ml-2 text-xs text-teal-600 hover:text-teal-800 bg-teal-50 px-2 py-1 rounded"
              >
                📍 Use Current Location
              </button>
            </label>
            <input
              ref={localityInputRef}
              name="locality"
              value={formData.locality}
              onChange={handleChange}
              placeholder="Enter location / society name (e.g., Gachibowli, Kondapur, Banjara Hills)"
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-teal-500"
              disabled={!isMapLoaded}
              required
            />
            {!isMapLoaded && <p className="text-xs text-gray-500 mt-1">Please wait for Google Maps to load before entering locality</p>}
          </div>
        )}

        {formData.locality && (
          <div className="p-3 bg-teal-50 rounded-lg">
            <p className="text-sm text-teal-700">
              <strong>Selected Location:</strong>
            </p>
            <p className="text-sm text-gray-700">
              📍 {formData.locality}, {formData.landmark}, {formData.city}
            </p>
            <p className="text-xs text-teal-600 mt-1">
              Coordinates: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">📍 Property Location Preview</span>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          This map shows the exact location based on your input. The red marker indicates where buyers will see your property location.
        </p>
        <div id="map" className="w-full h-80 rounded-lg border bg-gray-100" style={{ minHeight: '320px' }}></div>
        <p className="text-xs text-gray-500">ℹ️ Map is for preview only. Location updates automatically based on your locality input or pasted Maps link.</p>
      </div>

      {/* Landmark (kept with location section to match PostProperty) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Landmark / Street *</label>
        <input
          name="landmark"
          value={formData.landmark}
          onChange={handleChange}
          placeholder="e.g. Near Metro Station, Opposite Mall, etc."
          className="w-full border p-2 rounded focus:ring-2 focus:ring-teal-500"
          required
        />
      </div>

      <h2 className="text-2xl font-bold text-teal-700 mt-6">Pricing</h2>
      <input
        name="goodwill"
        onChange={handleChange}
        value={formData.goodwill}
        placeholder="Goodwill (₹)"
        className="w-full border p-2 rounded"
        type="number"
      />
      <input
        name="advance"
        onChange={handleChange}
        value={formData.advance}
        placeholder="Advance (₹)"
        className="w-full border p-2 rounded"
        type="number"
      />
      <textarea
        name="description"
        onChange={handleChange}
        value={formData.description}
        placeholder="Property Description"
        className="w-full border p-2 rounded h-24"
      />

      <h2 className="text-2xl font-bold text-teal-700 mt-6">Gallery</h2>
      {/* Show current image (if any) */}
      {formData.imageUrl ? (
        <div className="mb-2">
          <img
            src={`https://homefeet.onrender.com${formData.imageUrl}`}
            alt="Current"
            className="w-full max-w-md rounded border"
            onError={e => {
              (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=No+Image';
            }}
          />
          <p className="text-xs text-gray-500 mt-1">Current image shown above. Upload a new one to replace.</p>
        </div>
      ) : null}
      <input type="file" onChange={handleImageChange} className="border p-2 w-full rounded" accept="image/*" />

      <button
        type="submit"
        className="bg-teal-700 text-white px-8 py-3 rounded-lg hover:bg-teal-800 font-medium"
        disabled={!isMapLoaded}
      >
        Save Changes
      </button>
    </form>
  );
};

export default EditProperty;
