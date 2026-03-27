import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getUserBudgets, deleteBudget } from '../services/budgetService';
import './Dashboard.css';

const Dashboard = () => {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBudgets = useCallback(async () => {
    if (!user?.uid) {
      return;
    }

    try {
      setLoading(true);
      const userBudgets = await getUserBudgets(user.uid);
      setBudgets(userBudgets);
    } catch (error) {
      console.error('Error cargando presupuestos:', error);
      alert('Error al cargar presupuestos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleDelete = async (budgetId) => {
    if (globalThis.confirm('¿Estás seguro de que deseas eliminar este presupuesto?')) {
      try {
        await deleteBudget(budgetId);
        setBudgets((prevBudgets) => prevBudgets.filter((b) => b.id !== budgetId));
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  let content = <div className="loading">Cargando presupuestos...</div>;

  if (!loading && budgets.length === 0) {
    content = (
      <div className="empty-state">
        <h3>No tienes presupuestos aún</h3>
        <p>Crea tu primer presupuesto de viaje para comenzar</p>
        <button
          onClick={() => navigate('/crear-presupuesto')}
          className="btn-create-empty"
        >
          Crear Presupuesto
        </button>
      </div>
    );
  }

  if (!loading && budgets.length > 0) {
    content = (
      <div className="budgets-grid">
        {budgets.map((budget) => (
          <div key={budget.id} className="budget-card">
            <div className="budget-header">
              <h3>{budget.destination}</h3>
              <span className="budget-status">{budget.status || 'En Progreso'}</span>
            </div>

            <div className="budget-details">
              <p><strong>Fechas:</strong> {budget.startDate} a {budget.endDate}</p>
              <p><strong>Tipo de Transporte:</strong> {budget.transportType}</p>
              <p><strong>Cantidad de Pasajeros:</strong> {budget.passengers}</p>
              <p><strong>Presupuesto Total:</strong> ${budget.totalBudget}</p>
            </div>

            <div className="budget-actions">
              <button
                onClick={() => navigate(`/editar-presupuesto/${budget.id}`)}
                className="btn-edit"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(budget.id)}
                className="btn-delete"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <navbar className="navbar">
        <div className="navbar-content">
          <h1>Panel de Control</h1>
          <div className="user-info">
            <span className="username">@{userProfile?.username}</span>
            <button onClick={handleLogout} className="btn-logout">Cerrar Sesión</button>
          </div>
        </div>
      </navbar>

      <div className="dashboard-content">
        <div className="header-section">
          <h2>Mis Presupuestos de Viajes</h2>
          <button 
            onClick={() => navigate('/crear-presupuesto')} 
            className="btn-create"
          >
            + Crear Presupuesto
          </button>
        </div>

        {content}
      </div>
    </div>
  );
};

export default Dashboard;
