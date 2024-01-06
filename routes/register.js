const router = require('express').Router();
let connectDB = require('../database');
const { isBlank } = require('../middlewares/index');
const bcrypt = require('bcrypt'); // bcrypt 세팅
const { formatDate2 } = require('../utils/date');

// multer 세팅
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3 = new S3Client({
  region: 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'hjkimforum11',
    key: function (req, file, cb) {
      cb(null, Date.now().toString()); // 업로드시 파일명 변경가능
    },
  }),
});

// monogoDB 연결
let db;
connectDB
  .then((client) => {
    db = client.db('forum'); // forum db 연결
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// 회원가입기능
router.get('/', (req, res) => {
  res.render('register.ejs');
});

router.post('/', isBlank, upload.single('img1'), async (req, res) => {
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
          img: req.file ? req.file.location : null,
          username: req.body.username,
          password: hash,
          created: formatDate2(),
        });
        res.redirect('/');
      }
    }
  } catch (e) {
    console.log(e);
  }
});

module.exports = router;
