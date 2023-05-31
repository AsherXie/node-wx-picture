import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import svgObject from 'svg-captcha';
import mysql from '../mysql/index';

class Router {
  private router = express.Router();

  // static salt = '10';
  // static salt = await bcrypt.genSalt(10);

  constructor() {
    this.registerTheRoute();
  }

  registerTheRoute() {
    this.router.post('/register', Router.register);
    this.router.post('/login', Router.login);
    this.router.get('/captcha', Router.captcha);
  }

  // 注册用户
  static async register(request: Request, response: Response) {
    const { username, password } = request.body;
    // 校验密码
    if (!password || !/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/.test(password)) {
      return response.status(400).json({ error: 1, msg: '密码必须包含数字以及大小写字母！' });
    }

    const salt = await bcrypt.genSalt(10);

    // 对密码进行加密
    bcrypt.hash(password, salt, (err, hash) => {
      if (err) return response.status(500).send({ error: 1, msg: '错误，请重新提交！' });

      const sql = 'INSERT INTO user_admin (username, password) VALUES (?, ?)';

      mysql.getConnection((error, connection) => {
        if (error) return response.status(500).json({ msg: 'Server is error' });
        connection.query(sql, [username, hash], (sqlError) => {
          if (sqlError && sqlError.code === 'ER_DUP_ENTRY') {
            return response.status(400).send({ err: 1, msg: '用户名已存在' });
          }
          return response.status(200).send({ err: 0, msg: 'success' });
        });
        return null;
      });
      return null;
    });
    return null;
  }

  // 登录接口
  static login(request: Request, response: Response) {
    const { username, password, captcha } = request.body;
    if (!captcha || String(captcha) !== request.session.captcha) {
      return response.status(400).send({ err: 1, message: '验证码错误' });
    }
    const sql = 'SELECT * FROM user_admin WHERE username = ?';
    mysql.getConnection((_, connection) => {
      connection.query(sql, [username], async (error, data) => {
        if (error) return response.send({ err: 1, message: '用户名或密码错误' });
        // 验证密码
        const isItCorrect = await bcrypt.compare(password, data[0].password);
        // 验证
        if (isItCorrect)
          return response.send({
            err: 0,
            data: {
              user_name: data[0].username,
              email: data[0].username,
            },
          });

        return response.status(401).send({ err: 1, mag: '用户名或密码错误！' });
      });
    });
    return null;
    // response.send({ a: 1111 });
  }

  // 验证码接口
  static captcha(request: Request, response: Response) {
    const captcha = svgObject.createMathExpr({
      mathMin: 0,
      mathMax: 99,
      mathOperator: '+-',
    });
    request.session.captcha = captcha.text;
    response.type('svg').send(captcha.data);
  }

  getRouter() {
    return this.router;
  }
}

export default new Router().getRouter();
