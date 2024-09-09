const express = require('express');
const { getOrderCount, getOrderCity, getOrderAtomId, loginUser, pingDatabase, pingServer, getOrderQueued, getPaymentsCount, getPagoLinea, getDeliveryValue, getMetrics } = require('../controllers/orderController.js');

const router = express.Router();

router.get('/order-count', getOrderCount);
router.get('/order-city', getOrderCity);
router.get('/count-atomid', getOrderAtomId)
router.post('/login', loginUser)
router.get('/ping' , pingDatabase)
router.get('/ping-server', pingServer)
router.get('/OrderQueued', getOrderQueued)
router.get('/PaymentsCount', getPaymentsCount)
router.get('/PagoLinea', getPagoLinea)
router.get('/DeliveryValue', getDeliveryValue)

router.get('/metrics', getMetrics);
router.get('/delivery', getDeliveryValue);

module.exports = router;