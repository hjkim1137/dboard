const router = require('express').Router();
let connectDB = require('../database');
const { ObjectId } = require('mongodb');
const { isLogin } = require('../middlewares/index');

// monogoDB 연결
let db;
connectDB
  .then((client) => {
    console.log('Delete 섹션-DB 연결성공');
    db = client.db('forum'); // forum db 연결
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// 게시물 삭제 기능
router.delete('/', isLogin, async (req, res) => {
  console.log(req.query);
  try {
    await db
      .collection('post')
      // 작성자 본인만 삭제 가능하게 구현 (id 일치와 user 일치 조건 모두 해당)
      .deleteOne({
        _id: new ObjectId(req.query.docId),
        user: new ObjectId(req.user._id),
      });
    res.send('삭제완료');
    // (참고) ajax 요청 사용시 새고로침 안하는게 장점이라 쓰는거라
    // res.redirect, res.render 사용 안하는게 나음
  } catch (e) {
    res.send('오류 발생 또는 삭제권한 없음');
    console.log(e);
  }
});

module.exports = router;
