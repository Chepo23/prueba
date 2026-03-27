import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getUserBudgets, deleteBudget } from '../services/budgetService';
import { getPreloadedRoutes } from '../services/locationService';
import { generateBudgetPDF } from '../utils/pdfGenerator';
import { TRANSPORT_CONFIG, TOLL_MULTIPLIER, getTransportLabel } from '../constants/transport';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FaMapLocationDot, FaGasPump, FaCar, FaRoad } from 'react-icons/fa6';
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
    const confirmed = typeof globalThis.confirm === 'function'
      ? globalThis.confirm('¿Estás seguro de que deseas eliminar este presupuesto?')
      : false;

    if (!confirmed) {
      return;
    }

    try {
      await deleteBudget(budgetId);
      setBudgets((prevBudgets) => prevBudgets.filter((b) => b.id !== budgetId));
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  const handleGeneratePDF = async (budget) => {
    try {
      await generateBudgetPDF(budget);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
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
              <h3>{budget.tripName || budget.destination}</h3>
            </div>

            <div className="budget-details">
              <div className="budget-details-row">
                <span className="detail-label">Ruta:</span>
                <span className="detail-value">{budget.destination || budget.outboundRouteLabel || budget.tripName || 'Sin especificar'}</span>
              </div>
              <div className="budget-details-row">
                <span className="detail-label">Distancia:</span>
                <span className="detail-value">{budget.routeDistanceKm || 0} km</span>
              </div>
              <div className="budget-details-row">
                <span className="detail-label">Fechas:</span>
                <span className="detail-value">{formatDate(budget.departureDateTime)} a {formatDate(budget.returnDateTime)}</span>
              </div>
              <div className="budget-details-row">
                <span className="detail-label">Transporte:</span>
                <span className="detail-value">{getTransportLabel(budget.transportType)}</span>
              </div>
              <div className="budget-details-row">
                <span className="detail-label">Pasajeros:</span>
                <span className="detail-value">{budget.passengers}</span>
              </div>
              
              <div className="budget-costs">
                <div className="cost-item">
                  <span>Transporte:</span>
                  <span className="cost-value">{formatCurrency(budget.transportCost)}</span>
                </div>
                <div className="cost-item">
                  <span>Hospedaje:</span>
                  <span className="cost-value">{formatCurrency(budget.hotelCost)}</span>
                </div>
                <div className="cost-item">
                  <span>Comida:</span>
                  <span className="cost-value">{formatCurrency(budget.foodCost)}</span>
                </div>
                <div className="cost-item">
                  <span>Actividades:</span>
                  <span className="cost-value">{formatCurrency(budget.activitiesCost)}</span>
                </div>
              </div>
              
              <div className="budget-total">
                <span>Presupuesto Total:</span>
                <span className="total-value">{formatCurrency(budget.totalBudget)}</span>
              </div>
            </div>

            <div className="budget-actions">
              <button
                onClick={() => navigate(`/editar-presupuesto/${budget.id}`)}
                className="btn-edit"
              >
                Editar
              </button>
              <button
                onClick={() => handleGeneratePDF(budget)}
                className="btn-report"
              >
                Generar PDF
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
      <nav className="navbar">
        <div className="navbar-content">
          <h1>Panel de Control</h1>
          <div className="user-info">
            <span className="username">@{userProfile?.username}</span>
            <button onClick={handleLogout} className="btn-logout">Cerrar Sesión</button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="header-section-top">
          <h2>Catálogos</h2>
          <button 
            onClick={() => navigate('/crear-presupuesto')} 
            className="btn-create"
          >
            Generar Presupuesto
          </button>
        </div>

        <div className="catalogs-container">
          <div className="catalog-section">
            <div className="catalog-header">
              <FaMapLocationDot className="catalog-icon" />
              <h3>Catálogo de Rutas</h3>
            </div>
            <div className="catalog-items">
              {getPreloadedRoutes().map((route) => (
                <div key={route.id} className="route-item">
                  <div className="route-info">
                    <p className="route-label">{route.label}</p>
                    <div className="route-details">
                      <span>{route.distanceKm} km</span>
                      <span>Peaje: ${route.tollOneWay}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="catalog-section">
            <div className="catalog-header">
              <FaCar className="catalog-icon" />
              <h3>Catálogo de Unidades</h3>
            </div>
            <div className="catalog-items">
              {Object.entries(TRANSPORT_CONFIG).map(([key, transport]) => (
                <div key={key} className="transport-item">
                  <div className="transport-info">
                    <p className="transport-label">{transport.label}</p>
                    <div className="transport-details">
                      <span>Cap: {transport.capacity} pas</span>
                      <span>Comb: ${transport.defaultFuelPrice}/L</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="catalog-section">
            <div className="catalog-header">
              <FaRoad className="catalog-icon" />
              <h3>Catálogo de Casetas</h3>
            </div>
            <div className="catalog-items">
              <p className="catalog-info">Los peajes varían según la ruta seleccionada. Consulta el catálogo de rutas para ver los peajes específicos.</p>
              <div className="toll-multipliers">
                <h4>Multiplicadores por tipo de transporte:</h4>
                {Object.entries(TOLL_MULTIPLIER).map(([key, multiplier]) => (
                  <div key={key} className="multiplier-item">
                    <span>{TRANSPORT_CONFIG[key].label}</span>
                    <span className="multiplier-value">{multiplier}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="catalog-section">
            <div className="catalog-header">
              <FaGasPump className="catalog-icon" />
              <h3>Catálogo de Precios de Combustible</h3>
            </div>
            <div className="catalog-items">
              {Object.entries(TRANSPORT_CONFIG).map(([key, transport]) => (
                <div key={key} className="fuel-item">
                  <div className="fuel-info">
                    <p className="fuel-label">{transport.label}</p>
                    <p className="fuel-price">${transport.defaultFuelPrice} por litro</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="header-section">
          <h2>Mis Presupuestos de Viajes</h2>
        </div>

        {content}
      </div>
    </div>
  );
};

export default Dashboard;
