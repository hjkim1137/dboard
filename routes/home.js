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

// 카테고리 - 전체 페이지
router.get('/', isLogin, async (req, res) => {
  let commentCount = {};

  try {
    let loginuser = req.user ? new ObjectId(req.user._id) : null;
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

    return res.render('home.ejs', {
      boardPosts: posts,
      loginUser: loginuser,
      commentCount: commentCount,
    });
  } catch (e) {
    console.log(e);
  }
});

// 카테고리 - 중고거래 페이지
router.get('/secondhand', isLogin, async (req, res) => {
  let commentCount = {};
  let secondhand = [];

  try {
    let loginuser = req.user ? new ObjectId(req.user._id) : null;
    let posts = await db.collection('post').find().toArray();

    // 중고거래 게시물 선별
    for (const post of posts) {
      if (post.category === '중고거래') {
        secondhand.push(post);
      }
    }

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

    return res.render('homesecondhand.ejs', {
      posts: posts,
      secondhand: secondhand,
      loginUser: loginuser,
      commentCount: commentCount,
    });
  } catch (e) {
    console.log(e);
  }
});

// 카테고리 - 세일정보 페이지
router.get('/sale', isLogin, async (req, res) => {
  let commentCount = {};
  let saleInfo = [];

  try {
    let loginuser = req.user ? new ObjectId(req.user._id) : null;
    let posts = await db.collection('post').find().toArray();

    // 세일정보 게시물 선별
    for (const post of posts) {
      if (post.category === '세일정보') {
        saleInfo.push(post);
      }
    }

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

    return res.render('homesale.ejs', {
      posts: posts,
      saleInfo: saleInfo,
      loginUser: loginuser,
      commentCount: commentCount,
    });
  } catch (e) {
    console.log(e);
  }
});

// 카테고리 - 살림노하우 페이지
router.get('/tips', isLogin, async (req, res) => {
  let commentCount = {};
  let tips = [];

  try {
    let loginuser = req.user ? new ObjectId(req.user._id) : null;
    let posts = await db.collection('post').find().toArray();

    // 살림노하우 게시물 선별
    for (const post of posts) {
      if (post.category === '살림노하우') {
        tips.push(post);
      }
    }

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

    return res.render('hometips.ejs', {
      posts: posts,
      tips: tips,
      loginUser: loginuser,
      commentCount: commentCount,
    });
  } catch (e) {
    console.log(e);
  }
});

module.exports = router;
