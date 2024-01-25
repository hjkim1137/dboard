const express = require('express');
const app = express();

const { isBlank } = require('./middlewares/index.js');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt'); // bcrypt 세팅

// socket.io 세팅 - confirmed - 시작
const { createServer } = require('http');
const { Server } = require('socket.io');
const server = createServer(app);
const io = new Server(server);

// dotenv 세팅
require('dotenv').config();

// public 폴더 등록
app.use(express.static(__dirname + '/public'));

// EJS 세팅
app.set('view engine', 'ejs');

// (form 태그 put, delete 요청 가능케 하는 method-override)
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// req.body 쓰기 위한 사전 세팅
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// monogoDB 연결(이 코드 최상단에 두면 안됨)
let connectDB = require('./database.js');

let db;
let changeStream;
connectDB
  .then((client) => {
    console.log('메인서버- 몽고DB 연결 성공하였습니다.');
    db = client.db('forum'); // forum db 연결

    // change stream 기능(서버 띄울때 한번만 실행하도록 효율적으로 작성)
    // insert 일때만 조건 걸 수도 있음
    let condition = [{ $match: { operationType: 'insert' } }];
    // title이 바보 인것만 변동사항 발생할 때 조건 걸기
    // let condition = [{ $match: { 'fullDocument.title': '바보' } }];

    changeStream = db.collection('post').watch(condition);

    // 서버 시작 코드
    server.listen(process.env.PORT, () => {
      console.log(`http://localhost:${process.env.PORT} 에서 서버 실행중`);
    });
  })
  .catch((err) => {
    console.error('DB 연결에 실패하였습니다:', err);
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
    // 내부 코드를 비동기적으로 처리해줌
    return done(null, result); // result에 넣은게 API의 req.user에 들어감
  });
});

// req.isAuthenticated()- passport에서 제공하는 함수 (현재 로그인이 되어있으면 true, 아니면 false를 return)
// header.ejs 에서 사용하기 위함
// (주의) 로그인 함수보다 먼저 쓰여져야 함
app.use(function (req, res, next) {
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.currentUser = req.user;
  next();
});

// passport.serializeUser 로직 실행하는 코드
// 라이브러리 사용법이니까 외우지 말고 그냥 작성하면 됨
// error: 비교작업 실패, info: 실패이유, user: 비교작업 성공
app.post('/login', isBlank, async (req, res, next) => {
  passport.authenticate('local', (error, user, info) => {
    if (error) return res.status(500).json(error);
    if (!user) return res.status(401).json(info.message);
    // req.login() => 유저가 전송버튼 누름-> passport.serializeUser 실행
    req.logIn(user, (err) => {
      if (err) return next(err); // 에러 있으면
      res.redirect('/home'); // 에러 없으면
    });
  })(req, res, next);
});

// *** API 함수 ***
// login 화면 get 요청하기
// 현재 로그인된 유저 정보 출력은 API 들 안에서 req.user 하면됨
app.get('/login', async (req, res) => {
  console.log('현재 로그인한 유저정보', req.user);
  // 로그인 이후에 /login 접속하면 req.user 콘솔에 찍힘. 로그인 전이면 undefined 뜸
  res.render('login.ejs');
});

// 로그아웃 하기
app.get('/logout', async (req, res) => {
  req.logout((err) => {
    if (err) return next(err); // 에러 있으면
    res.redirect('/home'); // 에러 없으면
  });
});

// 비정상적인 접근(로그인한 유저만 접근 가능한 페이지에 임의 접근했을 경우)
app.get('/fail', (req, res) => {
  res.render('fail.ejs');
});

// ***** API 리스트 *****
app.use('/write', require('./routes/write.js'));
app.use('/edit', require('./routes/edit.js'));
app.use('/detail', require('./routes/detail.js'));
app.use('/delete', require('./routes/delete.js'));
app.use('/register', require('./routes/register.js'));
app.use('/mypage', require('./routes/mypage.js'));
app.use('/mypost', require('./routes/mypost.js'));
app.use('/home', require('./routes/home.js'));
app.use('/search', require('./routes/search.js'));
app.use('/chat', require('./routes/chat.js'));

// 소켓 io 세팅
io.on('connection', (socket) => {
  console.log('websocket 연결됨');

  // 2번
  socket.on('msg-send', async (data) => {
    // 수신한 데이터 DB에 저장하기
    await db.collection('chat').insertOne({
      chats: data.msg,
      roomId: new ObjectId(data.roomId),
      userId: new ObjectId(data.userId),
      userName: data.userName,
      date: data.date,
      yourImg: data.yourImg,
      userImg: data.userImg,
    });

    // 3번
    io.emit('msg-send', JSON.stringify(data)); // javascript 객체 -> JSON 문자열
  });
});

// SSE 구현하기
app.get('/stream/list', (req, res) => {
  res.writeHead(200, {
    // http 요청을 끊지 않고 연결해줌
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  });

  // post 컬렉션의 doc 변동 사항 발생시(현재는 insert시만 조건) 안의 코드 실행됨
  changeStream.on('change', (result) => {
    console.log('새로 추가된 doc', result.fullDocument); // 새로 추가된 doc

    // 형식 잘 맞춰서 보내야 함
    res.write('event: msg\n');
    res.write(`data: ${JSON.stringify(result.fullDocument)}\n\n`);
    // array, object 형은 JSON.stringfy 사용
  });
});
