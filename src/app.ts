// import express from 'express';
import express from 'express';
// 路由文件
import Session from 'express-session';
import adminUser from './router/admin-user';
import user from './router/user';

const app = express();
app.use(
  Session({
    secret: 'svg_check',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 30 * 60 * 1000, // 30 minutes
    },
  }),
);
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);
app.use(express.json());

app.use('/api', adminUser);
app.use('/api', user);

app.use((err) => {});
app.listen(9988, () => {
  console.log('开始掠夺吧');
});
