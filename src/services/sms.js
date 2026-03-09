const { sendSMS } = require('../config/twilio');
const { APP_URL } = require('../config/env');
const SMSService = {
  routeCreated:   async (stop) => sendSMS(stop.customer_phone, 'Hi ' + stop.customer_name + '! Your YOBU delivery is scheduled. Track: ' + APP_URL + '/track/' + stop.tracking_id),
  driverAssigned: async (stop, driver) => sendSMS(stop.customer_phone, 'Driver ' + driver.name + ' assigned. Track: ' + APP_URL + '/track/' + stop.tracking_id),
  parcelPickedUp: async (stop) => sendSMS(stop.customer_phone, 'Your order was picked up and is on its way! Track: ' + APP_URL + '/track/' + stop.tracking_id),
  driverEnRoute:  async (stop, eta) => sendSMS(stop.customer_phone, 'Your driver is ' + eta + ' min away! Track: ' + APP_URL + '/track/' + stop.tracking_id),
  delivered:      async (stop) => sendSMS(stop.customer_phone, 'Delivery complete! Thank you for using YOBU.'),
  sendOTP:        async (stop) => sendSMS(stop.customer_phone, 'Your YOBU code: ' + stop.otp + '. Share with your driver to confirm.'),
  notifyAllStops: async (stops, type, extra = {}) => { const tasks = stops.map(stop => SMSService[type] ? SMSService[type](stop, extra) : null).filter(Boolean); await Promise.allSettled(tasks); },
};
module.exports = SMSService;