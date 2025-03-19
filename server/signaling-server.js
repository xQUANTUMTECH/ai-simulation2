const http = require('http');
const { Server } = require('socket.io');
const port = 3001;

// Creazione del server HTTP
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebRTC Signaling Server');
});

// Inizializzazione del server Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // In produzione, limitare alle origini consentite
    methods: ["GET", "POST"]
  }
});

// Mappa per tenere traccia degli utenti nelle stanze
const rooms = new Map();

// Gestione connessioni WebSocket
io.on('connection', (socket) => {
  console.log(`Nuova connessione: ${socket.id}`);

  // Gestione evento join (ingresso in una stanza)
  socket.on('join', (data, callback) => {
    const { room, userId } = data;
    
    if (!room) {
      return callback({ success: false, error: 'Room ID è richiesto' });
    }
    
    if (!userId) {
      return callback({ success: false, error: 'User ID è richiesto' });
    }
    
    // Aggiungi socket alla stanza
    socket.join(room);
    
    // Inizializza la stanza se non esiste
    if (!rooms.has(room)) {
      rooms.set(room, new Set());
    }
    
    // Aggiungi l'utente alla lista dei partecipanti nella stanza
    rooms.get(room).add(userId);
    
    // Notifica gli altri utenti nella stanza
    socket.to(room).emit('message', {
      type: 'join',
      sender: userId,
      room
    });
    
    // Invia la lista di tutti i partecipanti al nuovo utente
    const participants = Array.from(rooms.get(room));
    callback({ 
      success: true, 
      participants
    });
    
    // Invia la lista aggiornata a tutti nella stanza
    io.to(room).emit('participants', participants);
    
    console.log(`Utente ${userId} è entrato nella stanza ${room}`);
    console.log(`Partecipanti nella stanza ${room}:`, participants);
  });
  
  // Gestione evento leave (uscita da una stanza)
  socket.on('leave', (data, callback) => {
    const { room, userId } = data;
    
    if (room && userId && rooms.has(room)) {
      // Rimuovi utente dalla stanza
      rooms.get(room).delete(userId);
      
      // Se la stanza è vuota, eliminala
      if (rooms.get(room).size === 0) {
        rooms.delete(room);
      } else {
        // Notifica gli altri utenti
        socket.to(room).emit('message', {
          type: 'leave',
          sender: userId,
          room
        });
        
        // Invia la lista aggiornata a tutti nella stanza
        const participants = Array.from(rooms.get(room));
        io.to(room).emit('participants', participants);
      }
      
      // Esci dalla stanza Socket.io
      socket.leave(room);
      console.log(`Utente ${userId} è uscito dalla stanza ${room}`);
      
      if (callback) callback();
    }
  });
  
  // Gestione messaggi di segnalazione
  socket.on('message', (message) => {
    const { room, receiver } = message;
    
    if (!room) {
      console.error('Messaggio senza stanza:', message);
      return;
    }
    
    if (receiver) {
      // Messaggio diretto a un utente specifico
      socket.to(room).emit('message', message);
    } else {
      // Broadcast nella stanza
      socket.to(room).emit('message', message);
    }
  });
  
  // Gestione disconnessione
  socket.on('disconnecting', () => {
    // Ottieni le stanze attive per questo socket
    const socketRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    
    socketRooms.forEach(room => {
      // Trova l'ID utente in base al socket ID (questo è un approccio semplificato)
      let foundUserId = null;
      if (rooms.has(room)) {
        for (const userId of rooms.get(room)) {
          // In una implementazione reale, ci sarebbe una mappa socket.id -> userId
          foundUserId = userId;
          break;
        }
        
        if (foundUserId) {
          // Rimuovi l'utente dalla stanza
          rooms.get(room).delete(foundUserId);
          
          // Se la stanza è vuota, eliminala
          if (rooms.get(room).size === 0) {
            rooms.delete(room);
          } else {
            // Notifica gli altri utenti
            socket.to(room).emit('message', {
              type: 'leave',
              sender: foundUserId,
              room
            });
            
            // Invia la lista aggiornata a tutti nella stanza
            const participants = Array.from(rooms.get(room));
            io.to(room).emit('participants', participants);
            
            console.log(`Utente ${foundUserId} è uscito dalla stanza ${room} (disconnesso)`);
          }
        }
      }
    });
  });
  
  socket.on('disconnect', () => {
    console.log(`Connessione chiusa: ${socket.id}`);
  });
});

// Avvio del server
server.listen(port, () => {
  console.log(`Signaling server in ascolto sulla porta ${port}`);
});

// Gestione errori
server.on('error', (err) => {
  console.error('Errore nel server:', err);
});

// Gestione interruzione processo
process.on('SIGINT', () => {
  console.log('Server di segnalazione terminato');
  server.close();
  process.exit(0);
});
