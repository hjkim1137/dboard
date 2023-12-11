const router = require('express').Router();
let connectDB = require('../database');

// monogoDB 연결
let db;
connectDB
  .then((client) => {
    console.log('search 섹션-DB 연결성공');
    db = client.db('forum'); // forum db 연결
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// 게시물 검색 기능
router.get('/', async (req, res) => {
  console.log('검색어', req.query.keyword);
  try {
    let result = await db
      .collection('post')
      .find({ title: { $regex: req.query.keyword } })
      .toArray();
    res.render('search.ejs', { 글목록: result });
  } catch (e) {
    console.log(e);
  }
});
module.exports = router;
