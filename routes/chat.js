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
  let writerId = new ObjectId(req.query.writerId);
  let loginUserId = req.user._id;

  // 1. postId를 근거로 채팅룸 생성여부 확인하기
  let existingChatroom = await db.collection('chatroom').findOne({
    postId: new ObjectId(req.query.postId),
    member: [writerId, loginUserId],
  });

  // 2. 없으면 신규 생성하는데,
  if (!existingChatroom) {
    // 2-1. 단, 글 작성자 본인과는 채팅 막기
    if (`${req.user._id}` === req.query.writerId) {
      return res.send('글 작성자 본인과는 채팅할 수 없습니다.');
      // 2-2. 신규생성
    } else {
      await db.collection('chatroom').insertOne({
        postId: new ObjectId(req.query.postId),
        chatName: req.query.chatName,
        member: [writerId, loginUserId], // 글 작성자, 로그인한 유저
        date: new Date(),
      });
      return res.redirect('/chat/list');
    }
    // 3. 이미 유저 간 생성된 채팅방이 있으면 해당 채팅방으로 유저를 이동시킴
  } else {
    let chatroomId = `${existingChatroom._id}`;
    res.redirect('/chat/detail/' + chatroomId);
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
    res.render('chatList.ejs', {
      chatlist: chatlist,
      loginUser: req.user._id,
    });
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

// 채팅 삭제기능
router.delete('/list', isLogin, async (req, res) => {
  try {
    await db
      .collection('chatroom')
      // 작성자 본인만 삭제 가능하게 구현 (id 일치와 user 일치 조건 모두 해당)
      .deleteOne({
        _id: new ObjectId(req.query.roomId),
        member: new ObjectId(req.user._id),
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
