const router = require('express').Router();
let connectDB = require('../database');
const { ObjectId } = require('mongodb');
const { isLogin } = require('../middlewares/index');

// monogoDB 연결
let db;
connectDB
  .then((client) => {
    db = client.db('forum'); // forum db 연결
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// 목록 페이지
router.get('/', isLogin, async (req, res) => {
  let result = await db.collection('post').find().limit(5).toArray();
  try {
    let loginuser = new ObjectId(req.user._id);
    return res.render('list.ejs', { 글목록: result, loginUser: loginuser });
  } catch (e) {
    console.log(e);
  }
});

// 페이지네이션 만들기
router.get('/:id', async (req, res) => {
  // skip(5).limit(5) 맨 처음~5개 스킵하고 거기서 부터 다음 5개 가져옴
  let loginuser = new ObjectId(req.user._id);

  let result = await db
    .collection('post')
    .find()
    // 1번째 페이지면 0개 스킵: 1 -> 0
    // 2번째 페이지면 5개 스킵: 2 -> 5
    // 3번째 페이지면 10개 스킵: 3 -> 10
    .skip((req.params.id - 1) * 5)
    .limit(5)
    .toArray();
  res.render('list.ejs', { 글목록: result, loginUser: loginuser });
});

// 다음 게시물 5개 보기 기능(장점: 매우 빠름, 단점: 다음 버튼으로 바꿔야함)
router.get('/next/:id', async (req, res) => {
  let loginuser = new ObjectId(req.user._id);
  let result = await db
    .collection('post')
    // 특정 조건 다음의 게시물 5개 가져오는 방법:
    // 형식: .find({ _id: { $gt: 방금본마지막게시물_id } })
    .find({ _id: { $gt: new ObjectId(req.params.id) } })
    .limit(5)
    .toArray();
  res.render('list.ejs', { 글목록: result, loginUser: loginuser });
});

module.exports = router;
