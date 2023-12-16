const router = require('express').Router();
let connectDB = require('../database');
const { ObjectId } = require('mongodb');
const { isLogin } = require('../middleware/index');

// monogoDB 연결
let db;
connectDB
  .then((client) => {
    console.log('chat-DB 연결성공');
    db = client.db('forum'); // forum db 연결
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// 채팅방 조회기능
router.get('/:id', isLogin, async (req, res) => {
  // 팁: 서버에서 정보를 찾을 수 없으면 - 유저에게 보내라고 하거나/DB에서 꺼내보거나
  let chat = await db
    .collection('chat')
    .findOne({ parentId: new ObjectId(req.params.id) });
  res.render('chatdetail.ejs', { chat: chat });
  console.log('chat', chat);
});

module.exports = router;
