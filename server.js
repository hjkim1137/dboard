const express = require('express');
const app = express();

// dotenv 세팅
require('dotenv').config();

// multer 세팅
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3 = new S3Client({
  region: 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'hjkimforum1',
    key: function (req, file, cb) {
      cb(null, Date.now().toString()); // 업로드시 파일명 변경가능
    },
  }),
});

// public 폴더 등록
app.use(express.static(__dirname + '/public'));

// EJS 세팅
app.set('view engine', 'ejs');

// req.body 쓰기 위한 사전 세팅
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// bcrypt 세팅
const bcrypt = require('bcrypt');

// method-override
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// monogoDB 연결
const { MongoClient, ObjectId } = require('mongodb');
let db;
const url = process.env.DB_URL;
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log('DB연결성공');
    db = client.db('forum'); // forum db 연결

    // 서버 시작 코드 여기로 옮기기
    app.listen(process.env.PORT, () => {
      console.log(`http://localhost:${process.env.PORT} 에서 서버 실행중`);
    });
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

// passport 라이브러리 세팅
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');

// connect-mongo 세팅하기
const MongoStore = require('connect-mongo');

app.use(passport.initialize());
app.use(
  session({
    secret: '암호화에 쓸 비번',
    resave: false,
    // 유저가 서버로 요청할 때마다 세션 갱신할 지 여부(보통은 false로 둠)
    saveUninitialized: false,
    // 로그인 안해도 세션 만들것인지
    cookie: { maxAge: 60 * 60 * 1000 }, // 세션 document 유효기간 변경가능
    store: MongoStore.create({
      // connect-mongo
      mongoUrl: process.env.DB_URL,
      dbName: 'forum',
    }),
  })
);
app.use(passport.session());

// passport 라이브러리 사용하기(외우지 말고 그냥 보면됨)
passport.use(
  // 유저가 제출한 로그인 계정정보 검사하는 로직
  new LocalStrategy(async (inputID, inputPW, cb) => {
    let result = await db.collection('user').findOne({ username: inputID });
    if (!result) {
      return cb(null, false, { message: '아이디 DB에 없음' });
    }
    // 해싱된 비밀번호와 비교
    if (await bcrypt.compare(inputPW, result.password)) {
      // (유저가 입력한값, DB에 해시되어 저장된값)
      return cb(null, result);
    } else {
      return cb(null, false, { message: '비번불일치' });
    }
  })
);

// 로그인/회원가입시 빈칸이면 알림하는 미들웨어 함수
function isblank(req, res, next) {
  if (
    req.body.username == '' ||
    req.body.password == '' ||
    req.body.password2 == ''
  )
    res.send('아이디 또는 비밀번호가 빈칸입니다.');
  else {
    next();
  }
}

// 1. passport.serializeUser() -> 로그인 성공 시 세션 보내주는 코드
passport.serializeUser((user, done) => {
  console.log('로그인중인 유저 정보', user); // user는 로그인중인 user
  process.nextTick(() => {
    // 내부 코드를 비동기적으로 처리해줌
    done(null, { id: user._id, username: user.username });
  });
});

// 2. passport.deserializeUser -> 유저가 보낸 쿠키를 분석하는 역할
// API 부분 어디에서나 req.user 입력하면 현재 로그인된 유저정보를 알려준다
// 좋은 관습: 세션데이터가 좀 오래되면 최신 유저이름과 좀 다를 수 있기에
// 세션에 적힌 유저정보를 가져와서 최신 회원 정보를 DB에서 가져오고, 그걸 req.user에 집어넣기

// 비효율 포인트: 현재는 모든 요청에 대해서 db 조회를 하고 있는데, 특정 API 한해 deserialize 실행 가능하게도 할 수 있다
passport.deserializeUser(async (user, done) => {
  let result = await db
    .collection('user')
    .findOne({ _id: new ObjectId(user.id) });
  delete result.password; // 보안을 위해 user 비번 삭제
  process.nextTick(() => {
    console.log('로그인 완료 유저정보', result);
    // 내부 코드를 비동기적으로 처리해줌
    return done(null, result); // result에 넣은게 API의 req.user에 들어감
  });
});

// passport.serializeUser 로직 실행하는 코드
// 라이브러리 사용법이니까 외우지 말고 그냥 작성하면 됨
// error: 비교작업 실패, info: 실패이유, user: 비교작업 성공
app.post('/login', isblank, async (req, res, next) => {
  passport.authenticate('local', (error, user, info) => {
    if (error) return res.status(500).json(error);
    if (!user) return res.status(401).json(info.message);
    // req.login() => 유저가 전송버튼 누름-> passport.serializeUser 실행
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect('/');
    });
  })(req, res, next);
});

// 로그인 여부 확인 함수(미들웨어 함수)
function isLogin(req, res, next) {
  if (!req.user) {
    res.render('fail.ejs'); // 미로그인 상태면 로그인 요청 페이지로 안내
  }
  next(); // 써줘야지 무한 로딩상태에 안빠짐
}

// ****************************** API 함수 시작 ******************************
// login 화면 get 요청하기
// 현재 로그인된 유저 정보 출력은 API 들 안에서 req.user 하면됨
app.get('/login', async (req, res) => {
  console.log('현재 로그인한 유저정보', req.user);
  // 로그인 이후에 /login 접속하면 req.user 콘솔에 찍힘. 로그인 전이면 undefined 뜸
  res.render('login.ejs');
});

// 메인페이지
app.get('/', (req, res) => {
  // html 파일 보내는 법
  res.sendFile(__dirname + '/index.html');
});

// 목록 페이지
app.get('/list', async (req, res) => {
  let result = await db.collection('post').find().toArray();
  // res.send(result[0].title);
  res.render('list.ejs', { 글목록: result });
});

// (번외) 서버 time 보여주는 기능
// app.get('/time', (req, res) => {
//   let time = new Date();
//   res.render('time.ejs', { time });
// });

// 또는 이렇게 한번에 작성 가능
app.get('/time', (req, res) => {
  res.render('time.ejs', { data: new Date() });
});

// 마이페이지
app.get('/mypage', isLogin, (req, res) => {
  console.log('마이페이지 유저 정보', req.user);
  res.render('mypage.ejs', { user: req.user });
});

// 게시물 작성 페이지 (+로그인한 사람만 글 작성 가능)
app.get('/write', isLogin, (req, res) => {
  console.log('글작성 페이지 유저 정보', req.user);
  res.render('write.ejs');
});

// 게시물 작성 (+try-catch 문을 이용한 예외처리 방법)
app.post('/add', async (req, res) => {
  // 유저가 입력한 데이터를 서버로 전송하고 터미널에 출력
  console.log(req.file.location); // 업로드한 이미지 정보 객체

  upload.single('img1')(req, res, async (err) => {
    if (err) return res.send('이미지 업로드 에러');
    else {
      try {
        // 여기 코드 실행해보고
        //(예외처리1. 유저가 빈칸 보내면 DB 저장X 하는 코드 삽입)
        if (req.body.title == '' || req.body.content == '') {
          res.send('제목 또는 내용을 입력하세요.');
        } else {
          await db.collection('post').insertOne({
            title: req.body.title,
            content: req.body.content,
            img: req.file.location,
          });
          // 서버 기능 실행이 끝나면 응답해주기
          res.redirect('/list'); // 유저를 다른페이지로 이동
        }
      } catch (e) {
        // 에러나면 여기 코드 실행
        console.log(e); // 에러 메세지 출력
        res.status(500).send('서버 에러남');
      }
    }
  });
});

// 게시물 수정기능(조회)
app.get('/edit/:id', async (req, res) => {
  // 팁: 서버에서 정보를 찾을 수 없으면 - 유저에게 보내라고 하거나/DB에서 꺼내보거나
  let result = await db
    .collection('post')
    .findOne({ _id: new ObjectId(req.params.id) });
  res.render('edit.ejs', { result: result });
  console.log('result', result);
});

// 게시물 수정기능(DB 전송 - $set)
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

// 게시물 수정기능(DB 전송 - $inc)
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

// 게시물 상세페이지(url 파라미터)
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

// 게시물 삭제 기능
app.delete('/delete', async (req, res) => {
  console.log(req.query);
  try {
    await db
      .collection('post')
      .deleteOne({ _id: new ObjectId(req.query.docId) });
    res.send('삭제완료');
    // (참고) ajax 요청 사용시 새고로침 안하는게 장점이라 쓰는거라
    // res.redirect, res.render 사용 안하는게 나음
  } catch (e) {
    console.log(e);
  }
});

// 페이지네이션 만들기
app.get('/list/:id', async (req, res) => {
  // skip(5).limit(5) 맨 처음~5개 스킵하고 거기서 부터 다음 5개 가져옴
  let result = await db
    .collection('post')
    .find()
    // 1번째 페이지면 0개 스킵: 1 -> 0
    // 2번째 페이지면 5개 스킵: 2 -> 5
    // 3번째 페이지면 10개 스킵: 3 -> 10
    .skip((req.params.id - 1) * 5)
    .limit(5)
    .toArray();
  res.render('list.ejs', { 글목록: result });
});

// 다음 게시물 5개 보기 기능(장점: 매우 빠름, 단점: 다음 버튼으로 바꿔야함)
app.get('/list/next/:id', async (req, res) => {
  let result = await db
    .collection('post')
    // 특정 조건 다음의 게시물 5개 가져오는 방법:
    // 형식: .find({ _id: { $gt: 방금본마지막게시물_id } })
    .find({ _id: { $gt: new ObjectId(req.params.id) } })
    .limit(5)
    .toArray();
  res.render('list.ejs', { 글목록: result });
});

// 비저상적인 접근(로그인한 유저만 접근 가능한 페이지에 임의 접근했을 경우)
app.get('/fail', (req, res) => {
  res.render('fail.ejs');
});

// 회원가입기능
app.get('/register', (req, res) => {
  res.render('register.ejs');
});

app.post('/register', isblank, async (req, res) => {
  console.log('유저가 회원가입 형식에 입력한 내용', req.body);
  try {
    let data = await db
      .collection('user')
      .findOne({ username: req.body.username });
    if (data) {
      res.send('이미 존재하는 ID 입니다. 새로운 ID를 입력해주세요.');
    } else {
      if (req.body.password.length < 8) {
        res.send('비밀번호를 8자 이상 입력하세요.');
      }
      if (req.body.password != req.body.password2) {
        res.send('비밀번호가 일치하지 않습니다.');
      } else {
        // 비밀번호 해싱하기
        let hash = await bcrypt.hash(req.body.password, 10);

        await db.collection('user').insertOne({
          username: req.body.username,
          password: hash,
        });
        res.redirect('/');
      }
    }
  } catch (e) {
    console.log(e);
  }
});
