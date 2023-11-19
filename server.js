const { Console } = require('console');
const express = require('express');
const app = express();

app.use(express.static(__dirname + '/public'));
// EJS 세팅
app.set('view engine', 'ejs');

const { MongoClient } = require('mongodb');

let db;
const url =
  'mongodb+srv://test:test1234@cluster0.0v3t3as.mongodb.net/?retryWrites=true&w=majority';
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log('DB연결성공');
    db = client.db('forum'); // forum db 연결
    // 서버 띄우는 코드 여기로 옮기기
    app.listen(8080, () => {
      console.log('http://localhost:8080 에서 서버 실행중');
    });
  })
  .catch((err) => {
    console.log(err);
  });

// 1. 누가 / 접속시 app.get() 함수 실행됨
// 2. 그 다음 콜백함수 실행됨
app.get('/', (요청, 응답) => {
  응답.sendFile(__dirname + '/index.html');
});

app.get('/about', (요청, 응답) => {
  응답.sendFile(__dirname + '/about.html');
});

app.get('/news', (요청, 응답) => {
  // db에 저장하는 코드
  db.collection('post').insertOne({ title: '어쩌구' });
  // 응답.send('뉴스 페이지');
});

app.get('/shop', (요청, 응답) => {
  응답.send('쇼핑 페이지 입니다');
});

app.get('/list', async (요청, 응답) => {
  let result = await db.collection('post').find().toArray(); //db의 모든 document 가져옴
  console.log(result);
  응답.send('DB 게시글 목록입니다');
});
