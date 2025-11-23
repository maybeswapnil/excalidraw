
import { io } from "socket.io-client";

const PORT = 5000;
const URL = `http://localhost:${PORT}`;

async function testSync() {
  console.log("Starting sync test...");

  const client1 = io(URL);
  const client2 = io(URL);

  const roomId = "test-room";
  const roomKey = "test-key"; // Not used by server but part of protocol

  let client1Joined = false;
  let client2Joined = false;

  client1.on("connect", () => {
    console.log("Client 1 connected");
  });

  client2.on("connect", () => {
    console.log("Client 2 connected");
  });

  client1.on("init-room", () => {
    console.log("Client 1 received init-room");
    client1.emit("join-room", roomId);
  });

  client2.on("init-room", () => {
    console.log("Client 2 received init-room");
    client2.emit("join-room", roomId);
  });

  client1.on("first-in-room", () => {
    console.log("Client 1 is first in room");
    client1Joined = true;
  });

  client2.on("new-user", (socketId) => {
    console.log(`Client 2 saw new user: ${socketId}`);
  });
  
  client1.on("new-user", (socketId) => {
    console.log(`Client 1 saw new user: ${socketId}`);
    client2Joined = true;
  });

  // Test broadcast
  client2.on("client-broadcast", (encryptedData, iv) => {
    console.log("Client 2 received broadcast from Client 1");
    console.log("Test PASSED!");
    client1.disconnect();
    client2.disconnect();
    process.exit(0);
  });

  // Wait for both to join then broadcast
  const checkInterval = setInterval(() => {
    if (client1Joined && client2Joined) { // Actually client 2 might not get "first-in-room" if it joins second
       // But client 1 should see new-user when client 2 joins
       // Let's just try broadcasting from client 1 after a short delay
    }
  }, 100);

  setTimeout(() => {
    console.log("Client 1 broadcasting...");
    client1.emit("server-broadcast", roomId, new ArrayBuffer(8), new Uint8Array(12));
  }, 2000);

  setTimeout(() => {
    console.log("Test TIMED OUT");
    client1.disconnect();
    client2.disconnect();
    process.exit(1);
  }, 5000);
}

testSync();
