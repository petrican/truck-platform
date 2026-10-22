import { useState } from 'react';
import './App.css';
import SidebarForm from './components/SidebarForm';
import RouteDisplay from './components/RouteDisplay';
import { fetchCalculatedRoutes, getMockRoutes } from './services/routeService';
import type { RouteItem, ShipmentFormData } from './types/route';

const getDefaultDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

function App() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ShipmentFormData>({
    origin: 'Berlin, DE',
    destination: 'Munich, DE',
    departureTime: getDefaultDateTime(),
    weight: '24000',
    weightUnit: 'lbs',
    samplingMiles: 25,
  });

  const [activeShipment, setActiveShipment] = useState<{
    origin: string;
    destination: string;
    departureTime: string;
    loadWeightLbs: number;
  }>({
    origin: 'Berlin, DE',
    destination: 'Munich, DE',
    departureTime: '',
    loadWeightLbs: 24000,
  });

  const handleFormSubmit = async (data: ShipmentFormData) => {
    setLoading(true);
    setError(null);

    const rawWeight = parseFloat(data.weight) || 0;
    const weightInLbs = data.weightUnit === 'lbs' ? rawWeight : Math.round(rawWeight * 2.20462);

    setActiveShipment({
      origin: data.origin,
      destination: data.destination,
      departureTime: data.departureTime,
      loadWeightLbs: weightInLbs,
    });

    try {
      const response = await fetchCalculatedRoutes(data);
      if (response.routes && response.routes.length > 0) {
        setRoutes(response.routes);
        const recommended = response.routes.find((r) => r.is_recommended);
        setSelectedRouteIndex(recommended ? recommended.route_index : response.routes[0].route_index);
      } else {
        setError('No valid routes were returned by the backend.');
      }
    } catch (err: unknown) {
      console.error('Failed to calculate routes:', err);
      const msg = err instanceof Error ? err.message : 'Unknown routing error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPreset = (origin: string, destination: string, weight: string) => {
    const updatedForm: ShipmentFormData = {
      ...formData,
      origin,
      destination,
      weight,
      departureTime: formData.departureTime || getDefaultDateTime(),
    };
    setFormData(updatedForm);
    handleFormSubmit(updatedForm);
  };

  const handleLoadDemo = () => {
    setError(null);
    const demoData = getMockRoutes({
      origin: formData.origin,
      destination: formData.destination,
      departureTime: formData.departureTime,
      weight: formData.weight,
      weightUnit: formData.weightUnit,
      samplingMiles: formData.samplingMiles,
    });
    setRoutes(demoData.routes);
    setSelectedRouteIndex(demoData.routes[0].route_index);
  };

  return (
    <div className="layout-container">
      {/* Left side: Dedicated clean shipment configuration panel */}
      <aside className="sidebar">
        <SidebarForm
          onSubmit={handleFormSubmit}
          loading={loading}
          formData={formData}
          onChange={setFormData}
          onQuickPreset={handleQuickPreset}
        />
      </aside>

      {/* Right side: All routes from backend rendered and displayed nicely */}
      <main className="content">
        <RouteDisplay
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={(idx) => setSelectedRouteIndex(idx)}
          loading={loading}
          error={error}
          origin={activeShipment.origin}
          destination={activeShipment.destination}
          loadWeightLbs={activeShipment.loadWeightLbs}
          departureTime={activeShipment.departureTime}
          onLoadDemo={handleLoadDemo}
        />
      </main>
    </div>
  );
}

export default App;
