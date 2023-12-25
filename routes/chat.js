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

// 채팅방 개설하기(detail 페이지에서 채팅하기 누를때)
// 현재 채팅방에 속해있는 유저만 조회 하도록 수정
router.get('/request', async (req, res) => {
  await db.collection('chatroom').insertOne({
    chatName: req.query.chatName,
    member: [new ObjectId(req.query.writerId), req.user._id], // 글 작성자, 로그인한 유저
    date: new Date(),
  });
  res.redirect('/chat/list');
});

// 채팅방 목록 페이지
// 현재 채팅방에 속해있는 유저만 조회 하도록 수정
router.get('/list', isLogin, async (req, res) => {
  // chatroom null 일 경우 대비 예외처리
  try {
    let chatlist = await db
      .collection('chatroom')
      .find({ member: req.user._id })
      .toArray();
    // 현재 로그인한 유저가 속한 채팅방들을 꺼내어 Chalist로 render
    res.render('chatList.ejs', { chatlist: chatlist });
  } catch (e) {
    console.log(e);
  }
});

// 채팅방 상세페이지(chatList 페이지에서 채팅방 이름 누를때)
// detail/id == chatlist[i]._id
// --> 현재 로그인한 유저가 속한 채팅방들의 정보(채팅방 id, 채팅방 이름, 참여자id List, date)

router.get('/detail/:roomId', isLogin, async (req, res) => {
  console.log('현재 로그인한 유저:', req.user.username);

  let chats = await db
    .collection('chat')
    .find({ roomId: new ObjectId(req.params.roomId) })
    .toArray();

  res.render('chatDetail.ejs', {
    chats: chats,
    // current info
    roomId: req.params.roomId,
    requestedUserId: new ObjectId(req.user._id),
    username: req.user.username,
  });
});

module.exports = router;
