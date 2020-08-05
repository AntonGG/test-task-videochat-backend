import express from "express";
import socketIO from "socket.io";
import HTTPServer from "http";
import path from "path";
import Database from "./database/Database.js";

export default class Server {
  httpServer;
  app;
  io;
  DEFAULT_PORT = 5000;
  database = new Database();
  constructor() {
    this.initialize();
  }

  initialize() {
    this.app = express();
    this.httpServer = HTTPServer.createServer(this.app);
    this.io = socketIO(this.httpServer);

    this.configureApp();
    this.configureRoutes();
    this.handleSocketConnection();
  }

  configureApp() {
    
  }

  configureRoutes() {
   
  }

  updateRooms(socket) {
    const rooms = database.getRooms();
    // Отправляем комнаты и пользователей текущему юзеру
    socket.emit("action", {
      type: "update-rooms",
      payload: { rooms },
    });

    //обновляем всем остальным
    socket.broadcast.emit("action", {
      type: "update-rooms",
      payload: { rooms },
    });
  }

  updateUsers(socket) {
    const users = database.getUsers();
    socket.emit("action", {
      type: "update-users",
      payload: { users },
    });
    socket.broadcast.emit("action", {
      type: "update-users",
      payload: { users },
    });
  }

  handleSocketConnection() {
    this.io.on("connection", (socket) => {
      socket.on("sign-in", (data) => {
        if (data.name === "") {
          //Отправляем ошибку входа
          socket.emit("action", {
            type: "is-auth",
            payload: { isAuth: false, name: data.name },
          });
          return;
        }
        console.log("sign-in: ", data);
        // Добавляем пользователя в базу
        const user = database.addUser(data.name, socket.id);
        if (user) {
          // Отправляем успешный вход
          socket.emit("action", {
            type: "is-auth",
            payload: { isAuth: true, name: data.name },
          });
          this.updateRooms(socket);
          this.updateUsers(socket);
        } else {
          // Отправляем ошибку входа
          socket.emit("action", {
            type: "is-auth",
            payload: { isAuth: false, name: data.name },
          });
          return;
        }
      });

      // Слушаем сообщения для комнат
      socket.on("new-message", (data) => {
        if (data.message === "") {
          return;
        }
        console.log("new-message: ", data);
        database.addMessage({ ...data });
        this.updateRooms(socket);
        this.updateUsers(socket);
      });

      // Добавление комнаты
      socket.on("new-room", ({ roomName, ownerName }) => {
        if (roomName === "") {
          return;
        }
        console.log("new-room: ", { roomName, ownerName });
        database.addRoom({ roomName, ownerName });
        this.updateRooms(socket);
      });

      socket.on("stream-room", ({ roomId }) => {
        database.streamRoom(roomId);
        this.updateRooms(socket);

        const room = database.getRoom(roomId);
        const streamer = database
          .getUsers()
          .find((user) => user.name === room.owner);

        for (const user of room.users) {
          //отправляем стримеру userId чтобы стример позвонил юзеру
          socket.to(streamer.userId).emit("action", {
            type: "watcher",
            payload: { userId: user.userId },
          });
          console.log("action", {
            type: "watcher",
            payload: { userId: user.userId },
          });
        }
      });

      socket.on("join-room", ({ roomId }) => {
        if (roomId) {
          const user = database
            .getUsers()
            .find((user) => user.userId === socket.id);
          console.log("join-room:", user);
          if (user && database.joinRoom(user, roomId)) {
            const room = database.getRooms().find((r) => r.roomId === roomId);
            console.log("room-stream:", room);
            if (room && room.stream) {
              //если в комнате включен стрим, то находим стримера
              const streamer = database
                .getUsers()
                .find((user) => user.name === room.owner);

              //отправляем стримеру userId чтобы стример позвонил юзеру
              socket.to(streamer.userId).emit("action", {
                type: "watcher",
                payload: { userId: socket.id },
              });
            }
            //подключаем пользователя к комнате
            socket.join(roomId, () => {
              this.updateRooms(socket);
            });
          }
        }
      });

      socket.on("offer", ({ userId, description }) => {
        socket.to(userId).emit("action", {
          type: "offer",
          payload: { userId: socket.id, description },
        });
      });
      
      socket.on("answer", ({ userId, description }) => {
        socket.to(userId).emit("action", {
          type: "answer",
          payload: { userId: socket.id, description },
        });
      });

      socket.on("candidate", ({ userId, candidate }) => {
        socket.to(userId).emit("action", {
          type: "candidate",
          payload: { userId: socket.id, candidate },
        });
      });

      socket.on("watcher-candidate", ({ userId, candidate }) => {
        socket.to(userId).emit("action", {
          type: "watcher-candidate",
          payload: { userId: socket.id, candidate },
        });
      });
      socket.on("disconnect", () => {
        console.log("disconnect ", socket.id);
        database.removeUser(socket.id);
        this.updateRooms(socket);
      });
    });
  }

  listen(callback) {
    this.httpServer.listen(this.DEFAULT_PORT, () => {
      callback(this.DEFAULT_PORT);
    });
  }
}
