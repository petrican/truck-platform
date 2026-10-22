import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { ShipmentFormData } from '../types/route';
import { Truck, MapPin, Calendar, Scale, Gauge, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import './SidebarForm.css';

export type { ShipmentFormData };

interface SidebarFormProps {
  onSubmit?: (data: ShipmentFormData) => void;
  loading?: boolean;
  formData?: ShipmentFormData;
  onChange?: (data: ShipmentFormData) => void;
  onQuickPreset?: (origin: string, destination: string, weight: string) => void;
}

const getDefaultDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

export default function SidebarForm({
  onSubmit,
  loading = false,
  formData: controlledData,
  onChange: controlledOnChange,
  onQuickPreset,
}: SidebarFormProps): React.JSX.Element {
  const [internalData, setInternalData] = useState<ShipmentFormData>({
    origin: 'Berlin, DE',
    destination: 'Munich, DE',
    departureTime: getDefaultDateTime(),
    weight: '24000',
    weightUnit: 'lbs',
    samplingMiles: 25,
  });

  const presets = [
    { origin: 'Berlin, DE', destination: 'Munich, DE', weight: '24000', label: 'Berlin ➔ Munich' },
    { origin: 'Paris, FR', destination: 'Lyon, FR', weight: '32000', label: 'Paris ➔ Lyon' },
    { origin: 'London, UK', destination: 'Manchester, UK', weight: '18000', label: 'London ➔ Manchester' },
    { origin: 'Bucharest, RO', destination: 'Cluj-Napoca, RO', weight: '22000', label: 'Bucharest ➔ Cluj' },
  ];

  const formData = controlledData ?? internalData;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    const updated = {
      ...formData,
      [name]: name === 'samplingMiles' ? Number(value) : value,
    };

    if (controlledOnChange) {
      controlledOnChange(updated);
    } else {
      setInternalData(updated);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <form className="sidebar-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <div className="form-title-badge">
          <Truck size={15} />
          <span>Freight Dispatch</span>
        </div>
        <h2>New Shipment</h2>
        <p>Enter transit geometry & cargo metrics</p>
      </div>

      <div className="form-group">
        <label htmlFor="origin">
          <MapPin size={12} />
          <span>Origin Location</span>
        </label>
        <input
          type="text"
          id="origin"
          name="origin"
          placeholder="e.g. Berlin, DE or 13.40,52.52"
          value={formData.origin}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="destination">
          <MapPin size={12} />
          <span>Destination</span>
        </label>
        <input
          type="text"
          id="destination"
          name="destination"
          placeholder="e.g. Munich, DE or 11.58,48.13"
          value={formData.destination}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="departureTime">
          <Calendar size={12} />
          <span>Scheduled Departure</span>
        </label>
        <input
          type="datetime-local"
          id="departureTime"
          name="departureTime"
          value={formData.departureTime}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row-dual">
        <div className="form-group flex-1">
          <label htmlFor="weight">
            <Scale size={12} />
            <span>Gross Weight</span>
          </label>
          <div className="input-with-unit">
            <input
              type="number"
              id="weight"
              name="weight"
              placeholder="25000"
              min="0"
              step="1"
              value={formData.weight}
              onChange={handleChange}
              required
            />
            <select
              name="weightUnit"
              value={formData.weightUnit || 'lbs'}
              onChange={handleChange}
              className="unit-select"
            >
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>

        <div className="form-group sampling-group">
          <label htmlFor="samplingMiles">
            <Gauge size={12} />
            <span>Weather Step</span>
          </label>
          <select
            id="samplingMiles"
            name="samplingMiles"
            value={formData.samplingMiles || 25}
            onChange={handleChange}
            className="sampling-select"
          >
            <option value={10}>10 mi</option>
            <option value={25}>25 mi</option>
            <option value={50}>50 mi</option>
          </select>
        </div>
      </div>

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? (
          <>
            <Loader2 size={16} className="btn-spinner" />
            <span>Computing Trajectories...</span>
          </>
        ) : (
          <span>Calculate Route Alternatives</span>
        )}
      </button>

      {onQuickPreset && (
        <div className="form-presets-section">
          <div className="preset-label">
            <Sparkles size={13} />
            <span>Quick Corridor Presets</span>
          </div>
          <div className="presets-list">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                className="preset-pill-btn"
                onClick={() => onQuickPreset(p.origin, p.destination, p.weight)}
              >
                <span>{p.label}</span>
                <ArrowRight size={12} />
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
