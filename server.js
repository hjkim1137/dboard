const express = require('express');
const app = express();

// public 폴더 등록
app.use(express.static(__dirname + '/public'));

// EJS 세팅
app.set('view engine', 'ejs');

// monogoDB 연결
const { MongoClient } = require('mongodb');
let db;
const url =
  'mongodb+srv://test:test1234@cluster0.0v3t3as.mongodb.net/?retryWrites=true&w=majority';
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log('DB연결성공');
    db = client.db('forum'); // forum db 연결

    // 서버 시작 코드 여기로 옮기기
    const PORT = 8080;
    app.listen(PORT, () => {
      console.log(`http://localhost:${PORT} 에서 서버 실행중`);
    });
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// 1. 누가 / 접속시 app.get() 함수 실행됨
// 2. 그 다음 콜백함수 실행됨
app.get('/', (요청, 응답) => {
  // html 파일 보내는 법
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
  // 화면에 문장을 뿌려줌
  응답.send('쇼핑 페이지 입니다');
});

app.get('/list', async (요청, 응답) => {
  let result = await db.collection('post').find().toArray();
  // 응답.send(result[0].title);
  응답.render('list.ejs', { 글목록: result });
});

// app.get('/time', (요청, 응답) => {
//   let time = new Date();
//   응답.render('time.ejs', { time });
// });

// 또는 이렇게 한번에 작성 가능
app.get('/time', (요청, 응답) => {
  응답.render('time.ejs', { data: new Date() });
});
