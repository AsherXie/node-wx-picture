import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();
export default mysql.createPool({
  host: process.env.HOST,
  port: Number(process.env.PORT),
  password: process.env.MYSQL_PASSWORD,
  user: process.env.USER,
  database: process.env.DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});
