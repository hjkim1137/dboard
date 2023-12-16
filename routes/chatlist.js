const router = require('express').Router();
let connectDB = require('../database');

// monogoDB 연결
let db;
connectDB
  .then((client) => {
    console.log('chatlist 섹션-DB 연결성공');
    db = client.db('forum'); // forum db 연결
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// 목록 페이지
router.get('/', async (req, res) => {
  let chatlist = await db.collection('chat').find().toArray();
  res.render('chatlist.ejs', { chatlist: chatlist });
});

module.exports = router;
