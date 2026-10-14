const { verifyToken } = require('./auth');

const onlineUsers = new Map();

function broadcastRoomOnline(io, roomId) {
  const list = [];
  for (const [sid, u] of onlineUsers.entries()) {
    if (u.roomId === roomId) {
      list.push({
        socketId: sid, id: u.id, username: u.username, name: u.name,
        avatar: u.avatar, role: u.role,
        handRaised: !!u.handRaised, micOn: !!u.micOn,
        camOn: !!u.camOn, sharingScreen: !!u.sharingScreen
      });
    }
  }
  io.to('room-' + roomId).emit('online:list', list);
  io.to('room-' + roomId).emit('online:count', list.length);
}

function broadcastGlobalCount(io) {
  io.emit('online:total', onlineUsers.size);
}

module.exports = function attachSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const payload = verifyToken(token);
    if (!payload) return next(new Error('توکن نامعتبر'));
    socket.user = payload;
    next();
  });

  io.on('connection', (socket) => {
    const u = socket.user;

    onlineUsers.set(socket.id, {
      id: u.id, username: u.username, name: u.name || u.username,
      avatar: u.avatar || '🎓', role: u.role, roomId: null,
      handRaised: false, micOn: false, camOn: false, sharingScreen: false
    });

    broadcastGlobalCount(io);

    socket.on('room:join', ({ roomId }) => {
      const me = onlineUsers.get(socket.id);
      if (!me) return;
      if (me.roomId && me.roomId !== roomId) {
        socket.leave('room-' + me.roomId);
        socket.to('room-' + me.roomId).emit('peer:left', { socketId: socket.id });
        broadcastRoomOnline(io, me.roomId);
      }
      me.roomId = roomId;
      socket.join('room-' + roomId);
      socket.to('room-' + roomId).emit('peer:joined', { socketId: socket.id });
      broadcastRoomOnline(io, roomId);
    });

    socket.on('room:leave', () => {
      const me = onlineUsers.get(socket.id);
      if (!me || !me.roomId) return;
      const old = me.roomId;
      socket.leave('room-' + old);
      socket.to('room-' + old).emit('peer:left', { socketId: socket.id });
      me.roomId = null;
      me.handRaised = false; me.micOn = false; me.camOn = false; me.sharingScreen = false;
      broadcastRoomOnline(io, old);
    });

    socket.on('chat:new', (msg) => socket.broadcast.emit('chat:new', msg));

    socket.on('hand:raise', () => {
      const me = onlineUsers.get(socket.id);
      if (me) { me.handRaised = true; if (me.roomId) broadcastRoomOnline(io, me.roomId); }
    });
    socket.on('hand:lower', () => {
      const me = onlineUsers.get(socket.id);
      if (me) { me.handRaised = false; if (me.roomId) broadcastRoomOnline(io, me.roomId); }
    });

    socket.on('media:state', ({ micOn, camOn, sharingScreen }) => {
      const me = onlineUsers.get(socket.id);
      if (me) {
        me.micOn = !!micOn; me.camOn = !!camOn; me.sharingScreen = !!sharingScreen;
        if (me.roomId) broadcastRoomOnline(io, me.roomId);
      }
    });

    socket.on('reaction', (emoji) => {
      const me = onlineUsers.get(socket.id);
      if (me && me.roomId) io.to('room-' + me.roomId).emit('reaction', { emoji, name: me.name, avatar: me.avatar });
    });

    socket.on('class:chat', (m) => {
      const me = onlineUsers.get(socket.id);
      if (me && me.roomId) socket.to('room-' + me.roomId).emit('class:chat', m);
    });

    socket.on('board:draw', (d) => {
      const me = onlineUsers.get(socket.id);
      if (me && me.roomId) socket.to('room-' + me.roomId).emit('board:draw', d);
    });
    socket.on('board:clear', () => {
      const me = onlineUsers.get(socket.id);
      if (me && me.roomId) socket.to('room-' + me.roomId).emit('board:clear');
    });
    socket.on('board:add', (el) => {
      const me = onlineUsers.get(socket.id);
      if (me && me.roomId) socket.to('room-' + me.roomId).emit('board:add', el);
    });
    socket.on('board:full', (els) => {
      const me = onlineUsers.get(socket.id);
      if (me && me.roomId) socket.to('room-' + me.roomId).emit('board:full', els);
    });

    // ═══ مدل سه‌بعدی در کلاس ═══
    socket.on('class:model-show', (data) => {
      const me = onlineUsers.get(socket.id);
      if (me && me.roomId) socket.to('room-' + me.roomId).emit('class:model-show', data);
    });
    socket.on('class:model-hide', () => {
      const me = onlineUsers.get(socket.id);
      if (me && me.roomId) socket.to('room-' + me.roomId).emit('class:model-hide');
    });

    socket.on('class:file-new', (file) => {
      const me = onlineUsers.get(socket.id);
      if (me && me.roomId) socket.to('room-' + me.roomId).emit('class:file-new', file);
    });
    socket.on('class:file-delete', (fileId) => {
      const me = onlineUsers.get(socket.id);
      if (me && me.roomId) socket.to('room-' + me.roomId).emit('class:file-delete', fileId);
    });

    socket.on('webrtc:offer', ({ to, offer }) => io.to(to).emit('webrtc:offer', { from: socket.id, offer }));
    socket.on('webrtc:answer', ({ to, answer }) => io.to(to).emit('webrtc:answer', { from: socket.id, answer }));
    socket.on('webrtc:ice', ({ to, candidate }) => io.to(to).emit('webrtc:ice', { from: socket.id, candidate }));

    socket.on('disconnect', () => {
      const me = onlineUsers.get(socket.id);
      if (me && me.roomId) socket.to('room-' + me.roomId).emit('peer:left', { socketId: socket.id });
      onlineUsers.delete(socket.id);
      if (me && me.roomId) broadcastRoomOnline(io, me.roomId);
      broadcastGlobalCount(io);
    });
  });
};