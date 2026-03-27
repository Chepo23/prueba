import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

export const generateBudgetPDF = async (budget) => {
  try {
    // Crear contenedor temporal
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '900px';
    container.style.backgroundColor = 'white';
    container.style.padding = '15px 20px';
    container.style.lineHeight = '1.2';
    container.style.fontSize = '13px';
    container.style.fontFamily = 'Arial, sans-serif';

    // Calcular porcentajes
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

    container.innerHTML = `
      <div style="text-align: center; padding-bottom: 10px; margin-bottom: 12px;">
        <h2 style="margin: 0 0 4px 0; color: #333; font-size: 22px; font-weight: 700;">
          ${budget.tripName || budget.destination}
        </h2>
      </div>

      <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
        <h3 style="color: #333; font-size: 14px; margin: 0 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #667eea; font-weight: 600;">
          Información del Viaje
        </h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; row-gap: 6px;">
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px;">
            <span style="font-weight: 600; color: #666; min-width: 120px;">Destino/Ruta:</span>
            <span style="color: #333; text-align: right; flex: 1;">${budget.destination || budget.outboundRouteLabel || 'Sin especificar'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px;">
            <span style="font-weight: 600; color: #666; min-width: 120px;">Distancia:</span>
            <span style="color: #333; text-align: right; flex: 1;">${budget.routeDistanceKm || 0} km</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px;">
            <span style="font-weight: 600; color: #666; min-width: 120px;">Fecha de Salida:</span>
            <span style="color: #333; text-align: right; flex: 1;">${formatDate(budget.departureDateTime)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px;">
            <span style="font-weight: 600; color: #666; min-width: 120px;">Fecha de Retorno:</span>
            <span style="color: #333; text-align: right; flex: 1;">${formatDate(budget.returnDateTime)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px;">
            <span style="font-weight: 600; color: #666; min-width: 120px;">Transporte:</span>
            <span style="color: #333; text-align: right; flex: 1;">${getTransportLabel(budget.transportType)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px;">
            <span style="font-weight: 600; color: #666; min-width: 120px;">Pasajeros:</span>
            <span style="color: #333; text-align: right; flex: 1;">${budget.passengers}</span>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
        <h3 style="color: #333; font-size: 14px; margin: 0 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #667eea; font-weight: 600;">
          Desglose de Costos
        </h3>
        <div style="background: #f8f9ff; padding: 8px 10px; border-radius: 6px; border-left: 3px solid #667eea;">
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(102, 126, 234, 0.1); color: #666; font-size: 12px;">
            <span>Transporte:</span>
            <span style="font-weight: 600; color: #333;">${formatCurrency(budget.transportCost)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(102, 126, 234, 0.1); color: #666; font-size: 12px;">
            <span>Hospedaje:</span>
            <span style="font-weight: 600; color: #333;">${formatCurrency(budget.hotelCost)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(102, 126, 234, 0.1); color: #666; font-size: 12px;">
            <span>Comida:</span>
            <span style="font-weight: 600; color: #333;">${formatCurrency(budget.foodCost)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(102, 126, 234, 0.1); color: #666; font-size: 12px;">
            <span>Actividades:</span>
            <span style="font-weight: 600; color: #333;">${formatCurrency(budget.activitiesCost)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(102, 126, 234, 0.1); color: #666; font-size: 12px;">
            <span>Contingencia:</span>
            <span style="font-weight: 600; color: #333;">${formatCurrency(budget.contingencyCost)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 10px; margin: 4px -10px -8px -10px; border-radius: 0; font-size: 13px; font-weight: 700; border-top: 1px solid #667eea; padding-left: 10px; padding-right: 10px; background: white;">
            <span>Presupuesto Total:</span>
            <span style="color: #667eea; font-size: 14px;">${formatCurrency(budget.totalBudget)}</span>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
        <h3 style="color: #333; font-size: 14px; margin: 0 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #667eea; font-weight: 600;">
          Análisis del Presupuesto
        </h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: grid; grid-template-columns: 90px 1fr 50px; gap: 10px; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 600; color: #666; font-size: 12px;">Transporte:</span>
            <div style="background: #f0f0f0; border-radius: 4px; height: 16px; overflow: hidden; border: 1px solid #e0e0e0;">
              <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; width: ${breakdown.transportPercent}%; border-radius: 4px; transition: width 0.3s ease;"></div>
            </div>
            <span style="text-align: right; font-weight: 600; color: #333; min-width: 40px; font-size: 12px;">${breakdown.transportPercent.toFixed(1)}%</span>
          </div>
          <div style="display: grid; grid-template-columns: 90px 1fr 50px; gap: 10px; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 600; color: #666; font-size: 12px;">Hospedaje:</span>
            <div style="background: #f0f0f0; border-radius: 4px; height: 16px; overflow: hidden; border: 1px solid #e0e0e0;">
              <div style="background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%); height: 100%; width: ${breakdown.hotelPercent}%; border-radius: 4px;"></div>
            </div>
            <span style="text-align: right; font-weight: 600; color: #333; min-width: 40px; font-size: 12px;">${breakdown.hotelPercent.toFixed(1)}%</span>
          </div>
          <div style="display: grid; grid-template-columns: 90px 1fr 50px; gap: 10px; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 600; color: #666; font-size: 12px;">Comida:</span>
            <div style="background: #f0f0f0; border-radius: 4px; height: 16px; overflow: hidden; border: 1px solid #e0e0e0;">
              <div style="background: linear-gradient(90deg, #4cd964 0%, #00c853 100%); height: 100%; width: ${breakdown.foodPercent}%; border-radius: 4px;"></div>
            </div>
            <span style="text-align: right; font-weight: 600; color: #333; min-width: 40px; font-size: 12px;">${breakdown.foodPercent.toFixed(1)}%</span>
          </div>
          <div style="display: grid; grid-template-columns: 90px 1fr 50px; gap: 10px; align-items: center;">
            <span style="font-weight: 600; color: #666; font-size: 12px;">Actividades:</span>
            <div style="background: #f0f0f0; border-radius: 4px; height: 16px; overflow: hidden; border: 1px solid #e0e0e0;">
              <div style="background: linear-gradient(90deg, #ffa500 0%, #ffb347 100%); height: 100%; width: ${breakdown.activitiesPercent}%; border-radius: 4px;"></div>
            </div>
            <span style="text-align: right; font-weight: 600; color: #333; min-width: 40px; font-size: 12px;">${breakdown.activitiesPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
        <h3 style="color: #333; font-size: 14px; margin: 0 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #667eea; font-weight: 600;">
          Distribución por Categoría
        </h3>
        <div style="background: #f8f9ff; padding: 6px 8px; border-radius: 4px; border-left: 3px solid #667eea;">
          <div style="padding: 2px 0; color: #666; font-size: 11px; line-height: 1.3;">
            <span style="font-weight: 500;">Transporte: ${breakdown.transportPercent.toFixed(1)}%</span>
          </div>
          <div style="padding: 2px 0; color: #666; font-size: 11px; line-height: 1.3;">
            <span style="font-weight: 500;">Hospedaje: ${breakdown.hotelPercent.toFixed(1)}%</span>
          </div>
          <div style="padding: 2px 0; color: #666; font-size: 11px; line-height: 1.3;">
            <span style="font-weight: 500;">Comida: ${breakdown.foodPercent.toFixed(1)}%</span>
          </div>
          <div style="padding: 2px 0; color: #666; font-size: 11px; line-height: 1.3;">
            <span style="font-weight: 500;">Actividades: ${breakdown.activitiesPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      ${budget.notes ? `
      <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
        <h3 style="color: #333; font-size: 14px; margin: 0 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #667eea; font-weight: 600;">
          Notas Adicionales
        </h3>
        <p style="background: #f8f9ff; padding: 8px; border-radius: 4px; border-left: 3px solid #667eea; color: #666; line-height: 1.3; margin: 0; font-size: 12px;">
          ${budget.notes}
        </p>
      </div>
      ` : ''}

      <div style="text-align: center; margin-top: 8px; padding-top: 6px; border-top: 1px solid #f0f0f0; color: #999; font-size: 9px;">
        <p>Reporte generado el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    `;

    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: 900,
    });

    container.remove();

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

    const imgHeightTotal = (canvasHeight * contentWidth) / canvasWidth;

    if (imgHeightTotal <= pageHeight - 2 * margin) {
      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeightTotal);
    } else {
      let heightRemaining = imgHeightTotal;
      let yOffset = 0;
      let pageNum = 1;

      while (heightRemaining > 0) {
        const canvasHeightForThisPage = Math.min(
          (pageHeight - 2 * margin) * (canvasHeight / imgHeightTotal),
          canvasHeight - yOffset
        );

        const sourceY = yOffset;
        const sourceHeight = canvasHeightForThisPage;

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
              0,
              sourceY,
              canvasWidth,
              sourceHeight,
              0,
              0,
              canvasWidth,
              sourceHeight
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
    throw error;
  }
};
