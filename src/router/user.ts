import multer from 'multer';
import path from 'path';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import randomstring from 'randomstring';
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
    this.mysql.getConnection((err) => {
      console.log(err, 12323);
    });
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
    this.router.get('/searchuser', this.searchUser);
    this.router.post('/upload', User.upload);
    this.router.post('/submit/:active', this.submitInfo);
    this.router.post('/sendcode', this.sendEmailCode);
    this.router.post('/bind', this.bindEmail);
  }

  async submitInfo(req, res) {
    // 上传所有信息接口
    try {
      const { name, image_url: imageUrl, remark, listen, work_name: workName, email_captcha: emailCaptcha } = req.body;
      const captcode = await this.redis.get(req.body.email);
      // this.redis.get(email,(error,result)=>{})
      if (captcode !== emailCaptcha) {
        return res.status(400).send({ err: 1, msg: '请输入正确的验证码！' });
      }
      this.redis.del(listen);
      const sql = 'INSERT INTO wx_photo (name,work_name,image_url,remark,listen) values (?,?,?,?,?)';
      this.mysql.getConnection((error, connection) => {
        connection.query(sql, [name, workName, imageUrl, remark, listen], (err) => {
          if (err) {
            res.status(400).send({
              err: 1,
              msg: err.message,
            });
          } else {
            res.status(200).send({
              err: 0,
              msg: 'success',
            });
          }
          connection.release();
        });
      });
    } catch (ex) {
      console.log(ex);
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
      charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
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

  sendEmailCode(req, res) {
    const { email } = req.body;
    if (!email) {
      return res.status(400).send({
        err: 1,
        msg: '请输入邮箱！',
      });
    }
    const random = randomstring.generate(8);

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
    // console.log(transporter);
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

  getRouter() {
    return this.router;
  }
}

export default new User().getRouter();
