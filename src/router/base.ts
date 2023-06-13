import express from 'express';
import type { Redis } from 'ioredis';
import dotenv from 'dotenv';
import redis from '../config/redis';
import mysql from '../config/mysql';

dotenv.config();

class BaseRouter {
  router = null;

  redis: Redis = redis;

  mysql = mysql;

  constructor() {
    this.router = express.Router();
  }

  get(path, handler) {
    this.router.get(path, handler);
  }

  post(path, handler) {
    this.router.post(path, handler);
  }

  put(path, handler) {
    this.router.put(path, handler);
  }

  delete(path, handler) {
    this.router.delete(path, handler);
  }

  getRouter() {
    return this.router;
  }
}

export default BaseRouter;
