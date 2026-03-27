import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getBudgetById } from '../services/budgetService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './Reports.css';

const TRANSPORT_CONFIG = {
  automovil: { label: 'Automóvil', capacity: 4, defaultFuelPrice: 24.5 },
  pickups: { label: 'Pick Ups', capacity: 5, defaultFuelPrice: 23.5 },
  motocicleta: { label: 'Motocicleta', capacity: 1, defaultFuelPrice: 20 },
  camioneta: { label: 'Camioneta', capacity: 8, defaultFuelPrice: 23 },
  automovil_remolque: { label: 'Automóvil con Remolque 1 Eje', capacity: 6, defaultFuelPrice: 25.5 }
};

const formatDate = (dateString) => {
  if (!dateString) return 'No especificada';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
};

const getTransportLabel = (transportType) => {
  return TRANSPORT_CONFIG[transportType]?.label || transportType;
};

const formatCurrency = (value) => {
  const num = Number.parseFloat(value || 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const Reports = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    const loadBudget = async () => {
      if (!user?.uid || !id) {
        setError('No se encontró la información requerida');
        return;
      }

      try {
        setLoading(true);
        const budgetData = await getBudgetById(id, user.uid);
        if (budgetData) {
          setBudget(budgetData);
        } else {
          setError('No se encontró el presupuesto');
        }
      } catch (err) {
        console.error('Error cargando presupuesto:', err);
        setError('Error al cargar el presupuesto: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBudget();
  }, [id, user?.uid]);

  const generatePDF = async () => {
    if (!reportRef.current) return;

    try {
      setGeneratingPDF(true);
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pageWidth - 2 * margin;
      
      const imgData = canvas.toDataURL('image/png');
      const canvasHeight = canvas.height;
      const canvasWidth = canvas.width;
      
      // Calcular la altura de la imagen en mm basada en el ancho de la página
      const imgHeightTotal = (canvasHeight * contentWidth) / canvasWidth;
      
      // Si el contenido cabe en una página, agregarlo directamente
      if (imgHeightTotal <= pageHeight - 2 * margin) {
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeightTotal);
      } else {
        // Si no cabe, generar múltiples páginas
        let heightRemaining = imgHeightTotal;
        let yOffset = 0;
        let pageNum = 1;

        while (heightRemaining > 0) {
          const canvasHeightForThisPage = Math.min(
            (pageHeight - 2 * margin) * (canvasHeight / imgHeightTotal),
            canvasHeight - yOffset
          );

          // Calcular la región de la imagen a capturar
          const sourceY = yOffset;
          const sourceHeight = canvasHeightForThisPage;

          // Crear un canvas temporal para esta página
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvasWidth;
          tempCanvas.height = Math.ceil(sourceHeight);

          const ctx = tempCanvas.getContext('2d');
          const imgElement = new Image();
          imgElement.src = imgData;

          await new Promise((resolve) => {
            imgElement.onload = () => {
              ctx.drawImage(
                imgElement,
                0, // sx
                sourceY, // sy
                canvasWidth, // sWidth
                sourceHeight, // sHeight
                0, // dx
                0, // dy
                canvasWidth, // dWidth
                sourceHeight // dHeight
              );
              resolve();
            };
          });

          const pageImgData = tempCanvas.toDataURL('image/png');
          const pageHeight2 = (sourceHeight * contentWidth) / canvasWidth;

          if (pageNum > 1) {
            pdf.addPage();
          }

          pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidth, pageHeight2);

          heightRemaining -= pageHeight2;
          yOffset += sourceHeight;
          pageNum++;
        }
      }

      const filename = `Reporte_Viaje_${budget.destination || budget.tripName}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF: ' + error.message);
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return <div className="reports-container"><div className="loading">Cargando presupuesto...</div></div>;
  }

  if (error) {
    return (
      <div className="reports-container">
        <div className="error-state">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-back">Volver al Dashboard</button>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="reports-container">
        <div className="error-state">
          <h3>Presupuesto no encontrado</h3>
          <button onClick={() => navigate('/dashboard')} className="btn-back">Volver al Dashboard</button>
        </div>
      </div>
    );
  }

  // Calcular porcentajes si no están disponibles
  const tempTransport = Number.parseFloat(budget.transportCost || 0);
  const tempHotel = Number.parseFloat(budget.hotelCost || 0);
  const tempFood = Number.parseFloat(budget.foodCost || 0);
  const tempActivities = Number.parseFloat(budget.activitiesCost || 0);
  const tempBase = tempTransport + tempHotel + tempFood + tempActivities;

  const getPercent = (value) => (tempBase > 0 ? ((value / tempBase) * 100).toFixed(1) : '0.0');

  const breakdown = {
    transportPercent: budget.breakdown?.transportPercent || Number.parseFloat(getPercent(tempTransport)),
    hotelPercent: budget.breakdown?.hotelPercent || Number.parseFloat(getPercent(tempHotel)),
    foodPercent: budget.breakdown?.foodPercent || Number.parseFloat(getPercent(tempFood)),
    activitiesPercent: budget.breakdown?.activitiesPercent || Number.parseFloat(getPercent(tempActivities))
  };

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>Reporte del Viaje</h1>
        <div className="header-actions">
          <button onClick={generatePDF} disabled={generatingPDF} className="btn-download-pdf">
            {generatingPDF ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-back">Volver</button>
        </div>
      </div>

      <div ref={reportRef} className="report-content">
        <div className="report-section title-section">
          <h2>{budget.tripName || budget.destination}</h2>
        </div>

        <div className="report-section">
          <h3>Información del Viaje</h3>
          <div className="report-grid">
            <div className="report-item">
              <span className="report-label">Destino/Ruta:</span>
              <span className="report-value">{budget.destination || budget.outboundRouteLabel || 'Sin especificar'}</span>
            </div>
            <div className="report-item">
              <span className="report-label">Distancia:</span>
              <span className="report-value">{budget.routeDistanceKm || 0} km</span>
            </div>
            <div className="report-item">
              <span className="report-label">Fecha de Salida:</span>
              <span className="report-value">{formatDate(budget.departureDateTime)}</span>
            </div>
            <div className="report-item">
              <span className="report-label">Fecha de Retorno:</span>
              <span className="report-value">{formatDate(budget.returnDateTime)}</span>
            </div>
            <div className="report-item">
              <span className="report-label">Tipo de Transporte:</span>
              <span className="report-value">{getTransportLabel(budget.transportType)}</span>
            </div>
            <div className="report-item">
              <span className="report-label">Número de Pasajeros:</span>
              <span className="report-value">{budget.passengers}</span>
            </div>
          </div>
        </div>

        <div className="report-section">
          <h3>Desglose de Costos</h3>
          <div className="report-costs">
            <div className="cost-row">
              <span>Transporte:</span>
              <span className="cost-amount">{formatCurrency(budget.transportCost)}</span>
            </div>
            <div className="cost-row">
              <span>Hospedaje:</span>
              <span className="cost-amount">{formatCurrency(budget.hotelCost)}</span>
            </div>
            <div className="cost-row">
              <span>Comida:</span>
              <span className="cost-amount">{formatCurrency(budget.foodCost)}</span>
            </div>
            <div className="cost-row">
              <span>Actividades:</span>
              <span className="cost-amount">{formatCurrency(budget.activitiesCost)}</span>
            </div>
            <div className="cost-row">
              <span>Contingencia:</span>
              <span className="cost-amount">{formatCurrency(budget.contingencyCost)}</span>
            </div>
            <div className="cost-row total-row">
              <span>Presupuesto Total:</span>
              <span className="cost-amount">{formatCurrency(budget.totalBudget)}</span>
            </div>
          </div>
        </div>

        <div className="report-section">
          <h3>Análisis del Presupuesto</h3>
          <div className="report-breakdown">
            <div className="breakdown-item">
              <span>Transporte:</span>
              <div className="breakdown-bar">
                <div className="breakdown-fill transport-fill" style={{ width: breakdown.transportPercent + '%' }}></div>
              </div>
              <span className="breakdown-percentage">{breakdown.transportPercent.toFixed(1)}%</span>
            </div>
            <div className="breakdown-item">
              <span>Hospedaje:</span>
              <div className="breakdown-bar">
                <div className="breakdown-fill hotel-fill" style={{ width: breakdown.hotelPercent + '%' }}></div>
              </div>
              <span className="breakdown-percentage">{breakdown.hotelPercent.toFixed(1)}%</span>
            </div>
            <div className="breakdown-item">
              <span>Comida:</span>
              <div className="breakdown-bar">
                <div className="breakdown-fill food-fill" style={{ width: breakdown.foodPercent + '%' }}></div>
              </div>
              <span className="breakdown-percentage">{breakdown.foodPercent.toFixed(1)}%</span>
            </div>
            <div className="breakdown-item">
              <span>Actividades:</span>
              <div className="breakdown-bar">
                <div className="breakdown-fill activities-fill" style={{ width: breakdown.activitiesPercent + '%' }}></div>
              </div>
              <span className="breakdown-percentage">{breakdown.activitiesPercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="report-section">
          <h3>Distribución por Categoría</h3>
          <div className="category-summary">
            <div className="category-line">
              <span>Transporte: {breakdown.transportPercent.toFixed(1)}%</span>
            </div>
            <div className="category-line">
              <span>Hospedaje: {breakdown.hotelPercent.toFixed(1)}%</span>
            </div>
            <div className="category-line">
              <span>Comida: {breakdown.foodPercent.toFixed(1)}%</span>
            </div>
            <div className="category-line">
              <span>Actividades: {breakdown.activitiesPercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {budget.notes && (
          <div className="report-section">
            <h3>Notas Adicionales</h3>
            <p className="report-notes">{budget.notes}</p>
          </div>
        )}

        <div className="report-footer">
          <p>Reporte generado el {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
