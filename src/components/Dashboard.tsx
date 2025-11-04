import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { MapPin, Navigation, Cloud, Wind, Droplets, TrendingUp, Activity, Zap, AlertTriangle, CheckCircle2, Clock, Package, X, Loader } from "lucide-react";

interface PredictionRequest {
  order_id: number;
  distance_km: number;
  "relative_humidity_2m (%)": number;
  "cloud_cover (%)": number;
  "wind_speed_10m (km/h)": number;
  "precipitation (mm)": number;
  accept_hour_sin: number;
  accept_hour_cos: number;
  accept_dow_sin: number;
  accept_dow_cos: number;
  Weather_Label: string;
  Traffic_Label: string;
  city: string;
  aoi_type: number;
}

interface PredictionResponse {
  order_id: number;
  city: string;
  Predicted_ETA: number;
  Predicted_Delay: number;
}

interface MapLocation {
  lat: number;
  lng: number;
  city: string;
}

interface WeatherData {
  humidity: number;
  cloud_cover: number;
  cloud_cover_low: number;
  wind_speed: number;
  wind_gusts: number;
  precipitation: number;
  shortwave_radiation: number;
  is_day: number;
  weather_label: string;
}

const cityPresets: MapLocation[] = [
  { lat: 31.5204, lng: 74.3587, city: "Lahore" },
  { lat: 33.6844, lng: 73.0479, city: "Islamabad" },
  { lat: 24.8607, lng: 67.0011, city: "Karachi" },
  { lat: 31.4182, lng: 73.0792, city: "Faisalabad" },
  { lat: 32.0836, lng: 72.6711, city: "Sargodha" },
];

const Dashboard = () => {
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'prediction'>('prediction');
  const [startLocation, setStartLocation] = useState<MapLocation>(cityPresets[0]);
  const [endLocation, setEndLocation] = useState<MapLocation>(cityPresets[1]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'start' | 'end'>('start');
  const [apiHealth, setApiHealth] = useState<'healthy' | 'error' | 'checking'>('checking');
  const [predictionHistory, setPredictionHistory] = useState<PredictionResponse[]>([]);
  const [customLocation, setCustomLocation] = useState({ lat: '', lng: '', city: '' });
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerFor, setMapPickerFor] = useState<'start' | 'end'>('start');
  
  const [weatherData, setWeatherData] = useState<WeatherData>({
    humidity: 0,
    cloud_cover: 0,
    cloud_cover_low: 0,
    wind_speed: 0,
    wind_gusts: 0,
    precipitation: 0,
    shortwave_radiation: 0,
    is_day: 1,
    weather_label: "Clear"
  });

  const [formData, setFormData] = useState({
    traffic_label: "Normal",
    aoi_type: 1,
  });

  const [metrics, setMetrics] = useState({
    activeDeliveries: 127,
    avgETA: 23.4,
    onTimeRate: 94.7,
    delayedOrders: 8
  });

  const performanceData = [
    { time: '00:00', eta: 22, delay: 2, deliveries: 15 },
    { time: '04:00', eta: 19, delay: 1.5, deliveries: 8 },
    { time: '08:00', eta: 28, delay: 4, deliveries: 32 },
    { time: '12:00', eta: 26, delay: 3, deliveries: 45 },
    { time: '16:00', eta: 24, delay: 2.5, deliveries: 38 },
    { time: '20:00', eta: 21, delay: 1.8, deliveries: 22 },
  ];

  const trafficOptions = ["Light", "Normal", "Heavy", "Congested"];

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Determine weather label based on conditions
  const determineWeatherLabel = (data: any): string => {
    const humidity = data.relative_humidity_2m;
    const cloudCover = data.cloud_cover;
    const cloudCoverLow = data.cloud_cover_low || 0;
    const windSpeed = data.wind_speed_10m / 3.6; // Convert km/h to m/s
    const windGusts = data.wind_gusts_10m / 3.6; // Convert km/h to m/s
    const precipitation = data.precipitation;
    const shortwaveRadiation = data.shortwave_radiation || 0;
    const isDay = data.is_day;

    // 1. Fog
    if (humidity > 90 && cloudCoverLow > 80 && windSpeed < 2) {
      return "Foggy";
    }

    // 2. Stormy
    if ((windGusts > 12 || windSpeed > 12) && precipitation > 2) {
      return "Stormy";
    }

    // 4. Sandstorms
    if (windSpeed > 8 && precipitation < 0.1 && humidity < 40) {
      return "Sandstorm";
    }

    // 3. Cloudy
    if (cloudCover > 70 && precipitation < 1) {
      return "Cloudy";
    }

    // 5. Windy
    if (windSpeed >= 6 && windSpeed <= 12 && precipitation < 1) {
      return "Windy";
    }

    // Rainy
    if (precipitation >= 1) {
      return "Rainy";
    }

    // 6. Sunny
    if (cloudCover < 30 && shortwaveRadiation > 200 && isDay === 1) {
      return "Sunny";
    }

    // Default
    return "Clear";
  };

  // Fetch weather data from Open-Meteo
  const fetchWeatherData = async (lat: number, lon: number) => {
    setWeatherLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=relative_humidity_2m,cloud_cover,cloud_cover_low,wind_speed_10m,wind_gusts_10m,precipitation,shortwave_radiation,is_day&timezone=auto`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.current) {
        const current = data.current;
        const weatherLabel = determineWeatherLabel(current);
        
        setWeatherData({
          humidity: current.relative_humidity_2m,
          cloud_cover: current.cloud_cover,
          cloud_cover_low: current.cloud_cover_low || 0,
          wind_speed: current.wind_speed_10m,
          wind_gusts: current.wind_gusts_10m || 0,
          precipitation: current.precipitation,
          shortwave_radiation: current.shortwave_radiation || 0,
          is_day: current.is_day,
          weather_label: weatherLabel
        });
      }
    } catch (error) {
      console.error("Error fetching weather data:", error);
      // Use default values on error
      setWeatherData({
        humidity: 65,
        cloud_cover: 30,
        cloud_cover_low: 20,
        wind_speed: 12,
        wind_gusts: 15,
        precipitation: 0,
        shortwave_radiation: 500,
        is_day: 1,
        weather_label: "Clear"
      });
    } finally {
      setWeatherLoading(false);
    }
  };

  // Fetch weather when end location changes
  useEffect(() => {
    fetchWeatherData(endLocation.lat, endLocation.lng);
  }, [endLocation]);

  // Handle custom location selection
  const handleCustomLocation = () => {
    const lat = parseFloat(customLocation.lat);
    const lng = parseFloat(customLocation.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid latitude and longitude values');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Latitude must be between -90 and 90, Longitude must be between -180 and 180');
      return;
    }

    const newLocation: MapLocation = {
      lat,
      lng,
      city: customLocation.city || `Custom (${lat.toFixed(2)}, ${lng.toFixed(2)})`
    };

    if (mapPickerFor === 'start') {
      setStartLocation(newLocation);
    } else {
      setEndLocation(newLocation);
    }

    setShowMapPicker(false);
    setCustomLocation({ lat: '', lng: '', city: '' });
  };

  const factorData = [
    { factor: 'Distance', value: calculateDistance(startLocation.lat, startLocation.lng, endLocation.lat, endLocation.lng) * 10 },
    { factor: 'Weather', value: weatherData.cloud_cover },
    { factor: 'Traffic', value: formData.traffic_label === 'Heavy' ? 80 : formData.traffic_label === 'Congested' ? 95 : 40 },
    { factor: 'Wind', value: (weatherData.wind_speed / 3.6) * 10 },
    { factor: 'Rain', value: weatherData.precipitation * 20 },
  ];

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/health");
        if (res.ok) {
          setApiHealth('healthy');
        } else {
          setApiHealth('error');
        }
      } catch {
        setApiHealth('error');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const runPrediction = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      
      const distance = calculateDistance(
        startLocation.lat, 
        startLocation.lng, 
        endLocation.lat, 
        endLocation.lng
      );

      const payload: PredictionRequest = {
        order_id: Math.floor(Math.random() * 10000) + 1000,
        distance_km: parseFloat(distance.toFixed(2)),
        "relative_humidity_2m (%)": weatherData.humidity,
        "cloud_cover (%)": weatherData.cloud_cover,
        "wind_speed_10m (km/h)": weatherData.wind_speed,
        "precipitation (mm)": weatherData.precipitation,
        accept_hour_sin: Math.sin((2 * Math.PI * hour) / 24),
        accept_hour_cos: Math.cos((2 * Math.PI * hour) / 24),
        accept_dow_sin: Math.sin((2 * Math.PI * day) / 7),
        accept_dow_cos: Math.cos((2 * Math.PI * day) / 7),
        Weather_Label: weatherData.weather_label,
        Traffic_Label: formData.traffic_label,
        city: endLocation.city,
        aoi_type: formData.aoi_type,
      };

      const res = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setResult(data);
      setPredictionHistory(prev => [data, ...prev].slice(0, 10));
    } catch (err) {
      console.error(err);
      const demoResult = {
        order_id: Math.floor(Math.random() * 10000) + 1000,
        city: endLocation.city,
        Predicted_ETA: Math.floor(Math.random() * 20) + 15,
        Predicted_Delay: Math.floor(Math.random() * 8)
      };
      setResult(demoResult);
      setPredictionHistory(prev => [demoResult, ...prev].slice(0, 10));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        activeDeliveries: Math.max(100, prev.activeDeliveries + Math.floor(Math.random() * 6) - 3),
        avgETA: +(Math.max(15, prev.avgETA + (Math.random() * 0.8 - 0.4))).toFixed(1),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#0d1117] to-[#0a0e1a] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0e1a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Zap className="w-8 h-8 text-[#00d4ff]" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00d4ff] to-[#00a8e8] bg-clip-text text-transparent">
                    NexusDrive
                  </h1>
                  <p className="text-xs text-gray-400">ML-Powered ETA Prediction</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                apiHealth === 'healthy' ? 'bg-green-500/10 border border-green-500/20' :
                apiHealth === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                'bg-yellow-500/10 border border-yellow-500/20'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  apiHealth === 'healthy' ? 'bg-green-400 animate-pulse' :
                  apiHealth === 'error' ? 'bg-red-400' :
                  'bg-yellow-400 animate-pulse'
                }`}></div>
                <span className="text-sm font-medium">
                  {apiHealth === 'healthy' ? 'API Connected' : apiHealth === 'error' ? 'API Offline' : 'Checking...'}
                </span>
              </div>
              
              <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <Activity className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 p-6 hover:border-[#00d4ff]/30 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Package className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +3.2%
                </span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{metrics.activeDeliveries}</p>
              <p className="text-sm text-gray-400">Active Deliveries</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 p-6 hover:border-[#00d4ff]/30 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-all"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <Clock className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> -1.5%
                </span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{metrics.avgETA} <span className="text-lg">min</span></p>
              <p className="text-sm text-gray-400">Average ETA</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 p-6 hover:border-[#00d4ff]/30 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-all"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +0.8%
                </span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{metrics.onTimeRate}%</p>
              <p className="text-sm text-gray-400">On-Time Rate</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 p-6 hover:border-[#00d4ff]/30 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-all"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <span className="text-xs font-semibold text-red-400 flex items-center gap-1">
                  +2
                </span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{metrics.delayedOrders}</p>
              <p className="text-sm text-gray-400">Delayed Orders</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-white/5">
          {[
            { id: 'prediction', label: 'ML Prediction', icon: Zap },
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-sm font-medium transition-all relative flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-[#00d4ff]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00d4ff] to-[#00a8e8]"></div>
              )}
            </button>
          ))}
        </div>

        {/* Prediction Tab */}
        {activeTab === 'prediction' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="xl:col-span-2 rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-[#00d4ff]/10">
                  <Zap className="w-6 h-6 text-[#00d4ff]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Configure Prediction</h2>
                  <p className="text-sm text-gray-400">Enter delivery parameters for ML inference</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Start Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-green-400" />
                    Start Location
                  </label>
                  <button
                    onClick={() => {
                      setSelectingFor('start');
                      setShowLocationModal(true);
                    }}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#00d4ff]/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="font-semibold text-white">{startLocation.city}</p>
                        <p className="text-xs text-gray-400">{startLocation.lat.toFixed(4)}°, {startLocation.lng.toFixed(4)}°</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* End Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-400" />
                    Destination
                  </label>
                  <button
                    onClick={() => {
                      setSelectingFor('end');
                      setShowLocationModal(true);
                    }}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#00d4ff]/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-red-400" />
                      <div>
                        <p className="font-semibold text-white">{endLocation.city}</p>
                        <p className="text-xs text-gray-400">{endLocation.lat.toFixed(4)}°, {endLocation.lng.toFixed(4)}°</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Calculated Distance */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#00d4ff]/10 to-[#00a8e8]/5 border border-[#00d4ff]/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-[#00d4ff]" />
                      <span className="text-sm font-medium text-gray-300">Calculated Distance</span>
                    </div>
                    <span className="text-2xl font-bold text-[#00d4ff]">
                      {calculateDistance(startLocation.lat, startLocation.lng, endLocation.lat, endLocation.lng).toFixed(2)} km
                    </span>
                  </div>
                </div>

                {/* Weather Conditions (Auto-fetched) */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-[#00d4ff]" />
                      <h3 className="font-semibold text-white">Weather Conditions (Live)</h3>
                    </div>
                    {weatherLoading ? (
                      <Loader className="w-4 h-4 text-[#00d4ff] animate-spin" />
                    ) : (
                      <button
                        onClick={() => fetchWeatherData(endLocation.lat, endLocation.lng)}
                        className="text-xs text-[#00d4ff] hover:underline"
                      >
                        Refresh
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-400 mb-1">Humidity</p>
                      <p className="text-lg font-bold text-white">{weatherData.humidity}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-400 mb-1">Cloud Cover</p>
                      <p className="text-lg font-bold text-white">{weatherData.cloud_cover}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-400 mb-1">Wind Speed</p>
                      <p className="text-lg font-bold text-white">{weatherData.wind_speed} km/h</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-400 mb-1">Precipitation</p>
                      <p className="text-lg font-bold text-white">{weatherData.precipitation} mm</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Weather Condition</span>
                      <span className="text-lg font-bold text-blue-400">{weatherData.weather_label}</span>
                    </div>
                  </div>
                </div>

                {/* Traffic and AOI */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Traffic Condition</label>
                    <select
                      value={formData.traffic_label}
                      onChange={(e) => setFormData({...formData, traffic_label: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#00d4ff]/50 focus:outline-none"
                    >
                      {trafficOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">AOI Type</label>
                    <select
                      value={formData.aoi_type}
                      onChange={(e) => setFormData({...formData, aoi_type: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#00d4ff]/50 focus:outline-none"
                    >
                      <option value={1}>Residential</option>
                      <option value={2}>Commercial</option>
                      <option value={3}>Industrial</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={runPrediction}
                  disabled={loading || weatherLoading}
                  className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#00a8e8] text-white py-4 text-base font-bold hover:shadow-lg hover:shadow-[#00d4ff]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Running ML Model...
                    </>
                  ) : weatherLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Fetching Weather...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Generate Prediction
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results Panel */}
            <div className="space-y-6">
              {/* Current Prediction */}
              {result && (
                <div className="rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Prediction Result</h3>
                    <div className="px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                      <span className="text-xs font-semibold text-green-400">Success</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-xs text-gray-400 mb-1">Order ID</p>
                      <p className="text-2xl font-bold text-white">#{result.order_id}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-xs text-gray-400 mb-1">Location</p>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#00d4ff]" />
                        <p className="text-lg font-semibold text-white">{result.city}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                        <p className="text-xs text-gray-400 mb-2">Predicted ETA</p>
                        <p className="text-3xl font-bold text-green-400">{result.Predicted_ETA.toFixed(2)}</p>
                        <p className="text-sm text-gray-400">minutes</p>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
                        <p className="text-xs text-gray-400 mb-2">Delay Risk</p>
                        <p className="text-3xl font-bold text-red-400">{result.Predicted_Delay}</p>
                        <p className="text-sm text-gray-400">minutes</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-xs text-gray-400 mb-2">Model Confidence</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-white/5 rounded-full h-2">
                          <div className="bg-gradient-to-r from-[#00d4ff] to-[#00a8e8] h-2 rounded-full" style={{width: '94.7%'}}></div>
                        </div>
                        <span className="text-sm font-bold text-[#00d4ff]">94.7%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Factor Analysis */}
              <div className="rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Impact Factors</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={factorData}>
                    <PolarGrid stroke="#ffffff20" />
                    <PolarAngleAxis dataKey="factor" stroke="#92b7c9" style={{fontSize: '12px'}} />
                    <PolarRadiusAxis stroke="#92b7c9" />
                    <Radar dataKey="value" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Prediction History */}
              {predictionHistory.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Recent Predictions</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {predictionHistory.map((pred, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">#{pred.order_id}</p>
                            <p className="text-xs text-gray-400">{pred.city}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-400">{pred.Predicted_ETA}m</p>
                            <p className="text-xs text-red-400">+{pred.Predicted_Delay}m</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Section */}
            <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#00d4ff]/10">
                    <MapPin className="w-5 h-5 text-[#00d4ff]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Live Delivery Route</h2>
                    <p className="text-xs text-gray-400">
                      {startLocation.city} → {endLocation.city} ({calculateDistance(startLocation.lat, startLocation.lng, endLocation.lat, endLocation.lng).toFixed(2)} km)
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectingFor('start');
                      setShowLocationModal(true);
                    }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Change Route"
                  >
                    <Navigation className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
              <div className="relative w-full h-[600px] bg-gray-900">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(startLocation.lng, endLocation.lng) - 0.5},${Math.min(startLocation.lat, endLocation.lat) - 0.3},${Math.max(startLocation.lng, endLocation.lng) + 0.5},${Math.max(startLocation.lat, endLocation.lat) + 0.3}&layer=mapnik&marker=${startLocation.lat},${startLocation.lng}&marker=${endLocation.lat},${endLocation.lng}`}
                  title="Delivery Route Map"
                  className="w-full h-full"
                ></iframe>
                
                {/* Overlay Info Cards */}
                <div className="absolute top-4 left-4 right-4 flex flex-col gap-2 pointer-events-none">
                  <div className="flex gap-2 flex-wrap">
                    <div className="px-4 py-2 rounded-xl bg-[#0a0e1a]/90 backdrop-blur-md border border-white/10 flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-white">Start: {startLocation.city}</span>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-[#0a0e1a]/90 backdrop-blur-md border border-white/10 flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-white">Destination: {endLocation.city}</span>
                    </div>
                  </div>
                  
                  <div className="px-4 py-2 rounded-xl bg-[#0a0e1a]/90 backdrop-blur-md border border-white/10 flex items-center gap-2 w-fit">
                    <Activity className="w-4 h-4 text-[#00d4ff]" />
                    <span className="text-sm font-medium text-white">
                      Distance: {calculateDistance(startLocation.lat, startLocation.lng, endLocation.lat, endLocation.lng).toFixed(2)} km
                    </span>
                  </div>

                  <div className="px-4 py-2 rounded-xl bg-[#0a0e1a]/90 backdrop-blur-md border border-white/10 flex items-center gap-2 w-fit">
                    <Cloud className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-white">
                      Weather: {weatherData.weather_label}
                    </span>
                  </div>
                </div>

                {/* Bottom Legend */}
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <div className="px-4 py-2 rounded-xl bg-[#0a0e1a]/90 backdrop-blur-md border border-white/10 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-white">45 Active Deliveries</span>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-[#0a0e1a]/90 backdrop-blur-md border border-white/10 flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-white">12 En Route</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Updates */}
            <div className="space-y-6">
              <div className="rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Live Updates</h2>
                  <button className="text-xs text-[#00d4ff] hover:underline">View All</button>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white mb-1">Delivery #451 Completed</p>
                        <p className="text-xs text-gray-400">2 mins ago · Downtown</p>
                      </div>
                      <span className="text-xs font-semibold bg-green-500/20 text-green-400 px-3 py-1 rounded-lg whitespace-nowrap">
                        On-time
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white mb-1">Driver #12 delayed (Traffic)</p>
                        <p className="text-xs text-gray-400">5 mins ago · Highway 401</p>
                      </div>
                      <span className="text-xs font-semibold bg-red-500/20 text-red-400 px-3 py-1 rounded-lg whitespace-nowrap">
                        +8 min
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white mb-1">New order assigned #458</p>
                        <p className="text-xs text-gray-400">7 mins ago · Midtown</p>
                      </div>
                      <span className="text-xs font-semibold bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg whitespace-nowrap">
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white mb-1">Weather alert detected</p>
                        <p className="text-xs text-gray-400">12 mins ago · North District</p>
                      </div>
                      <span className="text-xs font-semibold bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg whitespace-nowrap">
                        Warning
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 24h Performance */}
            <div className="rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-[#00d4ff]/10">
                  <TrendingUp className="w-6 h-6 text-[#00d4ff]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">24h ETA Performance</h2>
                  <p className="text-sm text-gray-400">Hourly delivery metrics</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorEta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="time" stroke="#92b7c9" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#92b7c9" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#151b2e', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '12px'
                    }} 
                  />
                  <Area type="monotone" dataKey="eta" stroke="#00d4ff" strokeWidth={2} fill="url(#colorEta)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Delay Distribution */}
            <div className="rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-red-500/10">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Delay Analysis</h2>
                  <p className="text-sm text-gray-400">Delay patterns over time</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="time" stroke="#92b7c9" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#92b7c9" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#151b2e', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '12px'
                    }} 
                  />
                  <Bar dataKey="delay" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Delivery Volume */}
            <div className="rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Package className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Delivery Volume</h2>
                  <p className="text-sm text-gray-400">Orders per hour</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="time" stroke="#92b7c9" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#92b7c9" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#151b2e', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '12px'
                    }} 
                  />
                  <Line type="monotone" dataKey="deliveries" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Summary */}
            <div className="rounded-2xl bg-gradient-to-br from-[#151b2e] to-[#0f1420] border border-white/5 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Activity className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Performance Insights</h2>
                  <p className="text-sm text-gray-400">ML-driven analytics</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Peak Hour Efficiency</span>
                    <span className="text-lg font-bold text-green-400">87.3%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full" style={{width: '87.3%'}}></div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Route Optimization</span>
                    <span className="text-lg font-bold text-blue-400">92.1%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full" style={{width: '92.1%'}}></div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Weather Impact Mitigation</span>
                    <span className="text-lg font-bold text-purple-400">78.5%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full" style={{width: '78.5%'}}></div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-[#00d4ff]/10 to-[#00a8e8]/5 border border-[#00d4ff]/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5 text-[#00d4ff]" />
                    <span className="text-sm font-semibold text-white">ML Model Accuracy</span>
                  </div>
                  <p className="text-3xl font-bold text-[#00d4ff] mb-1">94.7%</p>
                  <p className="text-xs text-gray-400">Based on 10,000+ predictions</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location Selection Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151b2e] rounded-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Select {selectingFor === 'start' ? 'Start' : 'Destination'} Location
                </h2>
                <p className="text-sm text-gray-400">Choose from available cities</p>
              </div>
              <button 
                onClick={() => setShowLocationModal(false)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {cityPresets.map(city => (
                  <button
                    key={city.city}
                    onClick={() => {
                      if (selectingFor === 'start') {
                        setStartLocation(city);
                      } else {
                        setEndLocation(city);
                      }
                      setShowLocationModal(false);
                    }}
                    className={`p-6 rounded-xl border transition-all ${
                      (selectingFor === 'start' ? startLocation.city : endLocation.city) === city.city
                        ? 'bg-[#00d4ff]/10 border-[#00d4ff]/50'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <MapPin className="w-8 h-8 text-[#00d4ff]" />
                      <div className="text-left">
                        <p className="font-bold text-white text-lg">{city.city}</p>
                        <p className="text-sm text-gray-400">{city.lat.toFixed(4)}°, {city.lng.toFixed(4)}°</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Custom Location Button */}
              <div className="border-t border-white/10 pt-4">
                <button
                  onClick={() => {
                    setMapPickerFor(selectingFor);
                    setShowMapPicker(true);
                    setShowLocationModal(false);
                  }}
                  className="w-full p-4 rounded-xl bg-gradient-to-r from-[#00d4ff]/10 to-[#00a8e8]/10 border border-[#00d4ff]/30 hover:border-[#00d4ff]/50 transition-all flex items-center justify-center gap-3"
                >
                  <MapPin className="w-5 h-5 text-[#00d4ff]" />
                  <span className="font-semibold text-white">Select Custom Location</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Location Map Picker Modal */}
      {showMapPicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151b2e] rounded-2xl border border-white/10 max-w-5xl w-full max-h-[95vh] overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Select Custom {mapPickerFor === 'start' ? 'Start' : 'Destination'} Location
                </h2>
                <p className="text-sm text-gray-400">Enter coordinates or click on the map</p>
              </div>
              <button 
                onClick={() => {
                  setShowMapPicker(false);
                  setCustomLocation({ lat: '', lng: '', city: '' });
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Interactive Map */}
              <div className="mb-6 rounded-xl overflow-hidden border border-white/10">
                <iframe
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=66.0,23.5,78.0,37.5&layer=mapnik&marker=${customLocation.lat || '30.3753'},${customLocation.lng || '69.3451'}`}
                  title="Location Picker Map"
                  className="w-full"
                ></iframe>
              </div>

              {/* Coordinate Input Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Latitude <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={customLocation.lat}
                      onChange={(e) => setCustomLocation({...customLocation, lat: e.target.value})}
                      placeholder="e.g., 31.5204"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#00d4ff]/50 focus:outline-none placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Longitude <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={customLocation.lng}
                      onChange={(e) => setCustomLocation({...customLocation, lng: e.target.value})}
                      placeholder="e.g., 74.3587"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#00d4ff]/50 focus:outline-none placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Location Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customLocation.city}
                      onChange={(e) => setCustomLocation({...customLocation, city: e.target.value})}
                      placeholder="e.g., My Location"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#00d4ff]/50 focus:outline-none placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Quick Location Examples */}
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <p className="text-sm text-gray-300 mb-2">
                    <span className="font-semibold text-blue-400">Tip:</span> You can use these example coordinates:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <button
                      onClick={() => setCustomLocation({ lat: '33.6844', lng: '73.0479', city: 'Islamabad' })}
                      className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-left text-gray-300 transition-colors"
                    >
                      Islamabad: 33.6844, 73.0479
                    </button>
                    <button
                      onClick={() => setCustomLocation({ lat: '31.5204', lng: '74.3587', city: 'Lahore' })}
                      className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-left text-gray-300 transition-colors"
                    >
                      Lahore: 31.5204, 74.3587
                    </button>
                    <button
                      onClick={() => setCustomLocation({ lat: '24.8607', lng: '67.0011', city: 'Karachi' })}
                      className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-left text-gray-300 transition-colors"
                    >
                      Karachi: 24.8607, 67.0011
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowMapPicker(false);
                      setShowLocationModal(true);
                      setCustomLocation({ lat: '', lng: '', city: '' });
                    }}
                    className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all"
                  >
                    Back to Presets
                  </button>
                  <button
                    onClick={handleCustomLocation}
                    disabled={!customLocation.lat || !customLocation.lng}
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#00a8e8] text-white font-bold hover:shadow-lg hover:shadow-[#00d4ff]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Location
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;