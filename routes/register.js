const router = require('express').Router();
let connectDB = require('../database');
const { isBlank } = require('../middlewares/index');
const bcrypt = require('bcrypt'); // bcrypt 세팅

// monogoDB 연결
let db;
connectDB
  .then((client) => {
    console.log('register 섹션-DB 연결성공');
    db = client.db('forum'); // forum db 연결
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// 회원가입기능
router.get('/', (req, res) => {
  res.render('register.ejs');
});

router.post('/', isBlank, async (req, res) => {
  console.log('유저가 회원가입 형식에 입력한 내용', req.body);
  try {
    let data = await db
      .collection('user')
      .findOne({ username: req.body.username });
    if (data) {
      res.send('이미 존재하는 ID 입니다. 새로운 ID를 입력해주세요.');
    } else {
      if (req.body.password.length < 8) {
        res.send('비밀번호를 8자 이상 입력하세요.');
      }
      if (req.body.password != req.body.password2) {
        res.send('비밀번호가 일치하지 않습니다.');
      } else {
        // 비밀번호 해싱하기
        let hash = await bcrypt.hash(req.body.password, 10);

        await db.collection('user').insertOne({
          username: req.body.username,
          password: hash,
        });
        res.redirect('/');
      }
    }
  } catch (e) {
    console.log(e);
  }
});

module.exports = router;
