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

// 게시물 삭제 기능
router.delete('/', isLogin, async (req, res) => {
  try {
    await db
      .collection('post')
      // 작성자 본인만 삭제 가능하게 구현 (id 일치와 user 일치 조건 모두 해당)
      .deleteOne({
        _id: new ObjectId(req.query.docId),
        user: new ObjectId(req.user._id),
      });

    await db.collection('comment').deleteMany({
      parentId: new ObjectId(req.query.docId),
      writerId: new ObjectId(req.user._id),
    });
    res.send('게시글 삭제완료');
  } catch (e) {
    res.send('오류 발생 또는 삭제권한 없음');
    console.log(e);
  }
});

// 댓글 삭제기능
router.delete('/comment', isLogin, async (req, res) => {
  try {
    await db.collection('comment').deleteOne({
      _id: new ObjectId(req.query.commentId),
      writerId: new ObjectId(req.user._id),
    });
    res.send('댓글 삭제완료');
  } catch (e) {
    res.send('오류 발생 또는 삭제권한 없음');
    console.log(e);
  }
});

module.exports = router;
