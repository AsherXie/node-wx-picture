import Ioredis from 'ioredis';
import mysqlConfig from '../../mysql.config';

const redis = new Ioredis({
  host: mysqlConfig.host,
  port: 6379,
  password: mysqlConfig.redispassword,
  lazyConnect: true,
});
export default redis;
