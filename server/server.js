const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const usedRooms = new Set();

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.get("/", (req, res) => {
    res.send("AUBguessr multiplayer server is running!");
});

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on("testMessage", (message) => {
        console.log("Received:", message);
    });

    socket.on("joinRoom", (data) => {
        const room = io.sockets.adapter.rooms.get(data.roomCode);

        if (room && room.size >= 2) {
            socket.emit("roomFull");
            return;
        }

        if (usedRooms.has(data.roomCode)) {
            socket.emit("roomFull");
            return;
        }

        socket.username = data.username;

        socket.join(data.roomCode);

        const newRoom = io.sockets.adapter.rooms.get(data.roomCode);
        const newPlayerCount = newRoom ? newRoom.size : 0;

        if (newPlayerCount === 2) {
            usedRooms.add(data.roomCode);
        }

        console.log(`${socket.id} joined room: ${data.roomCode} as ${data.username}`);

        socket.emit("roomJoined", data.roomCode);

        socket.to(data.roomCode).emit("opponentJoined", data.username);

        if (room) {
            for (const playerId of room) {
                const player = io.sockets.sockets.get(playerId);

                if (player && playerId !== socket.id) {
                    socket.emit("opponentJoined", player.username);
                }
            }
        }
    });

    socket.on("sendScore", (data) => {
        console.log("SCORE RECEIVED:", socket.id, data);

        socket.to(data.roomCode).emit("opponentFinished", {
            username: socket.username,
            score: data.score,
            perfectScores: data.perfectScores,
            hints: data.hints,
            scoreArr: data.scoreArr,
            hintsArr: data.hintsArr,
            avatar: data.avatar
        });
    });

    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});