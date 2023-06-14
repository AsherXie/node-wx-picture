import mysql from '../config/mysql';

export default (queryStatements: string, params: Array<number | string>) =>
  new Promise((resolve, reject) => {
    mysql.getConnection((error, connection) => {
      if (error) {
        reject(error);
      }
      connection.query(queryStatements, params, (queryError, data) => {
        if (queryError) {
          reject(queryError);
        }
        resolve(data);
      });
    });
  });
