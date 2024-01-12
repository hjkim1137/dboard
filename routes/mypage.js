const router = require('express').Router();
let connectDB = require('../database');
const { isLogin } = require('../middlewares/index');
const { isBlank } = require('../middlewares/index');
const bcrypt = require('bcrypt'); // bcrypt 세팅
const { ObjectId } = require('mongodb');

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

// 마이페이지
router.get('/', isLogin, async (req, res) => {
  if (req.user) {
    try {
      let result = await db
        .collection('user')
        .findOne({ _id: new ObjectId(req.user._id) });
      console.log('이미지 주소', result.img);
      return res.render('mypage.ejs', { result: result });
    } catch {
      res.send('로그인 후 이용해주세요.');
    }
  }
});

router.put(
  '/edit',
  isLogin,
  isBlank,
  upload.single('img1'),
  async (req, res) => {
    try {
      if (req.body.password !== req.body.password2) {
        res.send('비밀번호가 일치하지 않습니다.');
      } else if (req.body.password.length < 8) {
        res.send('비밀번호를 8자 이상 입력하세요.');
      } else {
        // 비밀번호 해싱하기
        let hash = await bcrypt.hash(req.body.password, 10);

        let imageFile = req.file ? req.file.location : null;

        console.log('클라에서 받은 이미지 주소1', req.body.sameimg);
        if (imageFile == null && req.body.sameimg) {
          imageFile = req.body.sameimg;
          console.log('클라에서 받은 이미지 주소2', imageFile);
        }

        // fileReader를 거쳐 새롭게 업로드 된 이미지가 있으면 그 url을 업로드함
        await db.collection('user').updateOne(
          { _id: new ObjectId(req.user._id) },
          {
            $set: {
              password: hash,
              img: imageFile,
            },
          }
        );
        return res.redirect('back');
      }
    } catch (error) {
      console.error('에러메세지', error);
      return res.status(500).send('서버 에러');
    }
  }
);

module.exports = router;
