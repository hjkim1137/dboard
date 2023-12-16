const router = require('express').Router();
let connectDB = require('../database');
const { ObjectId } = require('mongodb');

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

// 채팅방 개설하기(detail 페이지에서 채팅하기 누를때)
// 현재 채팅방에 속해있는 유저만 조회 하도록 수정
router.get('/request', async (req, res) => {
  await db.collection('chat').insertOne({
    member: [req.user._id, new ObjectId(req.query.writerId)], // 로그인한 유저, 글 작성자
    date: new Date(),
  });
  res.redirect('/chat/list');
});

// 채팅방 목록 페이지
// 현재 채팅방에 속해있는 유저만 조회 하도록 수정
router.get('/list', async (req, res) => {
  let chatlist = await db
    .collection('chat')
    .find({ member: req.user._id }) // "내가" 속한 채팅방 꺼내오기
    .toArray();
  res.render('chatList.ejs', { chatlist: chatlist });
});

// 채팅방 상세페이지(chatList 페이지에서 채팅방 이름 누를때)
// 현재 채팅방에 속해있는 유저만 조회 하도록 수정
router.get('/detail/:id', async (req, res) => {
  let chats = await db
    .collection('chat')
    .findOne({ _id: new ObjectId(req.params.id) });
  res.render('chatDetail.ejs', { chats: chats });
});

module.exports = router;
