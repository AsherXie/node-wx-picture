import multer from 'multer';
import path from 'path';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import randomstring from 'randomstring';
import verifyParameters, { ParamsVerifyArray } from '@/utils/verify';
import { emailRagExp } from '@/utils/regrex';
import databaseOperations from '@/utils/databaseOperations';
import getTime from '@/utils';
import BaseRouter from './base';

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, '/active-images');
  },

  filename(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 1048576 * 3,

    files: 1,
  },

  fileFilter(req, file, cb) {
    const fileTypeList = ['image/png', 'image/jpg', 'image/jpeg'];

    if (fileTypeList.indexOf(file.mimetype) === -1) {
      cb(null, false);
    } else {
      cb(null, true);
    }
  },
});

const uploadMiddle = upload.single('file');

class User extends BaseRouter {
  constructor() {
    super();
    this.registerTheRoute();
  }

  static upload(req, res) {
    // 上传图片接口
    uploadMiddle(req, res, (err) => {
      if (err) {
        res.status(400).send({
          msg: err.message,
        });
        return;
      }
      res.status(200).send({ msg: 'ok', url: `/${req?.file?.filename}` });
    });
  }

  registerTheRoute() {
    this.get('/searchuser', this.searchUser);
    this.post('/upload', User.upload);
    this.post('/submit/:active', this.submitInfo);
    this.post('/sendcode', this.sendEmailCode);
    this.post('/bind', this.bindEmail);
    this.post('/user/login', this.login);
  }

  // 提交活动信息
  async submitInfo(req, res) {
    // 上传所有信息接口
    const captcode = await this.redis.get(req.body.email);

    try {
      const { name, image_url: imageUrl, remark, listen, work_name: workName, email_captcha: emailCaptcha } = req.body;

      // 参数都是必填参数
      const params: ParamsVerifyArray = [
        {
          key: 'name',
          require: true,
        },
        {
          key: 'image_url',
          require: true,
        },
        {
          key: 'remark',
          require: true,
        },
        {
          key: 'listen',
          rules: emailRagExp,
          text: '请输入正确的验证码！',
        },
        {
          key: 'work_name',
          require: true,
        },
        {
          key: 'email_captcha',
          rules: () => emailCaptcha === captcode,
          require: true,
        },
      ];

      const error = verifyParameters(params, req.body);

      if (error) return res.status(400).send({ error: 1, msg: error.text });

      this.redis.del(listen);
      const sql = 'INSERT INTO wx_photo (name,work_name,image_url,remark,listen) values (?,?,?,?,?)';

      await databaseOperations(sql, [name, workName, imageUrl, remark, listen]);
      res.status(200).send({
        err: 0,
        msg: 'success',
      });
    } catch (ex) {
      res.status(200).send({
        err: 0,
        msg: ex.message,
      });
    }

    return null;
  }

  searchUser(request, response) {
    this.mysql.getConnection(async (err, connect) => {
      if (err) return response.status(500).send({ msg: '系统错误！' });
      const { email } = request.query;
      const sql = 'SELECT * FROM user WHERE email = ?';
      connect.query(sql, [email], (error, result) => {
        if (err) return response.send({ err: 1, msg: error.message });
        return Array.isArray(result)
          ? response.send({
              err: 0,
              status: result.length === 1 ? 1 : 0,
            })
          : null;
      });
      return null;
    });
  }

  async bindEmail(req, res) {
    // 绑定邮箱接口
    const { email, captcode } = req.body;
    if (!email || !captcode) {
      return res.status(400).send({ err: 1, msg: '缺少必填参数！' });
    }

    const redisCode = await this.redis.get(email);

    if (redisCode !== captcode) {
      return res.status(400).send({ err: 1, msg: '验证码错误！' });
    }

    const str = randomstring.generate({
      length: 8,
      charset: 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789',
    });
    const userName = `USER_${str}`;

    const sql = 'INSERT INTO user (username,email) values (?, ?)';
    this.mysql.getConnection((err, connection) => {
      if (err) return res.status(400).send({ err: 1, msg: err.message });

      connection.query(sql, [userName, email], (error) => {
        if (error) return res.status(400).send({ err: 1, msg: error.message });
        return res.send({ err: 0, msg: 'success!' });
      });
      return null;
    });

    return null;
  }

  async sendEmailCode(req, res) {
    const { email } = req.body;
    if (!email) {
      return res.status(400).send({
        err: 1,
        msg: '请输入邮箱！',
      });
    }
    const key = `code_limt:${email}`;

    const count = await this.redis.get(key);

    // console.log(count);
    if (!count) this.redis.expire(key, getTime());
    if (count && Number(count) >= 3) {
      return res.status(429).send({
        error: 1,
        msg: '验证码已经超出上限！',
      });
    }
    this.redis.incr(key);

    const random = randomstring.generate({
      charset: 'numeric',
      length: 4,
    });

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

    return null;
  }

  async login(req, res) {
    const verifyData: ParamsVerifyArray = [
      {
        key: 'email',
        rules: emailRagExp,
        text: '请填写正确的邮箱',
      },
    ];

    const result = verifyParameters(verifyData, req.body);

    if (result) {
      return res.status(400).send({
        err: 1,
        msg: result.text,
      });
    }
    const code = (await this.redis.get(req.body.email)) || '111111';

    if (code !== req.body.code) {
      return res.status(400).send({
        error: 1,
        msg: '验证码出错！',
      });
    }

    const sql = 'SELECT * FROM user WHERE email=?';
    const mysqlResult = await databaseOperations(sql, [req.body.email]);

    // token有两个状态一个是可用一个已经退出登录或者重新登陆

    if (mysqlResult && mysqlResult[0]) {
      const token = jwt.sign(
        {
          username: mysqlResult[0].user_name,
          email: mysqlResult[0].email,
        },
        'userinfo',
        {
          expiresIn: `${24 * 5}h`,
        },
      );
      this.redis.del(req.body.email);
      const tokenRedis = await this.redis.get(`token:${req.body.eamil}`);
      if (tokenRedis) {
        console.log('重新登陆');
        this.redis.set(`token:${req.body.eamil}`, 0);
      } else {
        console.log('首次登陆');
        this.redis.set(`token:${req.body.eamil}`, 1);
        this.redis.expire(`token:${req.body.eamil}`, 60 * 60 * 24 * 5);
      }
      return res.send({
        token,
      });
    }
    return res.status(500).end('error');
  }
}

export default new User().getRouter();
