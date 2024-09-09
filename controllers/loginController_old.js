const bcrypt = require('bcrypt');
const oracledb = require('oracledb');

const loginUser = async (req, res) => {
    const { employee_number, password } = req.body; // Asumiendo que recibes un JSON con username y password
    let connection;

    try {
        connection = await oracledb.getConnection();

        // Obtener el hash de la contraseña desde la base de datos
        const result = await connection.execute(`
            select password 
            from BDOM.USER_MONITOR 
            where employee_number = :employee_number
        `, [employee_number]);

        if (result.rows.length === 0) {
            return res.status(401).send('Usuario no encontrado');
        }

        const storedHash = result.rows[0][0];

        // Comparar la contraseña ingresada con el hash almacenado
        const match = await bcrypt.compare(password, storedHash);

        if (match) {
            // Contraseña correcta
            res.json({ message: 'Login exitoso' });
        } else {
            // Contraseña incorrecta
            res.status(401).send('Contraseña incorrecta');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en el proceso de login: ' + err.message);
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

module.exports = { loginUser};