const express = require('express');
const app = express();
const { isBlank } = require('./middleware/index.js');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt'); // bcrypt 세팅

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
connectDB
  .then((client) => {
    console.log('서버- DB 연결성공');
    db = client.db('forum'); // forum db 연결

    // 서버 시작 코드
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
app.post('/login', isBlank, async (req, res, next) => {
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

// *** API 함수 ***
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
  res.render('home.ejs');
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
app.use('/list', require('./routes/list.js'));
app.use('/search', require('./routes/search.js'));
app.use('/chatlist', require('./routes/chatlist.js'));
app.use('/chatdetail', require('./routes/chatdetail.js'));
