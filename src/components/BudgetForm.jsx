import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { createBudget, updateBudget, getUserBudgets } from '../services/budgetService';
import { getPreloadedRoutes } from '../services/locationService';
import { TRANSPORT_CONFIG, TOLL_MULTIPLIER } from '../constants/transport';
import { formatCurrency } from '../utils/formatters';
import './BudgetForm.css';

const MAX_PASSENGERS = 100;
const MAX_COST = 10000000;
const MAX_TRIP_NAME_LENGTH = 80;
const MAX_NOTES_LENGTH = 500;
const MAX_TRIP_DAYS = 365;
const DEFAULT_CONTINGENCY_PERCENT = 10;
const MAX_CONTINGENCY_PERCENT = 50;
const MAX_FUEL_PRICE = 200;
const MINIMUM_WAGE_DAILY_MXN = 278.8;
const DRIVER_PER_DIEM_FACTOR = 6;

const ROUND_TRIP = 'roundTrip';

const COST_FIELDS = new Set(['hotelCost', 'foodCost', 'activitiesCost']);
const INTEGER_RULES = {
  passengers: { min: 1, max: MAX_PASSENGERS },
  quantity: { min: 1, max: MAX_PASSENGERS },
  contingencyPercent: { min: 0, max: MAX_CONTINGENCY_PERCENT }
};
const COST_INPUT_CONFIG = [
  { id: 'hotelCost', label: 'Precio por Noche ($)' },
  { id: 'foodCost', label: 'Costo de Comida ($)' },
  { id: 'activitiesCost', label: 'Costo de Actividades ($)' }
];

const DATETIME_FIELDS = new Set(['departureDateTime', 'returnDateTime']);

const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeIntegerInput = (rawValue, min, max) => {
  if (rawValue === '') {
    return '';
  }

  if (!/^\d+$/.test(rawValue)) {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return String(clampValue(parsed, min, max));
};

const normalizeCurrencyInput = (rawValue) => {
  if (rawValue === '') {
    return '';
  }

  if (!/^\d*(\.\d{0,2})?$/.test(rawValue)) {
    return null;
  }

  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return String(clampValue(parsed, 0, MAX_COST));
};

const parseCurrency = (value) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return clampValue(parsed, 0, MAX_COST);
};

const parseSafeInteger = (value, min, max, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clampValue(parsed, min, max);
};

const roundCurrency = (value) => Number((value || 0).toFixed(2));

const getTransportMeta = (transportType) => TRANSPORT_CONFIG[transportType] || TRANSPORT_CONFIG.automovil;

const getRouteById = (routes, routeId) => routes.find((route) => route.id === routeId);

const getTripDays = (departureDateTime, returnDateTime) => {
  if (!departureDateTime || !returnDateTime) {
    return 1;
  }

  const start = new Date(departureDateTime);
  const end = new Date(returnDateTime);
  const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  if (!Number.isFinite(diffDays) || diffDays < 1) {
    return 1;
  }

  return diffDays;
};

const calculateBudgetSummary = (formData) => {
  const routeCatalog = formData.routeCatalog || [];
  const outboundRoute = getRouteById(routeCatalog, formData.routeOutboundId);
  const returnRoute = getRouteById(routeCatalog, formData.routeReturnId);
  const isRoundTrip = formData.tripType === ROUND_TRIP;

  const tripDays = getTripDays(formData.departureDateTime, formData.returnDateTime);

  const hotelPricePerNight = parseCurrency(formData.hotelCost);
  const hotel = hotelPricePerNight * tripDays;
  const food = parseCurrency(formData.foodCost);
  const activities = parseCurrency(formData.activitiesCost);
  const transportMeta = getTransportMeta(formData.transportType);
  const passengers = parseSafeInteger(formData.passengers, 1, MAX_PASSENGERS, 1);
  const unitsRequired = Math.max(1, Math.ceil(passengers / transportMeta.capacity));
  const fuelPricePerLiter = parseCurrency(formData.fuelPricePerLiter || transportMeta.defaultFuelPrice);

  const outboundDistance = outboundRoute?.distanceKm || 0;
  const returnDistance = isRoundTrip ? (returnRoute?.distanceKm || outboundDistance) : 0;
  const totalDistanceKm = outboundDistance + returnDistance;

  const outboundTolls = outboundRoute?.tollOneWay || 0;
  const returnTolls = isRoundTrip ? (returnRoute?.tollOneWay || outboundTolls) : 0;
  const tollMultiplier = TOLL_MULTIPLIER[formData.transportType] || 1;
  const totalTolls = (outboundTolls + returnTolls) * unitsRequired * tollMultiplier;

  const fuelLiters = (totalDistanceKm / 3) * unitsRequired;
  const fuelCost = fuelLiters * fuelPricePerLiter;
  const perDiemCost = tripDays * DRIVER_PER_DIEM_FACTOR * MINIMUM_WAGE_DAILY_MXN * unitsRequired;

  const routeOperationalSubtotal = fuelCost + totalTolls + perDiemCost;
  const transport = routeOperationalSubtotal;

  const baseTotal = transport + hotel + food + activities;
  const contingencyPercent = parseSafeInteger(
    formData.contingencyPercent,
    0,
    MAX_CONTINGENCY_PERCENT,
    DEFAULT_CONTINGENCY_PERCENT
  );

  const contingencyAmount = (baseTotal * contingencyPercent) / 100;
  const recommendedTotal = baseTotal + contingencyAmount;

  const dailyBaseBudget = baseTotal / tripDays;
  const dailyRecommendedBudget = recommendedTotal / tripDays;
  const perPersonBaseBudget = baseTotal / passengers;
  const perPersonRecommendedBudget = recommendedTotal / passengers;
  const perPersonPerDayRecommended = recommendedTotal / (passengers * tripDays);

  const percent = (value) => (baseTotal > 0 ? (value / baseTotal) * 100 : 0);

  return {
    transport: roundCurrency(transport),
    hotel: roundCurrency(hotel),
    food: roundCurrency(food),
    activities: roundCurrency(activities),
    fuelPricePerLiter: roundCurrency(fuelPricePerLiter),
    fuelCost: roundCurrency(fuelCost),
    fuelLiters: roundCurrency(fuelLiters),
    tollCost: roundCurrency(totalTolls),
    perDiemCost: roundCurrency(perDiemCost),
    routeOperationalSubtotal: roundCurrency(routeOperationalSubtotal),
    unitsRequired,
    totalDistanceKm: roundCurrency(totalDistanceKm),
    outboundRouteLabel: outboundRoute?.label || '',
    returnRouteLabel: returnRoute?.label || '',
    isRoundTrip,
    baseTotal: roundCurrency(baseTotal),
    passengers,
    contingencyPercent,
    contingencyAmount: roundCurrency(contingencyAmount),
    recommendedTotal: roundCurrency(recommendedTotal),
    tripDays,
    dailyBaseBudget: roundCurrency(dailyBaseBudget),
    dailyRecommendedBudget: roundCurrency(dailyRecommendedBudget),
    perPersonBaseBudget: roundCurrency(perPersonBaseBudget),
    perPersonRecommendedBudget: roundCurrency(perPersonRecommendedBudget),
    perPersonPerDayRecommended: roundCurrency(perPersonPerDayRecommended),
    breakdown: {
      transportPercent: roundCurrency(percent(transport)),
      hotelPercent: roundCurrency(percent(hotel)),
      foodPercent: roundCurrency(percent(food)),
      activitiesPercent: roundCurrency(percent(activities))
    }
  };
};

const validateTripNameField = (value) => {
  const name = String(value || '').trim();
  if (!name) {
    return 'El nombre del viaje es obligatorio.';
  }
  if (name.length < 2) {
    return 'El nombre debe tener al menos 2 caracteres.';
  }
  return '';
};

const validateTripTypeField = (value) => {
  if (!value) {
    return 'Selecciona el tipo de viaje.';
  }

  return '';
};

const validateRouteField = (fieldName, formData) => {
  if (fieldName === 'routeOutboundId' && !formData.routeOutboundId) {
    return 'Selecciona la ruta de ida.';
  }

  if (fieldName === 'routeReturnId' && formData.tripType === ROUND_TRIP && !formData.routeReturnId) {
    return 'Selecciona la ruta de regreso.';
  }

  return '';
};

const validateDateTimeField = (fieldName, formData) => {
  const departureDateTime = formData.departureDateTime;
  const returnDateTime = formData.returnDateTime;

  if (fieldName === 'departureDateTime' && !departureDateTime) {
    return 'Selecciona la fecha y hora de partida.';
  }

  if (fieldName === 'returnDateTime' && formData.tripType === ROUND_TRIP && !returnDateTime) {
    return 'Selecciona la fecha y hora de regreso.';
  }

  if (!departureDateTime || !returnDateTime || formData.tripType !== ROUND_TRIP) {
    return '';
  }

  const departure = new Date(departureDateTime);
  const comeback = new Date(returnDateTime);

  if (comeback < departure) {
    return fieldName === 'departureDateTime'
      ? 'La salida no puede ser posterior al regreso.'
      : 'El regreso no puede ser anterior a la salida.';
  }

  return '';
};

const validatePassengersField = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return 'La cantidad de pasajeros es obligatoria.';
  }
  if (parsed < 1 || parsed > MAX_PASSENGERS) {
    return `La cantidad de pasajeros debe estar entre 1 y ${MAX_PASSENGERS}.`;
  }
  return '';
};

const validateContingencyField = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return 'La contingencia es obligatoria.';
  }
  if (parsed < 0 || parsed > MAX_CONTINGENCY_PERCENT) {
    return `La contingencia debe estar entre 0% y ${MAX_CONTINGENCY_PERCENT}%.`;
  }
  return '';
};

const validateFuelPriceField = (value) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return 'El precio de combustible es obligatorio.';
  }

  if (parsed <= 0 || parsed > MAX_FUEL_PRICE) {
    return `El precio por litro debe estar entre 0.01 y ${MAX_FUEL_PRICE}.`;
  }

  return '';
};

const validateCostField = (value) => {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  // Limpia caracteres de formato ($ y comas) para validar el número puro
  const cleaned = String(value).replace(/[^\d.]/g, '');
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) {
    return 'Ingresa un valor numerico valido.';
  }
  if (parsed < 0 || parsed > MAX_COST) {
    return `El valor debe estar entre 0 y ${MAX_COST.toLocaleString('es-CO')}.`;
  }
  return '';
};

const validateNotesField = (value) => {
  if (String(value || '').length > MAX_NOTES_LENGTH) {
    return `Las notas no pueden superar ${MAX_NOTES_LENGTH} caracteres.`;
  }
  return '';
};

const validateBudgetField = (fieldName, fieldValue, formData) => {
  if (fieldName === 'tripType') {
    return validateTripTypeField(fieldValue);
  }

  if (fieldName === 'tripName') {
    return validateTripNameField(fieldValue);
  }

  if (fieldName === 'routeOutboundId' || fieldName === 'routeReturnId') {
    return validateRouteField(fieldName, formData);
  }

  if (DATETIME_FIELDS.has(fieldName)) {
    return validateDateTimeField(fieldName, formData);
  }

  if (fieldName === 'passengers') {
    return validatePassengersField(fieldValue);
  }

  if (fieldName === 'contingencyPercent') {
    return validateContingencyField(fieldValue);
  }

  if (fieldName === 'fuelPricePerLiter') {
    return validateFuelPriceField(fieldValue);
  }

  if (COST_FIELDS.has(fieldName)) {
    return validateCostField(fieldValue);
  }

  if (fieldName === 'notes') {
    return validateNotesField(fieldValue);
  }

  return '';
};

const validateSubmitData = (formData) => {
  const tripTypeError = validateTripTypeField(formData.tripType);
  if (tripTypeError) {
    return tripTypeError;
  }

  const tripNameError = validateTripNameField(formData.tripName);
  if (tripNameError) {
    return tripNameError;
  }

  const routeOutboundError = validateRouteField('routeOutboundId', formData);
  if (routeOutboundError) {
    return routeOutboundError;
  }

  const routeReturnError = validateRouteField('routeReturnId', formData);
  if (routeReturnError) {
    return routeReturnError;
  }

  const departureDateTimeError = validateDateTimeField('departureDateTime', formData);
  if (departureDateTimeError) {
    return departureDateTimeError;
  }

  const returnDateTimeError = validateDateTimeField('returnDateTime', formData);
  if (returnDateTimeError) {
    return returnDateTimeError;
  }

  const passengersError = validatePassengersField(formData.passengers);
  if (passengersError) {
    return passengersError;
  }

  const contingencyError = validateContingencyField(formData.contingencyPercent);
  if (contingencyError) {
    return contingencyError;
  }

  const fuelPriceError = validateFuelPriceField(formData.fuelPricePerLiter);
  if (fuelPriceError) {
    return fuelPriceError;
  }

  return '';
};

const getFieldClassName = (fieldErrors, fieldName) => {
  if (fieldErrors[fieldName]) {
    return 'input-invalid';
  }

  return '';
};

const getFieldA11yProps = (fieldErrors, fieldName, errorId) => {
  const hasError = Boolean(fieldErrors[fieldName]);

  return {
    'aria-invalid': hasError,
    'aria-describedby': hasError ? errorId : undefined
  };
};

const renderFieldError = (fieldErrors, fieldName, errorId) => {
  const message = fieldErrors[fieldName];
  if (!message) {
    return null;
  }

  return (
    <small id={errorId} className="field-error">{message}</small>
  );
};

const budgetFormDataPropType = PropTypes.shape({
  tripType: PropTypes.string,
  routeOutboundId: PropTypes.string,
  routeReturnId: PropTypes.string,
  departureDateTime: PropTypes.string,
  returnDateTime: PropTypes.string,
  tripName: PropTypes.string,
  transportType: PropTypes.string,
  fuelPricePerLiter: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  quantity: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  passengers: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  hotelCost: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  foodCost: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  activitiesCost: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  contingencyPercent: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  totalBudget: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  notes: PropTypes.string
}).isRequired;

const fieldErrorsPropType = PropTypes.objectOf(PropTypes.string).isRequired;

const TravelInfoSection = ({
  formData,
  fieldErrors,
  handleChange,
  handleBlur,
  routeOptions,
  returnRouteOptions,
  summary
}) => {
  const selectedOutboundRoute = routeOptions.find((route) => route.id === formData.routeOutboundId);
  const selectedReturnRoute = routeOptions.find((route) => route.id === formData.routeReturnId);
  const isRoundTrip = formData.tripType === ROUND_TRIP;

  return (
    <div className="form-section">
      <h3>Información del Viaje</h3>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="tripType">Tipo de Viaje</label>
          <select
            className={getFieldClassName(fieldErrors, 'tripType')}
            id="tripType"
            name="tripType"
            value={formData.tripType}
            onChange={handleChange}
            onBlur={handleBlur}
            {...getFieldA11yProps(fieldErrors, 'tripType', 'tripType-error')}
            required
          >
            <option value="oneWay">Una dirección</option>
            <option value={ROUND_TRIP}>Viaje redondo</option>
          </select>
          {renderFieldError(fieldErrors, 'tripType', 'tripType-error')}
        </div>

        <div className="form-group">
          <label htmlFor="transportType">Tipo de Transporte</label>
          <select
            id="transportType"
            name="transportType"
            value={formData.transportType}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="automovil">Automóvil</option>
            <option value="pickups">Pick Ups</option>
            <option value="motocicleta">Motocicleta</option>
            <option value="camioneta">Camioneta</option>
            <option value="automovil_remolque">Automóvil con Remolque 1 Eje</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="tripName">Nombre del Viaje</label>
        <input
          className={getFieldClassName(fieldErrors, 'tripName')}
          id="tripName"
          type="text"
          name="tripName"
          value={formData.tripName}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={MAX_TRIP_NAME_LENGTH}
          placeholder="Ej. Viaje Convención 2026"
          {...getFieldA11yProps(fieldErrors, 'tripName', 'tripName-error')}
          required
        />
        {renderFieldError(fieldErrors, 'tripName', 'tripName-error')}
        <small className="input-help">Máximo {MAX_TRIP_NAME_LENGTH} caracteres.</small>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="routeOutboundId">Ruta de Ida</label>
          <select
            className={getFieldClassName(fieldErrors, 'routeOutboundId')}
            id="routeOutboundId"
            name="routeOutboundId"
            value={formData.routeOutboundId}
            onChange={handleChange}
            onBlur={handleBlur}
            {...getFieldA11yProps(fieldErrors, 'routeOutboundId', 'routeOutboundId-error')}
            required
          >
            <option value="">Selecciona una ruta</option>
            {routeOptions.map((route) => (
              <option key={route.id} value={route.id}>{route.label}</option>
            ))}
          </select>
          {renderFieldError(fieldErrors, 'routeOutboundId', 'routeOutboundId-error')}
          {selectedOutboundRoute && (
            <small className="input-help">{selectedOutboundRoute.distanceKm} km | Peajes: {formatCurrency(selectedOutboundRoute.tollOneWay * TOLL_MULTIPLIER[formData.transportType])}</small>
          )}
        </div>

        {isRoundTrip && (
          <div className="form-group">
            <label htmlFor="routeReturnId">Ruta de Regreso</label>
            <select
              className={getFieldClassName(fieldErrors, 'routeReturnId')}
              id="routeReturnId"
              name="routeReturnId"
              value={formData.routeReturnId}
              onChange={handleChange}
              onBlur={handleBlur}
              {...getFieldA11yProps(fieldErrors, 'routeReturnId', 'routeReturnId-error')}
              required
            >
              <option value="">Selecciona una ruta</option>
              {returnRouteOptions.map((route) => (
                <option key={route.id} value={route.id}>{route.label}</option>
              ))}
            </select>
            {renderFieldError(fieldErrors, 'routeReturnId', 'routeReturnId-error')}
            {selectedReturnRoute && (
              <small className="input-help">{selectedReturnRoute.distanceKm} km | Peajes: {formatCurrency(selectedReturnRoute.tollOneWay * TOLL_MULTIPLIER[formData.transportType])}</small>
            )}
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="departureDateTime">Fecha y Hora de Partida</label>
          <input
            className={getFieldClassName(fieldErrors, 'departureDateTime')}
            id="departureDateTime"
            type="datetime-local"
            name="departureDateTime"
            value={formData.departureDateTime}
            onChange={handleChange}
            onBlur={handleBlur}
            {...getFieldA11yProps(fieldErrors, 'departureDateTime', 'departureDateTime-error')}
            required
          />
          {renderFieldError(fieldErrors, 'departureDateTime', 'departureDateTime-error')}
        </div>

        {isRoundTrip && (
          <div className="form-group">
            <label htmlFor="returnDateTime">Fecha y Hora de Regreso</label>
            <input
              className={getFieldClassName(fieldErrors, 'returnDateTime')}
              id="returnDateTime"
              type="datetime-local"
              name="returnDateTime"
              value={formData.returnDateTime}
              onChange={handleChange}
              onBlur={handleBlur}
              min={formData.departureDateTime || undefined}
              {...getFieldA11yProps(fieldErrors, 'returnDateTime', 'returnDateTime-error')}
              required
            />
            {renderFieldError(fieldErrors, 'returnDateTime', 'returnDateTime-error')}
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="fuelPricePerLiter">Precio de Combustible por Litro ($)</label>
          <input
            className={getFieldClassName(fieldErrors, 'fuelPricePerLiter')}
            id="fuelPricePerLiter"
            type="number"
            name="fuelPricePerLiter"
            value={formData.fuelPricePerLiter}
            onChange={handleChange}
            onBlur={handleBlur}
            min="0.01"
            max={MAX_FUEL_PRICE}
            step="0.01"
            inputMode="decimal"
            {...getFieldA11yProps(fieldErrors, 'fuelPricePerLiter', 'fuelPricePerLiter-error')}
            required
          />
          {renderFieldError(fieldErrors, 'fuelPricePerLiter', 'fuelPricePerLiter-error')}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="passengers">Cantidad de Pasajeros</label>
          <input
            className={getFieldClassName(fieldErrors, 'passengers')}
            id="passengers"
            type="number"
            name="passengers"
            value={formData.passengers}
            onChange={handleChange}
            onBlur={handleBlur}
            min="1"
            max={MAX_PASSENGERS}
            step="1"
            inputMode="numeric"
            {...getFieldA11yProps(fieldErrors, 'passengers', 'passengers-error')}
            required
          />
          {renderFieldError(fieldErrors, 'passengers', 'passengers-error')}
          <small className="input-help">Rango permitido: 1 a {MAX_PASSENGERS}</small>
        </div>
        <div className="form-group">
          <label htmlFor="quantity">Transportes requeridos</label>
          <input id="quantity" type="number" value={summary.unitsRequired} readOnly />
          <small className="input-help">Cálculo automático según tipo de transporte y pasajeros.</small>
        </div>
      </div>
    </div>
  );
};

TravelInfoSection.propTypes = {
  formData: budgetFormDataPropType,
  fieldErrors: fieldErrorsPropType,
  handleChange: PropTypes.func.isRequired,
  handleBlur: PropTypes.func.isRequired,
  routeOptions: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    origin: PropTypes.string.isRequired,
    destination: PropTypes.string.isRequired,
    distanceKm: PropTypes.number.isRequired,
    tollOneWay: PropTypes.number.isRequired
  })).isRequired,
  returnRouteOptions: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    origin: PropTypes.string.isRequired,
    destination: PropTypes.string.isRequired,
    distanceKm: PropTypes.number.isRequired,
    tollOneWay: PropTypes.number.isRequired
  })).isRequired,
  summary: PropTypes.shape({
    unitsRequired: PropTypes.number
  }).isRequired
};

const CostsSection = ({ formData, fieldErrors, handleChange, handleBlur }) => {
  const [focusedField, setFocusedField] = useState(null);

  return (
    <div className="form-section">
      <h3>Costos del Viaje</h3>

      {COST_INPUT_CONFIG.map(({ id: fieldId, label, showMaxHint }) => {
        const errorId = `${fieldId}-error`;
        const isFocused = focusedField === fieldId;
        const displayValue = isFocused ? formData[fieldId] : formatCurrency(formData[fieldId]);

        const handleFormattedCurrencyChange = (e) => {
          const value = e.target.value;
          
          // Si el campo está vacío, lo mantenemos vacío
          if (value === '') {
            handleChange({
              target: {
                name: fieldId,
                value: ''
              }
            });
            return;
          }
          
          // Extrae solo números y puntos
          const cleaned = value.replace(/[^\d.]/g, '');
          
          // Valida el formato
          if (cleaned === '' || /^\d*(\.\d{0,2})?$/.test(cleaned)) {
            const parsed = Number.parseFloat(cleaned || '0');
            const clamped = clampValue(parsed, 0, MAX_COST);
            
            handleChange({
              target: {
                name: fieldId,
                value: String(clamped)
              }
            });
          }
        };

        const handleFocus = () => {
          setFocusedField(fieldId);
        };

        const handleBlurField = (e) => {
          setFocusedField(null);
          handleBlur(e);
        };

        return (
          <div key={fieldId} className="form-group">
            <label htmlFor={fieldId}>{label}</label>
            <input
              className={getFieldClassName(fieldErrors, fieldId)}
              id={fieldId}
              type="text"
              name={fieldId}
              value={formData[fieldId] && formData[fieldId] !== '0' ? displayValue : ''}
              onChange={handleFormattedCurrencyChange}
              onFocus={handleFocus}
              onBlur={handleBlurField}
              inputMode="decimal"
              placeholder="$0.00"
              {...getFieldA11yProps(fieldErrors, fieldId, errorId)}
            />
            {renderFieldError(fieldErrors, fieldId, errorId)}
            {showMaxHint && <small className="input-help">Maximo permitido: ${MAX_COST.toLocaleString('es-CO')}</small>}
          </div>
        );
      })}

      <div className="form-group">
        <label htmlFor="contingencyPercent">Fondo de Imprevistos (%)</label>
        <input
          className={getFieldClassName(fieldErrors, 'contingencyPercent')}
          id="contingencyPercent"
          type="number"
          name="contingencyPercent"
          value={formData.contingencyPercent}
          onChange={handleChange}
          onBlur={handleBlur}
          min="0"
          max={MAX_CONTINGENCY_PERCENT}
          step="1"
          inputMode="numeric"
          {...getFieldA11yProps(fieldErrors, 'contingencyPercent', 'contingencyPercent-error')}
        />
        {renderFieldError(fieldErrors, 'contingencyPercent', 'contingencyPercent-error')}
        <small className="input-help">Recomendado entre 10% y 20%.</small>
      </div>
    </div>
  );
};

CostsSection.propTypes = {
  formData: budgetFormDataPropType,
  fieldErrors: fieldErrorsPropType,
  handleChange: PropTypes.func.isRequired,
  handleBlur: PropTypes.func.isRequired
};

const NotesSection = ({ formData, fieldErrors, handleChange, handleBlur, notesLength }) => {
  return (
    <div className="form-section">
      <h3>Notas Adicionales</h3>
      <div className="form-group">
        <label htmlFor="notes">Notas</label>
        <textarea
          className={getFieldClassName(fieldErrors, 'notes')}
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Agrega cualquier nota o comentario importante..."
          rows="4"
          maxLength={MAX_NOTES_LENGTH}
          {...getFieldA11yProps(fieldErrors, 'notes', 'notes-error')}
        ></textarea>
        {renderFieldError(fieldErrors, 'notes', 'notes-error')}
        <small className="input-help notes-counter">{notesLength}/{MAX_NOTES_LENGTH} caracteres</small>
      </div>
    </div>
  );
};

NotesSection.propTypes = {
  formData: budgetFormDataPropType,
  fieldErrors: fieldErrorsPropType,
  handleChange: PropTypes.func.isRequired,
  handleBlur: PropTypes.func.isRequired,
  notesLength: PropTypes.number.isRequired
};

const BudgetForm = ({ isEditing = false }) => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const routeOptions = useMemo(() => getPreloadedRoutes(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    tripType: 'oneWay',
    tripName: '',
    routeOutboundId: '',
    routeReturnId: '',
    departureDateTime: '',
    returnDateTime: '',
    transportType: 'automovil',
    fuelPricePerLiter: TRANSPORT_CONFIG.automovil.defaultFuelPrice,
    quantity: 1,
    passengers: 1,
    hotelCost: 0,
    foodCost: 0,
    activitiesCost: 0,
    contingencyPercent: DEFAULT_CONTINGENCY_PERCENT,
    totalBudget: 0,
    notes: ''
  });

  const returnRouteOptions = useMemo(() => {
    if (!formData.routeOutboundId) {
      return routeOptions;
    }

    const outboundRoute = routeOptions.find((route) => route.id === formData.routeOutboundId);
    if (!outboundRoute) {
      return routeOptions;
    }

    const strictMatches = routeOptions.filter(
      (route) => route.origin === outboundRoute.destination && route.destination === outboundRoute.origin
    );

    if (strictMatches.length > 0) {
      return strictMatches;
    }

    return routeOptions.filter((route) => route.origin === outboundRoute.destination);
  }, [formData.routeOutboundId, routeOptions]);

  const loadBudgetData = useCallback(async () => {
    if (!isEditing || !id || !user?.uid) {
      return;
    }

    try {
      const budgets = await getUserBudgets(user.uid);
      const budget = budgets.find(b => b.id === id);
      if (budget) {
        const fallbackTransport = budget.transportType || 'automovil';
        const transportMeta = getTransportMeta(fallbackTransport);
        
        // Calcular el precio por noche dividiendo el costo total por los días
        const tripDays = getTripDays(budget.departureDateTime, budget.returnDateTime);
        const hotelPricePerNight = budget.hotelCost && tripDays > 0 ? budget.hotelCost / tripDays : 0;

        setFormData({
          tripType: budget.tripType || 'oneWay',
          tripName: budget.tripName || budget.destination || '',
          routeOutboundId: budget.routeOutboundId || '',
          routeReturnId: budget.routeReturnId || '',
          departureDateTime: budget.departureDateTime || '',
          returnDateTime: budget.returnDateTime || '',
          transportType: fallbackTransport,
          fuelPricePerLiter: budget.fuelPricePerLiter || transportMeta.defaultFuelPrice,
          quantity: budget.quantity || 1,
          passengers: budget.passengers || 1,
          hotelCost: hotelPricePerNight || 0,
          foodCost: budget.foodCost || 0,
          activitiesCost: budget.activitiesCost || 0,
          contingencyPercent: budget.contingencyPercent ?? DEFAULT_CONTINGENCY_PERCENT,
          totalBudget: budget.totalBudget || 0,
          notes: budget.notes || ''
        });
      }
    } catch (err) {
      console.error('Error loading budget data:', err);
      setError('Error al cargar el presupuesto');
    }
  }, [id, isEditing, user?.uid]);

  useEffect(() => {
    loadBudgetData();
  }, [loadBudgetData]);

  const updateFieldError = useCallback((fieldName, message) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[fieldName] = message;
      } else {
        delete next[fieldName];
      }
      return next;
    });
  }, []);

  const validateAndSetError = useCallback((fieldName, fieldValue, nextFormData) => {
    const message = validateBudgetField(fieldName, fieldValue, nextFormData);
    updateFieldError(fieldName, message);

    if (fieldName === 'departureDateTime' || fieldName === 'returnDateTime') {
      const departureMessage = validateBudgetField('departureDateTime', nextFormData.departureDateTime, nextFormData);
      const returnMessage = validateBudgetField('returnDateTime', nextFormData.returnDateTime, nextFormData);
      updateFieldError('departureDateTime', departureMessage);
      updateFieldError('returnDateTime', returnMessage);
    }

    if (fieldName === 'tripType' || fieldName === 'routeOutboundId' || fieldName === 'routeReturnId') {
      const outboundMessage = validateBudgetField('routeOutboundId', nextFormData.routeOutboundId, nextFormData);
      const returnRouteMessage = validateBudgetField('routeReturnId', nextFormData.routeReturnId, nextFormData);
      updateFieldError('routeOutboundId', outboundMessage);
      updateFieldError('routeReturnId', returnRouteMessage);
    }
  }, [updateFieldError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError('');

    if (name === 'tripType') {
      const nextFormData = {
        ...formData,
        tripType: value,
        routeReturnId: value === ROUND_TRIP ? (formData.routeReturnId || formData.routeOutboundId) : '',
        returnDateTime: value === ROUND_TRIP ? formData.returnDateTime : ''
      };

      setFormData(nextFormData);
      validateAndSetError(name, value, nextFormData);
      return;
    }

    if (name === 'routeOutboundId') {
      const outboundRoute = routeOptions.find((route) => route.id === value);
      const reverseCandidates = outboundRoute
        ? routeOptions.filter(
            (route) => route.origin === outboundRoute.destination && route.destination === outboundRoute.origin
          )
        : [];

      const nextRouteReturnId = formData.tripType === ROUND_TRIP
        ? (reverseCandidates[0]?.id || '')
        : '';

      const nextFormData = {
        ...formData,
        routeOutboundId: value,
        routeReturnId: nextRouteReturnId
      };

      setFormData(nextFormData);
      validateAndSetError(name, value, nextFormData);
      validateAndSetError('routeReturnId', nextRouteReturnId, nextFormData);
      return;
    }

    if (name === 'routeReturnId') {
      const nextFormData = {
        ...formData,
        routeReturnId: value
      };

      setFormData(nextFormData);
      validateAndSetError(name, value, nextFormData);
      return;
    }

    if (name === 'departureDateTime' || name === 'returnDateTime') {
      const nextFormData = {
        ...formData,
        [name]: value
      };

      setFormData(nextFormData);
      validateAndSetError(name, value, nextFormData);
      return;
    }

    if (name === 'fuelPricePerLiter') {
      const normalizedValue = normalizeCurrencyInput(value);
      if (normalizedValue === null) {
        return;
      }

      const parsed = normalizedValue === '' ? '' : String(clampValue(Number.parseFloat(normalizedValue), 0, MAX_FUEL_PRICE));
      const nextFormData = {
        ...formData,
        fuelPricePerLiter: parsed
      };

      setFormData(nextFormData);
      validateAndSetError(name, parsed, nextFormData);
      return;
    }

    if (name === 'tripName') {
      const nextValue = value.slice(0, MAX_TRIP_NAME_LENGTH);
      const nextFormData = {
        ...formData,
        tripName: nextValue
      };

      setFormData(nextFormData);
      validateAndSetError('tripName', nextValue, nextFormData);
      return;
    }

    if (name === 'transportType') {
      const transportMeta = getTransportMeta(value);
      const nextFormData = {
        ...formData,
        transportType: value,
        fuelPricePerLiter: String(transportMeta.defaultFuelPrice)
      };

      setFormData(nextFormData);
      validateAndSetError(name, value, nextFormData);
      validateAndSetError('fuelPricePerLiter', nextFormData.fuelPricePerLiter, nextFormData);
      return;
    }

    if (INTEGER_RULES[name]) {
      const { min, max } = INTEGER_RULES[name];
      const normalizedValue = normalizeIntegerInput(value, min, max);
      if (normalizedValue === null) {
        return;
      }

      const nextFormData = {
        ...formData,
        [name]: normalizedValue
      };

      setFormData(nextFormData);
      validateAndSetError(name, normalizedValue, nextFormData);
      return;
    }

    if (COST_FIELDS.has(name)) {
      const normalizedValue = normalizeCurrencyInput(value);
      if (normalizedValue === null) {
        return;
      }

      const nextFormData = {
        ...formData,
        [name]: normalizedValue
      };

      setFormData(nextFormData);
      validateAndSetError(name, normalizedValue, nextFormData);
      return;
    }

    if (name === 'notes') {
      const nextValue = value.slice(0, MAX_NOTES_LENGTH);
      const nextFormData = {
        ...formData,
        notes: nextValue
      };

      setFormData(nextFormData);
      validateAndSetError('notes', nextValue, nextFormData);
      return;
    }

    const nextFormData = {
      ...formData,
      [name]: value
    };

    setFormData(nextFormData);
    validateAndSetError(name, value, nextFormData);
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    validateAndSetError(name, value, formData);
  };

  const validateAllFields = () => {
    const fieldsToValidate = [
      'tripType',
      'tripName',
      'routeOutboundId',
      'routeReturnId',
      'departureDateTime',
      'returnDateTime',
      'passengers',
      'fuelPricePerLiter',
      'hotelCost',
      'foodCost',
      'activitiesCost',
      'contingencyPercent',
      'notes'
    ];
    const nextErrors = {};

    fieldsToValidate.forEach((fieldName) => {
      const message = validateBudgetField(fieldName, formData[fieldName], formData);
      if (message) {
        nextErrors[fieldName] = message;
      }
    });

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const isValid = validateAllFields();
      if (!isValid) {
        setError('Revisa los campos marcados para continuar.');
        return;
      }

      const submitError = validateSubmitData(formData);
      if (submitError) {
        setError(submitError);
        return;
      }

      const summary = calculateBudgetSummary({ ...formData, routeCatalog: routeOptions });
      const destinationLabel = summary.outboundRouteLabel || formData.tripName || 'Viaje sin especificar';
      const budgetData = {
        ...formData,
        destination: destinationLabel,
        tripName: formData.tripName.trim(),
        notes: formData.notes.trim(),
        fuelPricePerLiter: summary.fuelPricePerLiter,
        routeDistanceKm: summary.totalDistanceKm,
        routeFuelLiters: summary.fuelLiters,
        routeFuelCost: summary.fuelCost,
        routeTollCost: summary.tollCost,
        routePerDiemCost: summary.perDiemCost,
        routeOperationalSubtotal: summary.routeOperationalSubtotal,
        outboundRouteLabel: summary.outboundRouteLabel,
        returnRouteLabel: summary.returnRouteLabel,
        transportCost: summary.transport,
        hotelCost: summary.hotel,
        foodCost: summary.food,
        activitiesCost: summary.activities,
        baseBudget: summary.baseTotal,
        contingencyPercent: summary.contingencyPercent,
        contingencyAmount: summary.contingencyAmount,
        recommendedTotal: summary.recommendedTotal,
        totalBudget: summary.recommendedTotal,
        tripDays: summary.tripDays,
        dailyBaseBudget: summary.dailyBaseBudget,
        dailyRecommendedBudget: summary.dailyRecommendedBudget,
        perPersonBaseBudget: summary.perPersonBaseBudget,
        perPersonRecommendedBudget: summary.perPersonRecommendedBudget,
        perPersonPerDayRecommended: summary.perPersonPerDayRecommended,
        passengers: summary.passengers,
        quantity: summary.unitsRequired,
        costBreakdown: summary.breakdown
      };

      if (isEditing && id) {
        await updateBudget(id, budgetData);
      } else {
        await createBudget(user.uid, budgetData);
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving budget:', err);
      setError('Error al guardar el presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const summary = calculateBudgetSummary({ ...formData, routeCatalog: routeOptions });
  const notesLength = formData.notes.length;

  return (
    <div className="budget-form-container">
      <div className="form-left">
        <div className="form-wrapper">
          <h2>{isEditing ? 'Editar Presupuesto' : 'Crear Nuevo Presupuesto'}</h2>

          {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <TravelInfoSection
            formData={formData}
            fieldErrors={fieldErrors}
            handleChange={handleChange}
            handleBlur={handleBlur}
            routeOptions={routeOptions}
            returnRouteOptions={returnRouteOptions}
            summary={summary}
          />

          <CostsSection
            formData={formData}
            fieldErrors={fieldErrors}
            handleChange={handleChange}
            handleBlur={handleBlur}
          />

          <NotesSection
            formData={formData}
            fieldErrors={fieldErrors}
            handleChange={handleChange}
            handleBlur={handleBlur}
            notesLength={notesLength}
          />

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

    <div className="summary-right">
      <div className="summary-sticky">
        <div className="total-section">
          <h3>Resumen de Presupuesto</h3>

          <div className="route-summary-box">
            <h4>Itinerario y Operación</h4>
            <p>Ruta de ida: {summary.outboundRouteLabel || 'Sin seleccionar'}</p>
            {summary.isRoundTrip && <p>Ruta de regreso: {summary.returnRouteLabel || 'Sin seleccionar'}</p>}
            <p>Distancia total: {summary.totalDistanceKm.toFixed(2)} km</p>
            <p>Combustible estimado: {summary.fuelLiters.toFixed(2)} L</p>
            <p>Costo de combustible: {formatCurrency(summary.fuelCost)}</p>
            <p>Costo de peajes: {formatCurrency(summary.tollCost)}</p>
            <p>Viáticos de chofer: {formatCurrency(summary.perDiemCost)}</p>
            <p>Subtotal operativo: {formatCurrency(summary.routeOperationalSubtotal)}</p>
          </div>

          <div className="budget-kpi-grid">
            <div className="budget-kpi-item">
              <span className="kpi-label">Base</span>
              <span className="kpi-value">{formatCurrency(summary.baseTotal)}</span>
            </div>
            <div className="budget-kpi-item">
              <span className="kpi-label">Imprevistos ({summary.contingencyPercent}%)</span>
              <span className="kpi-value">{formatCurrency(summary.contingencyAmount)}</span>
            </div>
            <div className="budget-kpi-item highlight">
              <span className="kpi-label">Total recomendado</span>
              <span className="kpi-value">{formatCurrency(summary.recommendedTotal)}</span>
            </div>
            <div className="budget-kpi-item">
              <span className="kpi-label">Duracion</span>
              <span className="kpi-value">{summary.tripDays} dias</span>
            </div>
          </div>

          <div className="budget-metrics-grid">
            <p className="total-per-person">Por persona: {formatCurrency(summary.perPersonRecommendedBudget)}</p>
            <p className="total-per-person">Por dia: {formatCurrency(summary.dailyRecommendedBudget)}</p>
            <p className="total-per-person">Por persona/dia: {formatCurrency(summary.perPersonPerDayRecommended)}</p>
          </div>

          <div className="budget-breakdown">
            <h4>Distribucion por categoria</h4>
            <p>Transporte: {summary.breakdown.transportPercent.toFixed(1)}%</p>
            <p>Hospedaje: {summary.breakdown.hotelPercent.toFixed(1)}%</p>
            <p>Comida: {summary.breakdown.foodPercent.toFixed(1)}%</p>
            <p>Actividades: {summary.breakdown.activitiesPercent.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

BudgetForm.propTypes = {
  isEditing: PropTypes.bool
};

export default BudgetForm;
