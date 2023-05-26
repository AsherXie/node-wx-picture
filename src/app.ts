// import express from 'express';
import express from 'express';

const app = express();
app.use(express.json());

app.listen(9988, () => {
  console.log('开始掠夺吧');
});
