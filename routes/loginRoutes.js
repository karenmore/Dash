const express = require('express');
const { loginUser } = require('../controllers/orderController.js');

const routerlogin = express.Router();

routerlogin.post('/user', loginUser);

module.exports = routerlogin;