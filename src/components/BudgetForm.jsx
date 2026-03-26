import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createBudget, updateBudget, getUserBudgets } from '../services/budgetService';
import './BudgetForm.css';

const BudgetForm = ({ isEditing = false }) => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    transportType: 'bus',
    quantity: 1,
    passengers: 1,
    transportCost: 0,
    hotelCost: 0,
    foodCost: 0,
    activitiesCost: 0,
    totalBudget: 0,
    notes: ''
  });

  useEffect(() => {
    if (isEditing && id) {
      loadBudgetData();
    }
  }, [id, isEditing]);

  const loadBudgetData = async () => {
    try {
      const budgets = await getUserBudgets(user.uid);
      const budget = budgets.find(b => b.id === id);
      if (budget) {
        setFormData({
          destination: budget.destination || '',
          startDate: budget.startDate || '',
          endDate: budget.endDate || '',
          transportType: budget.transportType || 'bus',
          quantity: budget.quantity || 1,
          passengers: budget.passengers || 1,
          transportCost: budget.transportCost || 0,
          hotelCost: budget.hotelCost || 0,
          foodCost: budget.foodCost || 0,
          activitiesCost: budget.activitiesCost || 0,
          totalBudget: budget.totalBudget || 0,
          notes: budget.notes || ''
        });
      }
    } catch (err) {
      setError('Error al cargar el presupuesto');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTotal = () => {
    const transport = parseFloat(formData.transportCost) || 0;
    const hotel = parseFloat(formData.hotelCost) || 0;
    const food = parseFloat(formData.foodCost) || 0;
    const activities = parseFloat(formData.activitiesCost) || 0;
    return transport + hotel + food + activities;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const total = calculateTotal();
      const budgetData = {
        ...formData,
        transportCost: parseFloat(formData.transportCost) || 0,
        hotelCost: parseFloat(formData.hotelCost) || 0,
        foodCost: parseFloat(formData.foodCost) || 0,
        activitiesCost: parseFloat(formData.activitiesCost) || 0,
        totalBudget: total,
        passengers: parseInt(formData.passengers) || 1,
        quantity: parseInt(formData.quantity) || 1
      };

      if (isEditing && id) {
        await updateBudget(id, budgetData);
      } else {
        await createBudget(user.uid, budgetData);
      }

      navigate('/dashboard');
    } catch (err) {
      setError('Error al guardar el presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const total = calculateTotal();

  return (
    <div className="budget-form-container">
      <div className="form-wrapper">
        <h2>{isEditing ? 'Editar Presupuesto' : 'Crear Nuevo Presupuesto'}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Información del Viaje</h3>
            
            <div className="form-group">
              <label>Destino</label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                placeholder="Ej: Cartagena, Colombia"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Fecha de Inicio</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Fecha de Fin</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Cantidad de Pasajeros</label>
                <input
                  type="number"
                  name="passengers"
                  value={formData.passengers}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Tipo de Transporte</label>
                <select
                  name="transportType"
                  value={formData.transportType}
                  onChange={handleChange}
                >
                  <option value="bus">Autobús</option>
                  <option value="car">Carro</option>
                  <option value="plane">Avión</option>
                  <option value="train">Tren</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Costos del Viaje</h3>

            <div className="form-group">
              <label>Costo de Transporte ($)</label>
              <input
                type="number"
                name="transportCost"
                value={formData.transportCost}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Costo de Hospedaje ($)</label>
              <input
                type="number"
                name="hotelCost"
                value={formData.hotelCost}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Costo de Comida ($)</label>
              <input
                type="number"
                name="foodCost"
                value={formData.foodCost}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Costo de Actividades ($)</label>
              <input
                type="number"
                name="activitiesCost"
                value={formData.activitiesCost}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Notas Adicionales</h3>
            <div className="form-group">
              <label>Notas</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Agrega cualquier nota o comentario importante..."
                rows="4"
              ></textarea>
            </div>
          </div>

          <div className="total-section">
            <h3>Presupuesto Total</h3>
            <div className="total-amount">${total.toFixed(2)}</div>
            <p className="total-per-person">Por persona: ${(total / formData.passengers).toFixed(2)}</p>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-cancel"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-save"
            >
              {loading ? 'Guardando...' : 'Guardar Presupuesto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetForm;
