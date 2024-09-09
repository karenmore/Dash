require('dotenv').config();
const oracledb = require('oracledb');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTION_STRING
};

async function initialize() {
    try {
        await oracledb.createPool({
            user: dbConfig.user,
            password: dbConfig.password,
            connectString: dbConfig.connectString,
            poolMin: 1,
            poolMax: 4,
            poolIncrement: 1
        });
        console.log('Conexión a la base de datos establecida');
    } catch (err) {
        console.error('Error al conectar a la base de datos', err);
    }
}

module.exports = { dbConfig, initialize };