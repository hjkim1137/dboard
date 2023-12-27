const router = require('express').Router();
let connectDB = require('../database');
const { isLogin } = require('../middlewares/index');
const { isBlank } = require('../middlewares/index');
const bcrypt = require('bcrypt'); // bcrypt 세팅
const { ObjectId } = require('mongodb');

// monogoDB 연결
let db;
connectDB
  .then((client) => {
    console.log('mypage섹션-DB 연결성공');
    db = client.db('forum'); // forum db 연결
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// 마이페이지
router.get('/', isLogin, async (req, res) => {
  if (req.user) {
    try {
      return res.render('mypage.ejs', { user: req.user });
    } catch {
      res.send('로그인 후 이용해주세요.');
    }
  }
});

router.put('/edit', isLogin, isBlank, async (req, res) => {
  try {
    if (req.body.password !== req.body.password2) {
      res.send('비밀번호가 일치하지 않습니다.');
    } else if (req.body.password.length < 8) {
      res.send('비밀번호를 8자 이상 입력하세요.');
    } else {
      // 비밀번호 해싱하기
      let hash = await bcrypt.hash(req.body.password, 10);

      await db.collection('user').updateOne(
        { _id: new ObjectId(req.user._id) },
        {
          $set: {
            password: hash,
          },
        }
      );
      return res.redirect('/');
    }
  } catch (error) {
    console.error('에러메세지', error);
    return res.status(500).send('서버 에러');
  }
});

module.exports = router;
