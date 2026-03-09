// ─── YOBU Pricing Engine ────────────────────────────────────
const PRICE = {
  base:     parseFloat(process.env.PRICE_BASE     || "5"),
  perStop:  parseFloat(process.env.PRICE_PER_STOP || "3"),
  perMile:  parseFloat(process.env.PRICE_PER_MILE || "1"),
};

/**
 * Calculate delivery route price
 * @param {number} numStops  - number of delivery stops
 * @param {number} miles     - total route distance in miles
 * @returns {{ base, stops, distance, total }}
 */
function calcRoutePrice(numStops, miles) {
  const base     = PRICE.base;
  const stops    = parseFloat((numStops * PRICE.perStop).toFixed(2));
  const distance = parseFloat((miles    * PRICE.perMile).toFixed(2));
  const total    = parseFloat((base + stops + distance).toFixed(2));
  return { base, stops, distance, total };
}

/**
 * Calculate monthly merchant invoice
 * @param {number} totalRoutes
 * @param {number} totalStops
 * @param {number} totalMiles
 */
function calcMonthlyInvoice(totalRoutes, totalStops, totalMiles) {
  const chargeBase     = parseFloat((totalRoutes * PRICE.base).toFixed(2));
  const chargeStops    = parseFloat((totalStops  * PRICE.perStop).toFixed(2));
  const chargeDistance = parseFloat((totalMiles  * PRICE.perMile).toFixed(2));
  const total          = parseFloat((chargeBase + chargeStops + chargeDistance).toFixed(2));
  return { chargeBase, chargeStops, chargeDistance, total };
}

module.exports = { PRICE, calcRoutePrice, calcMonthlyInvoice };
