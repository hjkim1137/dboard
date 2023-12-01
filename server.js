const express = require('express');
const app = express();

// public 폴더 등록
app.use(express.static(__dirname + '/public'));

// EJS 세팅
app.set('view engine', 'ejs');

// req.body 쓰기 위한 사전 세팅
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// (번외) 서버 time 보여주는 기능
// app.get('/time', (요청, 응답) => {
//   let time = new Date();
//   응답.render('time.ejs', { time });
// });

// 또는 이렇게 한번에 작성 가능
app.get('/time', (요청, 응답) => {
  응답.render('time.ejs', { data: new Date() });
});

// 게시물 작성 기능
app.get('/write', (req, res) => {
  res.render('write.ejs');
});

// app.post('/add', async (req, res) => {
//   // 유저가 입력한 데이터를 서버로 전송하고 터미널에 출력
//   console.log(req.body);

//   //(예외처리1. 유저가 빈칸 보내면 DB 저장 x 하는 코드 삽입)
//   if (req.body.title == '' || req.body.content == '') {
//     res.send('제목 또는 내용을 입력하세요.');
//   } else {
//     await db
//       .collection('post')
//       .insertOne({ title: req.body.title, content: req.body.content });
//     // 서버 기능 실행이 끝나면 응답해주기
//     res.redirect('/list'); // 유저를 다른페이지로 이동
//   }
// });

// (try-catch 문을 이용한 예외처리 방법)
app.post('/add', async (req, res) => {
  // 유저가 입력한 데이터를 서버로 전송하고 터미널에 출력
  console.log(req.body);
  try {
    // 여기 코드 실행해보고
    //(예외처리1. 유저가 빈칸 보내면 DB 저장X 하는 코드 삽입)
    if (req.body.title == '' || req.body.content == '') {
      res.send('제목 또는 내용을 입력하세요.');
    } else {
      await db
        .collection('post')
        .insertOne({ title: req.body.title, content: req.body.content });
      // 서버 기능 실행이 끝나면 응답해주기
      res.redirect('/list'); // 유저를 다른페이지로 이동
    }
  } catch (e) {
    // 에러나면 여기 코드 실행
    console.log(e); // 에러 메세지 출력
    res.status(500).send('서버 에러남');
  }
});
