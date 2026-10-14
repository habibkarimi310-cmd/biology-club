const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const attachSocket = require('./socket');

const app = express();
const server = http.createServer(app);
const MAX_SIZE = 4 * 1024 * 1024 * 1024;  // ۴ گیگ

const io = new Server(server, { cors: { origin: '*' }, maxHttpBufferSize: MAX_SIZE });

app.use(cors());
app.use(express.json({ limit: '4gb' }));
app.use(express.urlencoded({ extended: true, limit: '4gb' }));

server.timeout = 0;
server.keepAliveTimeout = 0;
server.headersTimeout = 0;
// ═══ جلوگیری از کش فایل‌های آپلودی ═══
app.use((req, res, next) => {
  if (req.path.startsWith('/uploads/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// ═══ جلوگیری از کش فایل‌های استاتیک در توسعه ═══
app.use(express.static(path.join(__dirname, '..', 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/users',       require('./routes/users'));
app.use('/api/chat',        require('./routes/chat'));
app.use('/api/quiz',        require('./routes/quiz'));
app.use('/api/scores',      require('./routes/scores'));
app.use('/api/gallery',     require('./routes/gallery'));
app.use('/api/models',      require('./routes/models'));
app.use('/api/lab',         require('./routes/lab'));
app.use('/api/classes',     require('./routes/classes'));
app.use('/api/class-files', require('./routes/class-files'));
app.use('/api/stats',       require('./routes/stats'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('❌ خطا:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ error: 'فایل خیلی بزرگ! حداکثر ۴ گیگابایت' });
  res.status(err.status || 500).json({ error: err.message || 'خطای سرور' });
});

attachSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🧬 انجمن زیست‌شناسی مدرسه v2.0\n`);
  console.log(`   ✅ سرور روی پورت ${PORT} فعال شد`);
  console.log(`   🌐 http://localhost:${PORT}`);
  console.log(`   📦 حداکثر آپلود: ۴ گیگابایت`);
  console.log(`   🔑 کد عضویت: BIO-1403\n`);
});