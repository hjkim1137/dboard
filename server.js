const express = require('express');
const app = express();

// public 폴더 등록
app.use(express.static(__dirname + '/public'));

// EJS 세팅
app.set('view engine', 'ejs');

// req.body 쓰기 위한 사전 세팅
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// method-override
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// monogoDB 연결
const { MongoClient, ObjectId } = require('mongodb');
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

// 수정기능1
app.get('/edit/:id', async (req, res) => {
  // 팁: 서버에서 정보를 찾을 수 없으면 - 유저에게 보내라고 하거나/DB에서 꺼내보거나

  let result = await db
    .collection('post')
    .findOne({ _id: new ObjectId(req.params.id) });
  res.render('edit.ejs', { result: result });
  console.log('result', result);
});

// 수정기능(DB 전송)
app.put('/edit', async (req, res) => {
  // 팁: 서버에서 정보를 찾을 수 없으면 - 유저에게 보내라고 하거나/DB에서 꺼내보거나
  try {
    await db
      .collection('post')
      .updateOne(
        { _id: new ObjectId(req.body.id) },
        { $set: { title: req.body.title, content: req.body.content } }
      );
    res.redirect('/list');
  } catch (e) {
    console.log(e);
  }
});

// 수정기능(DB 전송)
app.put('/edit', async (req, res) => {
  // 팁: 서버에서 정보를 찾을 수 없으면 - 유저에게 보내라고 하거나/DB에서 꺼내보거나
  try {
    await db.collection('post').updateOne({ _id: 1 }, { $inc: { like: 2 } });
    // $inc는 기존값에 +/- 하라는 뜻 예) 2-> +2, -2 -> -2
    res.redirect('/list');
  } catch (e) {
    console.log(e);
  }
});

// 동시에 document 여러개 수정
// await db.collection('post').updateMany({ _id: 1 }, { $set: { like: 2 } });

// 동시에 document 여러개 수정 - 조건식 입력(like가 10 이상인 것 일괄 수정)
// await db.collection('post').updateMany({ like:{$gt:10} }, { $set: { like: 2 } });

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

// 상세페이지 만들기(url 파라미터)
// detail 다음에 아무 문자를 입력하면
app.get('/detail/:id', async (req, res) => {
  // db에 id가 ~인 게시물 가져오기

  // 예외처리
  try {
    let result = await db
      .collection('post')
      .findOne({ _id: new ObjectId(req.params.id) }); //db에 저장된 id와 대조
    res.render('detail.ejs', { result: result });

    // null 처리(parameter가 길이는 맞는데 틀리는 경우 등)
    if (result == null) {
      res.status(400).send('이상한 url 입력함');
    }
  } catch (e) {
    console.log(e);
    res.status(400).send('이상한 url 입력함');
  }
});

app.delete('/delete', async (req, res) => {
  try {
    await db.collection('post').deleteOne({}); // 공백이면 첫번째 게시글 삭제
    console.log('삭제완료');
    res.redirect('/list'); // 왜 여기서 오류가 나지?
  } catch (e) {
    console.log(e);
    res.send('서버 에러남');
  }
});
