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

// 목록 페이지
router.get('/', isLogin, async (req, res) => {
  let commentCount = {};

  try {
    let posts = await db.collection('post').find().toArray();

    // 게시글 당 댓글 수 구하기
    for (const post of posts) {
      let comments = await db
        .collection('comment')
        .find({ parentId: post._id })
        .toArray();

      // 댓글 달린 것만 보냄
      if (comments.length > 0) {
        commentCount[post._id] = comments.length; // 키와 밸류
      }
    }

    let loginuser = req.user ? new ObjectId(req.user._id) : null;

    return res.render('list.ejs', {
      boardPosts: posts,
      loginUser: loginuser,
      commentCount: commentCount,
    });
  } catch (e) {
    console.log(e);
  }
});

// 페이지네이션 만들기
// router.get('/:id', async (req, res) => {
//   // skip(5).limit(5) 맨 처음~5개 스킵하고 거기서 부터 다음 5개 가져옴
//   let loginuser = new ObjectId(req.user._id);

//   let result = await db
//     .collection('post')
//     .find()
//     // 1번째 페이지면 0개 스킵: 1 -> 0
//     // 2번째 페이지면 5개 스킵: 2 -> 5
//     // 3번째 페이지면 10개 스킵: 3 -> 10
//     .skip((req.params.id - 1) * 5)
//     .limit(5)
//     .toArray();
//   res.render('list.ejs', { boardPosts: result, loginUser: loginuser });
// });

// // 다음 게시물 5개 보기 기능(장점: 매우 빠름, 단점: 다음 버튼으로 바꿔야함)
// router.get('/next/:id', async (req, res) => {
//   let loginuser = new ObjectId(req.user._id);
//   let result = await db
//     .collection('post')
//     // 특정 조건 다음의 게시물 5개 가져오는 방법:
//     // 형식: .find({ _id: { $gt: 방금본마지막게시물_id } })
//     .find({ _id: { $gt: new ObjectId(req.params.id) } })
//     .limit(5)
//     .toArray();
//   res.render('list.ejs', { boardPosts: result, loginUser: loginuser });
// });

module.exports = router;
