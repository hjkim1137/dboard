const router = require('express').Router();
let connectDB = require('../database');

// monogoDB 연결
let db;
connectDB
  .then((client) => {
    console.log('search 섹션-DB 연결성공');
    db = client.db('forum'); // forum db 연결
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// 1. 정규식을 사용한 게시물 검색 기능
// router.get('/', async (req, res) => {
//   console.log('검색어', req.query.keyword);
//   try {
//     let result = await db
//       .collection('post')
//       .find({ title: { $regex: req.query.keyword } }) // 검색어와 근접한 단어 찾기에 관한 정규식
//       .toArray();
//     res.render('search.ejs', { 글목록: result });
//   } catch (e) {
//     console.log(e);
//   }
// });

// 2. 인덱스를 사용한 검색기능(정확한 단어 기준으로만 검색된다는 단점) -> 해결방안: search Index(Full text index) 만들기
// router.get('/', async (req, res) => {
//   console.log('검색어', req.query.keyword);
//   try {
//     let result = await db
//       .collection('post')
//       .find({ $text: { $search: req.query.keyword } })
//       .toArray();
//     // 해당 쿼리가 얼마나 걸리는 지 계산해줌
//     // .find({ $text: { $search: req.query.keyword } }).explain('executionStats');
//     res.render('search.ejs', { 글목록: result });
//   } catch (e) {
//     console.log(e);
//   }
// });

// 3. 몽고 DB search Index 활용해 검색
router.get('/', async (req, res) => {
  console.log('검색어', req.query.keyword);
  // 조건 여러개 넣을 수 있다.
  let 검색조건 = [
    {
      $search: {
        index: 'title_index', // 몽고 DB에서 만든 index 이름
        text: { query: req.query.keyword, path: 'title' },
        // query: 검색어, path: 검색하는 필드목록(위의 인덱스는 미리 만들어놔야함)
      },
    },
    // { $sort: { _id: 1 } }, // id순 오름차순 정렬(1은 숫자가 아니라 차순 구분임)
    // { $project: { title: 0 } }, // title 필드 숨기기:0, 보이기:1
  ];

  try {
    let result = await db.collection('post').aggregate(검색조건).toArray();
    res.render('search.ejs', { 글목록: result });
  } catch (e) {
    console.log(e);
  }
});

// 3-1. 응용-검색 페이지네이션 만들기(오류 있음)
router.get('/:pageId', async (req, res) => {
  console.log('페이지 ID', req.params.pageId);
  const keyword = req.query.keyword;

  let conditions = [
    {
      $search: {
        index: 'title_index',
        text: {
          query: keyword,
          // 오류 : text.query is required(매번 검색하지 않고, 첫 검색어를 계속 활용하는 방안을 고민해야 함..)
          path: 'title',
        },
      },
    },
    { $skip: (req.params.pageId - 1) * 5 },
    { $limit: 5 },
  ];

  try {
    let result = await db.collection('post').aggregate(conditions).toArray();
    res.render('search.ejs', { 글목록: result, userInput: keyword });
  } catch (e) {
    console.log(e);
  }
});

module.exports = router;
