const router = require('express').Router();
const { isLogin } = require('../middleware/index');

// 마이페이지
router.get('/', isLogin, (req, res) => {
  console.log('마이페이지 유저 정보', req.user);
  res.render('mypage.ejs', { user: req.user });
});

module.exports = router;
