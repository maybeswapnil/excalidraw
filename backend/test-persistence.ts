
import { io } from "socket.io-client";

const PORT = 5000;
const URL = `http://localhost:${PORT}`;

async function testPersistence() {
  console.log("Starting persistence test...");

  const socket = io(URL);

  socket.on("connect", () => {
    console.log("Connected to server");
    
    // Test Canvas Save
    const messageId = "test-save-" + Date.now();
    const payload = {
      type: "canvas:save",
      messageId,
      data: {
        timestamp: Date.now(),
        dataState: {
          elements: [{ id: "1", type: "rectangle" }],
          appState: { viewBackgroundColor: "#ffffff" }
        }
      }
    };

    console.log("Sending canvas:save...");
    socket.emit("canvas:save", payload, (response) => {
      console.log("Received save ack:", response);
      
      if (response.success) {
        // Test Canvas Load
        const loadMessageId = "test-load-" + Date.now();
        console.log("Sending canvas:load...");
        socket.emit("canvas:load", { type: "canvas:load", messageId: loadMessageId, data: {} }, (loadResponse) => {
           console.log("Received load response:", loadResponse);
           if (loadResponse.type === "canvas:data" && loadResponse.data.elements.length > 0) {
             console.log("Persistence Test PASSED!");
             socket.disconnect();
             process.exit(0);
           } else {
             console.log("Persistence Test FAILED: Data mismatch");
             socket.disconnect();
             process.exit(1);
           }
        });
      } else {
        console.log("Persistence Test FAILED: Save failed");
        socket.disconnect();
        process.exit(1);
      }
    });
  });

  setTimeout(() => {
    console.log("Test TIMED OUT");
    socket.disconnect();
    process.exit(1);
  }, 5000);
}

testPersistence();
