import Ioredis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();
const redis = new Ioredis({
  host: process.env.HOST,
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  lazyConnect: true,
});
export default redis;
