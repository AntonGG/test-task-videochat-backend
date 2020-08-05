import { v4 as uuid } from "uuid";
import { getRandomColor } from "../utils.js";

class Database {
  #users = [
    {
      name: "Anton",
      userId: "veijcu34h28ehceiuwnd",
      color: getRandomColor(),
    },
    {
      name: "Vasya",
      userId: "veijcu34h28dfdssdfehceiuwnd",
      color: getRandomColor(),
    },
  ];

  #rooms = [
    {
      name: "Моя комната",
      owner: "Anton",
      stream: false,
      roomId: "evf43rved23wecrv43e",
      color: getRandomColor(),
      users: [
        {
          name: "Vasya",
          userId: "veijcu34h28dfdssdfehceiuwnd",
          color: getRandomColor(),
        },
      ],
      messages: [
        {
          user: {
            name: "Vasya",
            userId: "veijcu34h28dfdssdfehceiuwnd",
            color: getRandomColor(),
          },
          message: "Всем привет",
        },
      ],
    },
  ];

  addRoom({ roomName, ownerName }) {
    console.log(this.#rooms);
    this.#rooms.push({
      name: roomName,
      color: getRandomColor(),
      owner: ownerName,
      roomId: uuid().replace(/-/g, ""),
      messages: [],
      users: [],
      stream: false,
    });
    return true;
  }

  addMessage({ roomId, message, user }) {
    const room = this.#rooms.find((room) => room.roomId === roomId);
    if (room) {
      room.messages.push({ message, user });
      return true;
    }
    console.log("addMessage", message);
    const userRoom = this.#users.find((room) => room.userId === roomId);
    if (userRoom) {
      userRoom.messages.push({ message, user });
      return true;
    }

    return false;
  }

  getRooms() {
    return this.#rooms;
  }

  getRoom(roomId) {
    return this.#rooms.find((room) => room.roomId === roomId);
  }

  addUser(name, userId) {
    let user = this.#users.find((user) => user.name === name);

    if (user) {
      user.userId = userId;
      return true;
    } else {
      this.#users.push({ name, userId, color: getRandomColor() });
      return true;
    }
  }

  getUsers() {
    return this.#users;
  }

  streamRoom(roomId) {
    const room = this.#rooms.find((room) => room.roomId === roomId);
    room.stream = true;
  }

  joinRoom(user, roomId) {
    const room = this.#rooms.find((room) => room.roomId === roomId);
    console.log("joinRoom", user, room);
    if (room && room.users) {
      if (room.users.find((roomUser) => roomUser.name === user.name)) {
        return true;
      }
      room.users.push(user);
      return true;
    }
    return false;
  }

  removeUser(userId) {
    if (this.#rooms) {
      for (const room of this.#rooms) {
        room.users = room.users.filter((user) => user.userId !== userId);
      }
    }
  }
}
export default Database;
