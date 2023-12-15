const router = require('express').Router();
let connectDB = require('../database');
const { isLogin } = require('../middleware/index');
const { isBlank } = require('../middleware/index');
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
router.get('/', isLogin, (req, res) => {
  console.log('마이페이지 유저 정보', req.user);
  res.render('mypage.ejs', { user: req.user });
});

// 비밀번호 수정(오류중)
router.put('/edit', isLogin, isBlank, async (req, res) => {
  console.log('마이페이지 로그인 유저', req.user);

  try {
    if (req.body.password !== req.body.password2) {
      res.send('비밀번호가 일치하지 않습니다.');
    }
    if (req.body.password.length < 8) {
      res.send('비밀번호를 8자 이상 입력하세요.');
    } else {
      // 비밀번호 해싱하기
      let hash = await bcrypt.hash(req.body.password, 10);
      console.log('hash', hash);

      await db.collection('user').updateOne(
        { _id: new ObjectId(req.user._id) },
        {
          $set: {
            password: hash,
          },
        }
      );
    }
  } catch (error) {
    console.error('에러메세지', error);
    return res.status(500).send('서버 에러');
  }
});

module.exports = router;
