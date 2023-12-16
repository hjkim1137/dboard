const router = require('express').Router();
let connectDB = require('../database');
const { ObjectId } = require('mongodb');
const { isLogin } = require('../middleware/index');

// monogoDB 연결
let db;
connectDB
  .then((client) => {
    console.log('Detail 섹션-DB 연결성공');
    db = client.db('forum'); // forum db 연결
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// 게시물 상세페이지(url 파라미터)
// detail 다음에 아무 문자를 입력하면
router.get('/:id', isLogin, async (req, res) => {
  // db에 id가 ~인 게시물 가져오기

  // 예외처리
  try {
    let result = await db
      .collection('post')
      .findOne({ _id: new ObjectId(req.params.id) }); //db에 저장된 id와 대조

    let comment = await db
      .collection('comment')
      .find({ parentId: new ObjectId(req.params.id) })
      .toArray();

    res.render('detail.ejs', { result: result, comment: comment });

    // null 처리(parameter가 길이는 맞는데 틀리는 경우 등)
    if (result == null || comment == null) {
      res.status(400).send('이상한 url 입력함');
    }
  } catch (e) {
    console.log(e);
  }
});

// 댓글 전송 기능
router.post('/comment', isLogin, async (req, res) => {
  try {
    if (req.body.comment == '') {
      return res.send('댓글을 입력하세요.');
    }

    await db.collection('comment').insertOne({
      comment: req.body.comment,
      parentId: new ObjectId(req.body.parentId),
      writerId: new ObjectId(req.user._id),
      writer: req.user.username,
    });
    res.redirect('back');
  } catch (e) {
    console.log(e);
    res.status(500).send('서버 에러남');
  }
});

module.exports = router;
