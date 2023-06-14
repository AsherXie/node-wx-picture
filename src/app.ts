import express from 'express';

// 服务端session
import Session from 'express-session';

// 路由文件
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

app.listen(9988, () => {
  console.log('让我们来猎杀那些陷入黑暗中的人吧！');
});
