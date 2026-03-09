const RATES = { BASE: 5.00, PER_STOP: 3.00, PER_MILE: 1.00, TAX_RATE: 0.05 };
const calculatePrice = (stops, miles) => {
  const base_price    = RATES.BASE;
  const stops_price   = stops * RATES.PER_STOP;
  const mileage_price = parseFloat((miles * RATES.PER_MILE).toFixed(2));
  const subtotal      = base_price + stops_price + mileage_price;
  const tax           = parseFloat((subtotal * RATES.TAX_RATE).toFixed(2));
  const total_price   = parseFloat((subtotal + tax).toFixed(2));
  return { base_price, stops_price, mileage_price, subtotal, tax, total_price };
};
const calculateInvoice = (deliveries) => {
  const total_routes = deliveries.length;
  const total_stops  = deliveries.reduce((s, d) => s + parseInt(d.total_stops), 0);
  const total_miles  = deliveries.reduce((s, d) => s + parseFloat(d.total_miles || 0), 0);
  const subtotal     = deliveries.reduce((s, d) => s + parseFloat(d.total_price || 0), 0);
  const tax          = parseFloat((subtotal * RATES.TAX_RATE).toFixed(2));
  const total        = parseFloat((subtotal + tax).toFixed(2));
  return { total_routes, total_stops, total_miles: parseFloat(total_miles.toFixed(2)), subtotal: parseFloat(subtotal.toFixed(2)), tax, total };
};
module.exports = { calculatePrice, calculateInvoice, RATES };