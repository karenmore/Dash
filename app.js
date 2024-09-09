const express = require('express');
const cors = require('./config/corsConfig');
const oracledb = require('oracledb');
const { initialize } = require('./config/dbConfig');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const port = 3000;

app.use(cors);
app.use(express.json());

initialize();

// Usar las rutas
app.use('/api', orderRoutes);

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});