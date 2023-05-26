import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';

class Router {
  private router = express.Router();

  registerTheRoute() {
    this.router.post('/register', Router.register);
  }

  static register(request: Request, response: Response) {
    const { username, password } = request.body;
    // 校验密码
    if (!password || !/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/.test(password)) {
      return response.status(400).json({ error: '密码必须包含数字以及大小写字母！' });
    }

    // 对密码进行加密
    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err) => {
      if (err) return response.status(500).json({ msg: 'Server is error' });
      return response.status(200).json({ error: 0, msg: '' });
    });
    return null;
  }

  getRouter() {
    return this.router;
  }
}

export default Router;
