import express from 'express';
import type { Redis } from 'ioredis';
import dotenv from 'dotenv';
import randomstring from 'randomstring';
import nodemailer from 'nodemailer';
import getTime from '@/utils';
import redis from '../config/redis';
import mysql from '../config/mysql';

dotenv.config();

// 绑定邮箱接口
const transporter = nodemailer.createTransport({
  host: 'smtp.163.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
});

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
    this.router.post(path, handler.bind(this));
  }

  put(path, handler) {
    this.router.put(path, handler);
  }

  delete(path, handler) {
    this.router.delete(path, handler);
  }

  async sendEmail(email, res) {
    const key = `code_limt:${email}`;
    const count = await this.redis.get(key);
    if (!count) this.redis.expire(key, getTime());
    if (count && Number(count) >= 3) {
      return res.status(429).send({
        error: 1,
        msg: '验证码已经超出上限！',
      });
    }
    this.redis.incr(key);

    return new Promise(() => {
      const random = randomstring.generate({
        charset: 'numeric',
        length: 4,
      });
      const mailOptions = {
        from: process.env.EMAIL_ADDRESS,
        to: email,
        subject: '您好，欢迎您！',
        text: `您的验证码是: ${random}`,
      };
      transporter.sendMail(mailOptions, (err) => {
        if (err) return res.status(400).send({ err: 1, msg: '发送失败！请重试！' });
        this.redis.set(email, random);
        this.redis.expire(email, 60 * 60 * 12);
        return res.send({ err: 0, msg: 'success!' });
      });
    });
  }

  getRouter() {
    return this.router;
  }
}

export default BaseRouter;
