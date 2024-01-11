let mode = localStorage.getItem('mode');
let toggle = document.querySelector('.test');
let body = document.querySelector('body');

if (mode === 'dark') {
  toggle.innerHTML = '일반모드로 ☀️';
  body.classList.remove('grey-bg');
  body.classList.add('dark-mode');
} else {
  toggle.innerHTML = '다크모드로 🌙';
  body.classList.remove('dark-mode');
}

toggle.addEventListener('click', function () {
  if (body.classList.contains('dark-mode')) {
    localStorage.removeItem('mode', 'dark');
    toggle.innerHTML = '다크모드로 🌙';
    body.classList.remove('dark-mode');
  } else {
    localStorage.setItem('mode', 'dark');
    toggle.innerHTML = '일반모드로 ☀️';
    body.classList.remove('grey-bg');
    body.classList.add('dark-mode');
  }
});
