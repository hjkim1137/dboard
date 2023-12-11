const router = require('express').Router();
let connectDB = require('../database');
const { ObjectId } = require('mongodb');

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
router.delete('/', async (req, res) => {
  console.log(req.query);
  try {
    await db
      .collection('post')
      .deleteOne({ _id: new ObjectId(req.query.docId) });
    res.send('삭제완료');
    // (참고) ajax 요청 사용시 새고로침 안하는게 장점이라 쓰는거라
    // res.redirect, res.render 사용 안하는게 나음
  } catch (e) {
    console.log(e);
  }
});
module.exports = router;
