const router = require('express').Router();
let connectDB = require('../database');
const { ObjectId } = require('mongodb');
const { isLogin } = require('../middleware/index');

// monogoDB 연결
let db;
connectDB
  .then((client) => {
    console.log('edit 섹션-DB 연결성공');
    db = client.db('forum'); // forum db 연결
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// 게시물 수정기능(조회)
router.get('/:id', isLogin, async (req, res) => {
  // 팁: 서버에서 정보를 찾을 수 없으면 - 유저에게 보내라고 하거나/DB에서 꺼내보거나
  let result = await db
    .collection('post')
    .findOne({ _id: new ObjectId(req.params.id) });
  res.render('edit.ejs', { result: result });
  console.log('result', result);
});

// 게시물 수정기능(DB 전송 - $set)
router.put('/', isLogin, async (req, res) => {
  // 팁: 서버에서 정보를 찾을 수 없으면 - 유저에게 보내라고 하거나/DB에서 꺼내보거나
  try {
    await db.collection('post').updateOne(
      // 2개 조건 만족- 게시물 id와 user id를 동시에 만족하는 post를 찾아서 업데이트($set)
      { _id: new ObjectId(req.body.id), user: new ObjectId(req.user._id) },
      { $set: { title: req.body.title, content: req.body.content } }
    );
    res.redirect('/list');
  } catch (e) {
    console.log(e);
  }
});

// 게시물 수정기능(DB 전송 - $inc)
router.put('/', isLogin, async (req, res) => {
  // 팁: 서버에서 정보를 찾을 수 없으면 - 유저에게 보내라고 하거나/DB에서 꺼내보거나
  try {
    await db.collection('post').updateOne({ _id: 1 }, { $inc: { like: 2 } });
    // $inc는 기존값에 +/- 하라는 뜻 예) 2-> +2, -2 -> -2
    res.redirect('/list');
  } catch (e) {
    console.log(e);
  }
});

// 동시에 document 여러개 수정
// await db.collection('post').updateMany({ _id: 1 }, { $set: { like: 2 } });

// 동시에 document 여러개 수정 - 조건식 입력(like가 10 이상인 것 일괄 수정)
// await db.collection('post').updateMany({ like:{$gt:10} }, { $set: { like: 2 } });

module.exports = router;
