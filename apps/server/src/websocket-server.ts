import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";

interface RoomParticipant {
  socketId: string;
  userId: string;
  isHost: boolean;
}

interface Room {
  participants: Map<string, RoomParticipant>;
  hostId?: string;
}

export class WebSocketServer {
  private io: SocketIOServer;
  private rooms: Map<string, Room> = new Map();

  constructor() {
    const server = createServer();

    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.setupEventHandlers();

    // Start WebSocket server on port 1285
    const wsPort = 1285;
    server.listen(wsPort, () => {
      console.log(`WebSocket server running on port ${wsPort}`);
    });
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Join room
      socket.on("join-room", (data: { roomId: string; userId: string }) => {
        this.handleJoinRoom(socket, data);
      });

      // WebRTC signaling
      socket.on("offer", (data: { to: string; offer: any }) => {
        socket.to(data.to).emit("offer", {
          from: socket.id,
          offer: data.offer,
        });
      });

      socket.on("answer", (data: { to: string; answer: any }) => {
        socket.to(data.to).emit("answer", {
          from: socket.id,
          answer: data.answer,
        });
      });

      socket.on("ice-candidate", (data: { to: string; candidate: any }) => {
        socket.to(data.to).emit("ice-candidate", {
          from: socket.id,
          candidate: data.candidate,
        });
      });

      // Disconnect
      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinRoom(
    socket: any,
    data: { roomId: string; userId: string }
  ) {
    const { roomId, userId } = data;

    // Join socket room
    socket.join(roomId);

    // Get or create room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { participants: new Map() });
    }

    const room = this.rooms.get(roomId)!;
    const isHost = room.participants.size === 0;

    // Add participant
    room.participants.set(socket.id, {
      socketId: socket.id,
      userId,
      isHost,
    });

    if (isHost) {
      room.hostId = socket.id;
    }

    // Notify others in the room
    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userId,
      isHost,
    });

    // Send current participants to the new user
    const participants = Array.from(room.participants.values()).filter(
      (p) => p.socketId !== socket.id
    );

    console.log(`Room ${roomId} participants:`, participants);
    socket.emit("room-participants", participants);

    console.log(
      `User ${userId} joined room ${roomId} as ${isHost ? "host" : "participant"}`
    );
  }

  private handleDisconnect(socket: any) {
    console.log(`User disconnected: ${socket.id}`);

    // Find and remove from all rooms
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id);

        // Notify others
        socket.to(roomId).emit("user-left", { socketId: socket.id });

        // If room is empty, remove it
        if (room.participants.size === 0) {
          this.rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        }

        break;
      }
    }
  }

  public getIO() {
    return this.io;
  }
}
