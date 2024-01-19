const router = require('express').Router();
const connectDB = require('../database');
const { isLogin } = require('../middlewares/index');
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
    bucket: 'hjkimforum0',
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

// 게시물 작성 페이지 (+로그인한 사람만 글 작성 가능)
router.get('/', isLogin, async (req, res) => {
  if (req.user) {
    try {
      return res.render('write.ejs');
    } catch {
      res.send('로그인 후 이용해주세요.');
    }
  }
});

// 게시물 작성 (+try-catch 문을 이용한 예외처리 방법)
router.post('/add', upload.single('img1'), async (req, res) => {
  try {
    if (req.body.title == '' || req.body.content == '') {
      return res.send('제목 또는 내용을 입력하세요.');
    }

    // 업로드 성공한 경우에만 req.file.location에 접근
    await db.collection('post').insertOne({
      title: req.body.title,
      content: req.body.content,
      img: req.file ? req.file.location : null, // 이미지가 업로드된 경우에만 img 속성 추가
      category: req.body.category,
      // post 시 user 정보도 함께 저장
      user: req.user._id,
      username: req.user.username,
      userImage: req.user.img,
      date: formatDate2(),
    });
    res.redirect('/list/total');
  } catch (e) {
    console.log(e);
    res.status(500).send('서버 에러남');
  }
});

module.exports = router;
