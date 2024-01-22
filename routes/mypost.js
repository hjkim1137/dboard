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

// 채팅방 목록 페이지
// 현재 채팅방에 속해있는 유저만 조회 하도록 수정
router.get('/', isLogin, async (req, res) => {
  let commentCount = {};

  if (req.user) {
    try {
      let loginuser = req.user._id;
      let myposts = await db
        .collection('post')
        .find({ user: req.user._id })
        .toArray();

      // 게시글 당 댓글 수 구하기
      for (const post of myposts) {
        let comments = await db
          .collection('comment')
          .find({ parentId: post._id })
          .toArray();

        // 댓글 달린 것만 보냄
        if (comments.length > 0) {
          commentCount[post._id] = comments.length; // 키와 밸류
        }
      }

      if (myposts.length > 0) {
        res.render('myPost.ejs', {
          loginUser: loginuser,
          myposts: myposts,
          commentCount: commentCount,
        });
        // 작성한 글이 1개도 없는 경우에 대한 res 예외 처리(그렇지 않으면 무한 요청함)
      } else {
        return res.render('myPost.ejs', {
          myposts: [],
        });
      }
    } catch (e) {
      console.error(e);
      res.status(500).send('Internal Server Error');
    }
  }
});

module.exports = router;
