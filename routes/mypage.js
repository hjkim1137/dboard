const router = require('express').Router();
let connectDB = require('../database');
const { isLogin } = require('../middleware/index');

// monogoDB 연결
let db;
connectDB
  .then((client) => {
    console.log('DB연결성공');
    db = client.db('forum'); // forum db 연결
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// 마이페이지
router.get('/', isLogin, (req, res) => {
  console.log('마이페이지 유저 정보', req.user);
  res.render('mypage.ejs', { user: req.user });
});

module.exports = router;
