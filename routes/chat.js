const router = require('express').Router();
let connectDB = require('../database');
const { ObjectId } = require('mongodb');
const { isLogin } = require('../middlewares/index');

// monogoDB 연결
let db;
connectDB
  .then((client) => {
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
        userImages: [req.query.writerImg, req.user.img],
        date: new Date().toLocaleString('ko-KR'),
      });
      return res.redirect('/chat/list');
    }
    // 3. 이미 유저 간 생성된 채팅방이 있으면 해당 채팅방으로 유저를 이동시킴
  } else {
    let chatroomId = `${existingChatroom._id}`;
    res.redirect('/chat/detail?roomid=' + chatroomId);
  }
});

// 채팅방 목록 페이지
// 현재 채팅방에 속해있는 유저만 조회 하도록 수정
router.get('/list', isLogin, async (req, res) => {
  // chatroom null 일 경우 대비 예외처리

  if (req.user) {
    try {
      let chatlist = await db
        .collection('chatroom')
        .find({ member: req.user._id })
        .toArray();

      let chats = [];

      if (chatlist.length > 0) {
        // 각 채팅방의 ObjectId를 배열로 만듦
        const roomIds = chatlist.map((chat) => new ObjectId(chat._id));

        // 모든 채팅방에 대한 최신 메시지를 가져오기
        for (let i = 0; i < roomIds.length; i++) {
          const latestChat = await db
            .collection('chat')
            .find({ roomId: roomIds[i] })
            .sort({ date: -1 })
            .limit(1)
            .toArray();

          if (latestChat.length > 0) {
            chats.push(latestChat[0]);
          }
        }

        // 현재 로그인한 유저가 속한 채팅방들을 꺼내어 Chalist로 렌더링
        res.render('chatList.ejs', {
          chatlist: chatlist,
          loginUser: req.user._id,
          lastChat: chats,
        });

        // 생성된 채팅룸이 1개도 없는 경우에 대한 res 예외 처리(그렇지 않으면 무한 요청함)
      } else {
        res.render('chatList.ejs', {
          chatlist: [],
          loginUser: req.user._id,
          lastChat: [],
        });
      }
    } catch (e) {
      console.error(e);
      res.status(500).send('Internal Server Error');
    }
  }
});

// 채팅방 상세페이지(chatList 페이지에서 채팅방 이름 누를때)
// detail/id == chatlist[i]._id
// --> 현재 로그인한 유저가 속한 채팅방들의 정보(채팅방 id, 채팅방 이름, 참여자id List, date)

router.get('/detail', isLogin, async (req, res) => {
  let chats = await db
    .collection('chat')
    .find({ roomId: new ObjectId(req.query.roomid) })
    .toArray();

  let roomID = await db
    .collection('chatroom')
    .findOne({ _id: new ObjectId(req.query.roomid) });

  // 이전 DB에 userImages 필드 자체가 없는 경우도 있어 함수 만듦
  function showImage() {
    // 상대방의 이미지는 내 이미지와 일치하지 않는 것을 조건을 줌
    let imgs = roomID.userImages;
    if (imgs) {
      let yourImg = imgs.find((img) => img !== req.user.img);
      return yourImg;
    } else return null;
  }
  console.log('return 값:', showImage());

  res.render('chatDetail.ejs', {
    chats: chats,
    // current info
    roomId: req.query.roomid,
    requestedUserId: new ObjectId(req.user._id),
    username: req.user.username,

    yourimg: showImage(),
    userimg: req.user.img,
  });
});

// 채팅 삭제기능
router.delete('/list', isLogin, async (req, res) => {
  try {
    let deleteRoomResult = await db
      .collection('chatroom')
      // 작성자 본인만 삭제 가능하게 구현 (id 일치와 user 일치 조건 모두 해당)
      .deleteOne({
        _id: new ObjectId(req.query.roomId),
        member: new ObjectId(req.user._id),
      });

    // 연결된 chat도 모두 삭제
    let deleteChatResult = await db.collection('chat').deleteMany({
      roomId: new ObjectId(req.query.roomId),
      userId: new ObjectId(req.user._id),
    });

    // 삭제 작업 후에 반환되는 결과를 나타내는 객체인 DeleteResult에 삭제된 문서의 개수인 deletedCount 속성이 포함돼있음
    if (
      deleteRoomResult.deletedCount > 0 &&
      deleteChatResult.deletedCount > 0
    ) {
      return res.send('삭제완료');
    } else {
      return res.send('삭제할 데이터가 없습니다.');
    }
    // (참고) ajax 요청 사용시 새고로침 안하는게 장점이라 쓰는거라
    // res.redirect, res.render 사용 안하는게 나음
  } catch (e) {
    res.send('오류 발생 또는 삭제권한 없음');
    console.log(e);
  }
});

module.exports = router;
