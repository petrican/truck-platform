import React, { useState, type ChangeEvent, type SubmitEvent } from 'react';
import './SidebarForm.css';

// Definim tipul de date pe care formularul îl colectează
export interface ShipmentFormData {
  origin: string;
  destination: string;
  departureTime: string;
  weight: string;
}

interface SidebarFormProps {
  onSubmit?: (data: ShipmentFormData) => void;
}

export default function SidebarForm({ onSubmit }: SidebarFormProps): React.JSX.Element {
  const [formData, setFormData] = useState<ShipmentFormData>({
    origin: '',
    destination: '',
    departureTime: '',
    weight: '',
  });


  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <form className="sidebar-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2>New Shipment</h2>
        <p>Enter the transit details below</p>
      </div>

      <div className="form-group">
        <label htmlFor="origin">Origin</label>
        <input
          type="text"
          id="origin"
          name="origin"
          placeholder="e.g. London, UK"
          value={formData.origin}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="destination">Destination</label>
        <input
          type="text"
          id="destination"
          name="destination"
          placeholder="e.g. Paris, FR"
          value={formData.destination}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="departureTime">Departure Time</label>
        <input
          type="datetime-local"
          id="departureTime"
          name="departureTime"
          value={formData.departureTime}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="weight">Weight (kg)</label>
        <input
          type="number"
          id="weight"
          name="weight"
          placeholder="0.00"
          min="0"
          step="0.01"
          value={formData.weight}
          onChange={handleChange}
          required
        />
      </div>

      <button type="submit" className="submit-btn">
        Calculate Route
      </button>
    </form>
  );
}
