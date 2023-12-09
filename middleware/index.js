// 로그인/회원가입시 빈칸이면 알림하는 미들웨어 함수
function isBlank(req, res, next) {
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

// 로그인 여부 확인 함수(미들웨어 함수)
function isLogin(req, res, next) {
  if (!req.user) {
    res.render('fail.ejs'); // 미로그인 상태면 로그인 요청 페이지로 안내
  }
  next(); // 써줘야지 무한 로딩상태에 안빠짐
}

module.exports = { isBlank, isLogin };
