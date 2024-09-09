const oracledb = require('oracledb');

const getOrderData = async () => {
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
        return result.rows;
    } catch (err) {
        throw new Error('Error en la consulta: ' + err.message);
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

module.exports = { getOrderData };