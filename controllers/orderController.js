const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
const { dbConfig } = require('../config/dbConfig')
const { exec } = require('child_process')
//const archivo = require('../user/users.json')

const client = require('prom-client');
const { getOrderData } = require('../model/model');

// Crear un registro de métricas
const register = new client.Registry();

// Definir una métrica
const orderCount = new client.Counter({
    name: 'order_count',
    help: 'Número de órdenes procesadas',
    labelNames: ['order_date']
});

// Endpoint para métricas
const getMetrics = async (req, res) => {
    try {
        const metrics = await register.metrics();
        res.set('Content-Type', register.contentType);
        res.end(metrics);
    } catch (err) {
        res.status(500).send('Error al obtener métricas');
    }
};

// Endpoint para obtener datos y actualizar métricas
const getDeliveryValue = async (req, res) => {
    try {
        const orderData = await getOrderData();
        
        // Actualizar la métrica con los resultados
        orderData.forEach(row => {
            orderCount.inc({ order_date: row[0] }, row[1]); // Incrementar contador
        });

        res.json(orderData);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error con la consulta: ' + err.message);
    }
};

const getOrderCount = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(`
            SELECT COUNT(*)
            FROM BDOM.ORDER_HEAD
            WHERE CREATE_DATE >= SYSDATE - NUMTODSINTERVAL (3, 'MINUTE')
            AND DELIVERY_TYPE = 'EXPRESS'
        `);
        res.json({ count: result.rows[0][0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la consulta');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};

const getOrderCity = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(`
            SELECT * 
            FROM 
            (SELECT 
                NVL(COUNT(A.CITY_ID), 0) AS TOTAL_ORDERS,
                B.ID AS CITY_ID,
                B.NAME,
                B.DELIVERY_TYPE,
                B.DEFAULT_STORE
            FROM 
                BDOM.CITY B
                LEFT JOIN BDOM.ORDER_HEAD A ON A.CITY_ID = B.ID 
                AND A.CREATE_DATE >= SYSDATE - NUMTODSINTERVAL(60, 'MINUTE') 
                AND A.DELIVERY_TYPE = 'EXPRESS'
            GROUP BY 
                B.ID,
                B.NAME,
                B.DELIVERY_TYPE,
                B.DEFAULT_STORE) C
            WHERE DELIVERY_TYPE = 'EXPRESS'
            AND TOTAL_ORDERS = 0
            AND CITY_ID NOT IN ('NEW','NEW2')
        `);
        
        // Devolver todos los resultados
        res.json({ cities: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la consulta');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};

const getOrderAtomId = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(`
        SELECT COUNT(*)
        FROM BDUCD.CUSTOMER
        WHERE ATOM_ID IS NULL
        AND TRUNC(CREATION_DATE) = TRUNC(SYSDATE)
        `);
        res.json({ atomId: result.rows[0][0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la consulta');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};

const getOrderQueued = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(`
            SELECT COUNT(*) AS CANTIDAD, F.DESCRIPTION, B.NAME, A.DELIVERY_TYPE 
            FROM BDOM.ORDER_HEAD A
            INNER JOIN BDOM.PAYMENT_MEANS F ON F.ID = A.PAYMENT_METHOD_ID
            INNER JOIN BDOM.COURIER B ON B.ID = A.COURIER_ID
            WHERE TRUNC(CREATE_DATE) >= TRUNC(SYSDATE) 
            AND (STATUS_ID = 0 OR STATUS_ID = 1)
            AND PICKING_DATE IS NULL
            GROUP BY COURIER_ID, F.DESCRIPTION, B.NAME, A.DELIVERY_TYPE
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error con la consulta: ' + err.message);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error cerrando la conexión: ', err);
            }
        }
    }
};

const pingDatabase = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection()
        //console.log("Conexión exitosa a la base de datos Delivery");
        res.status(200).json('Conexión exitosa a la base de datos Delivery') //.send("Conexión exitosa a la base de datos Delivery.")

}catch (err) {
    console.error("Error en la conexion:", err)
    res.status(500).json('Error de Conexión a la base de datos Delivery')//.send("Error de Conexión a la base de datos Delivery.")

} finally {
    if (connection) {
        try {
            await connection.close();
        } catch (err) {
            console.error("Error al cerrar la conexión:", err.message);
        }
    }
}
};

const pingServer = (req, res) => {
    const serverId = '10.250.36.10'; // Puedes obtener la dirección del servidor desde los parámetros de la solicitud

    exec(`ping -n 4 ${serverId}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al hacer ping: ${stderr}`);
            return res.status(500).send('Error al hacer ping al servidor');
        }

        // Procesar la salida del comando ping
        const response = stdout.split('\n').filter(line => line.includes('bytes=')).map(line => line.trim());

        // Verificar si hay un TTL expirado en tránsito
        const hasTTLExpired = stdout.includes('TTL expirado en tránsito');

        // Establecer el mensaje de estado basado en los resultados
        let statusMessage;
        if (hasTTLExpired) {
            statusMessage = 'Error: TTL expirado en tránsito';
        } else if (response.length > 0) {
            statusMessage = 'Salud del servidor estable';
        } else {
            statusMessage = 'No se recibio respuestas del servidor';
        }

        return res.json({ pingResults: response, status: statusMessage });
    });
};


const loginUser = (req, res) => {
    const { employee_number, password } = req.body;

    // Ruta al archivo JSON
    const filePath = path.join(__dirname, '../user/users.json');

    // Leer el archivo JSON
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer el archivo:', err);
            return res.status(500).send('Error en el servidor');
        }

        // Parsear el contenido del archivo
        const users = JSON.parse(data);

        // Buscar el usuario
        const user = users.find(u => u.employee_number === employee_number);

        if (!user) {
            return res.status(401).send('Usuario no encontrado');
        }

        // Verificar la contraseña
        if (user.password !== password) {
            return res.status(401).send('Contraseña incorrecta');
        }

        // Si todo está bien, puedes devolver información del usuario
        res.status(200).json({
            name: user.name,
            employee_number: user.employee_number,
            rol: user.rol
        });
    });
};

const getPaymentsCount = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(`
            SELECT COUNT(*)
            FROM BDOM.ORDER_PAYMENTS_MEGASOFT
            WHERE CREATE_DATE >= SYSDATE - NUMTODSINTERVAL (5, 'MINUTE')
        `);
        res.json({ count: result.rows[0][0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la consulta');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};

const getPagoLinea = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(`
            SELECT COUNT(*)
            FROM BDOM.TRANSACTION_ONLINE
            WHERE TRANSACTION_DATE >= SYSDATE - NUMTODSINTERVAL (10, 'MINUTE')
            AND RESPONSE_CODE = '00'
        `);
        res.json({ count: result.rows[0][0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la consulta');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};

/*const getDeliveryValue = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(`
            SELECT 
                TRUNC(A.CREATE_DATE) AS ORDER_DATE, 
                COUNT(*) AS ORDER_COUNT
            FROM BDOM.ORDER_HEAD A
            WHERE TRUNC(A.CREATE_DATE) >= TRUNC(SYSDATE - 1)
            AND A.DELIVERY_VALUE <= 1
            AND A.DELIVERY_TYPE = 'EXPRESS'
            GROUP BY TRUNC(A.CREATE_DATE)
            ORDER BY ORDER_DATE
        `);

        // Actualizar la métrica con los resultados
        result.rows.forEach(row => {
            orderCount.inc({ order_date: row[0] }, row[1]); // Incrementar contador
        });

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error con la consulta: ' + err.message);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error cerrando la conexión: ', err);
            }
        }
    }
};*/

module.exports =   { 
    getOrderCount, 
    getOrderCity, 
    getOrderAtomId, 
    loginUser, 
    pingDatabase, 
    pingServer, 
    getOrderQueued,
    getPaymentsCount,
    getPagoLinea,
    getDeliveryValue,
    getMetrics };