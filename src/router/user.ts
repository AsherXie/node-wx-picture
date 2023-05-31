import multer from 'multer';
import express from 'express';
import path from 'path';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import randomstring from 'randomstring';
import mysql from '../mysql';

import * as emailConfig from '../../email.config';

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

const codes = {};

const uploadMiddle = upload.single('file');

class User {
  private router = express.Router();

  constructor() {
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
    this.router.post('/upload', User.upload);
    this.router.post('/submit/:active', User.submitInfo);
    this.router.post('/sendcode', User.sendEmailCode);
  }

  static async submitInfo(req, res) {
    // 上传所有信息接口
    const { name, image_url: imageUrl, remark, listen, work_name: workName, email_captcha: emailCaptcha } = req.body;
    if (!codes[listen] || codes[listen] !== emailCaptcha) {
      return res.status(400).send({ err: 1, msg: '请输入正确的验证码！' });
    }
    delete codes[listen];
    const sql = 'INSERT INTO wx_photo (name,work_name,image_url,remark,listen) values (?,?,?,?,?)';
    mysql.getConnection((error, connection) => {
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

    return null;
  }

  static bindEmail() {
    // 绑定邮箱接口
  }

  static sendEmailCode(req, res) {
    const { email } = req.body;
    console.log(req.body);
    if (!email) {
      return res.status(400).send({
        err: 1,
        msg: '请输入邮箱！',
      });
    }
    try {
      const random = randomstring.generate(8);
      // 绑定邮箱接口
      const transporter = nodemailer.createTransport({
        host: 'smtp.163.com',
        port: 25,
        secure: false,
        auth: {
          user: emailConfig.email_address,
          pass: emailConfig.password,
        },
      });
      const mailOptions = {
        from: emailConfig.email_address,
        to: email,
        subject: '您好，欢迎您！',
        text: `您的验证码是: ${random}`,
      };
      transporter.sendMail(mailOptions, (err) => {
        console.log(err);
        //   res.send({ a: '1' });
        if (err) return res.status(400).send({ err: 1, msg: '发送失败！请重试！' });
        codes[email] = random;
        return res.send({ err: 0, msg: 'success!' });
      });
    } catch (ex) {
      console.log(ex);
    }
    return null;
  }

  getRouter() {
    return this.router;
  }
}

export default new User().getRouter();
