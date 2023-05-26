import mysql from 'mysql2';
import mysqkConfig from '../../mysql.config';

export default mysql.createPool({ ...mysqkConfig, waitForConnections: true, connectionLimit: 10 });
