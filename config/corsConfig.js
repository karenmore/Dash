// corsConfig.js
const cors = require('cors');

const corsConfig = {
    origin: function(origin, callback) {
        const whitelist = [process.env.FRONTEND_URL]; // Asegúrate de que esta variable esté definida
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true); // Permitir el origen
        } else {
            callback(new Error('No permitido por CORS')); // Denegar el origen
        }
    }
};

module.exports = cors(corsConfig);