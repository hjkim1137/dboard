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

// 응답을 보낸 후 함수 실행을 중지시키기 위해 각각 return
router.post('/', isBlank, upload.single('img1'), async (req, res) => {
  try {
    let data = await db
      .collection('user')
      .findOne({ username: req.body.username });
    if (data) {
      return res.send('이미 존재하는 ID 입니다. 새로운 ID를 입력해주세요.');
    }
    if (req.body.password.length < 8) {
      return res.send('비밀번호를 8자 이상 입력하세요.');
    }
    if (req.body.password != req.body.password2) {
      return res.send('비밀번호가 일치하지 않습니다.');
    }
    // 비밀번호 해싱하기
    let hash = await bcrypt.hash(req.body.password, 10);
    let imageFile = req.file ? req.file.location : null;

    if (!req.body.nullimg) {
      imageFile = null;
    }

    await db.collection('user').insertOne({
      img: imageFile,
      username: req.body.username,
      password: hash,
      created: formatDate2(),
    });
    res.redirect('/login');
  } catch (e) {
    console.log(e);
    res.status(500).send('내부 서버 오류');
  }
});

module.exports = router;
