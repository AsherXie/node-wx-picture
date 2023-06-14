export default () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  const tomorrow = new Date(year, month, day + 1); // 获取明天的日期
  const midnight = new Date(year, month, day, 23, 59, 59); // 获取今天的午夜时间
  return Math.floor((tomorrow.getTime() - midnight.getTime()) / 1000); // 返回剩余的
};
