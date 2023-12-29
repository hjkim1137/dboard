const router = require('express').Router();
let connectDB = require('../database');
const { ObjectId } = require('mongodb');
const { isLogin } = require('../middlewares/index');

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
router.get('/request', async (req, res) => {
  // 1. postId를 근거로 채팅룸 생성여부 확인하기
  let existingChatroom = await db.collection('chatroom').findOne({
    postId: new ObjectId(req.query.postId),
  });

  if (existingChatroom) {
    // 2. 이미 유저 간 생성된 채팅방이 있으면 해당 채팅방으로 유저를 이동시킴
    let roomId = `${existingChatroom._id}`;
    res.redirect('/chat/detail/' + roomId);
  } else {
    // 3-1. 없으면 신규 생성하는데, 단, 글 작성자 본인과는 채팅 막기
    if (`${req.user._id}` === req.query.writerId) {
      return res.send('글 작성자 본인과는 채팅할 수 없습니다.');
      // 3-2. 신규생성
    } else {
      let writerId = new ObjectId(req.query.writerId);
      let loginUserId = req.user._id;

      await db.collection('chatroom').insertOne({
        postId: new ObjectId(req.query.postId),
        chatName: req.query.chatName,
        member: [writerId, loginUserId], // 글 작성자, 로그인한 유저
        date: new Date(),
      });
      return res.redirect('/chat/list');
    }
  }
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
