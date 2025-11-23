import { createServer } from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server, Socket } from "socket.io";
import getMongoDb from "./db.js";

import type { Request, Response } from "express";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for now
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Socket.IO event handlers
io.on("connection", (socket: Socket) => {
  console.log(`📱 Client connected: ${socket.id}`);

  // Inform the client that the room initialization can proceed
  socket.emit("init-room");

  socket.on("join-room", (roomId: string) => {
    console.log(`👤 Client ${socket.id} joining room ${roomId}`);
    socket.join(roomId);

    const clients = io.sockets.adapter.rooms.get(roomId);
    const numClients = clients ? clients.size : 0;

    if (numClients === 1) {
      socket.emit("first-in-room");
    } else {
      socket.to(roomId).emit("new-user", socket.id);
    }

    // Send updated user list to all clients in the room
    const clientIds = Array.from(clients || []);
    io.to(roomId).emit("room-user-change", clientIds);
  });

  socket.on("server-broadcast", (roomId: string, encryptedData: ArrayBuffer, iv: Uint8Array) => {
    // Broadcast to all other clients in the room
    socket.to(roomId).emit("client-broadcast", encryptedData, iv);
  });

  socket.on("server-volatile-broadcast", (roomId: string, encryptedData: ArrayBuffer, iv: Uint8Array) => {
    // Volatile broadcast to all other clients in the room
    socket.volatile.to(roomId).emit("client-broadcast", encryptedData, iv);
  });

  socket.on("user-follow", (payload: any) => {
    // Broadcast to the room that a user is being followed (or similar logic)
    // For now, we just acknowledge it or ignore if not critical
  });

  // Persistence Handlers
  socket.on("canvas:save", async (message: any, callback: (response: any) => void) => {
    try {
      const db = await getMongoDb();
      const collection = db.collection("tabs"); // Use 'tabs' collection for everything now
      
      const tabId = message.data.tabId || "singleton";

      await collection.updateOne(
        { _id: tabId } as any,
        {
          $set: {
            dataState: message.data.dataState,
            timestamp: message.data.timestamp,
            serverTimestamp: Date.now(),
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );

      console.log(`💾 Canvas saved for tab: ${tabId}`);

      // Send ack
      if (callback) {
        callback({
          type: "ack",
          messageId: message.messageId,
          success: true,
        });
      }

      // Broadcast update to all other connected clients
      // We should probably broadcast to a room specific to the tab?
      // For now, let's just broadcast globally but include tabId so clients can filter
      const updateMessage = {
        type: "canvas:update",
        data: {
          tabId,
          elements: message.data.dataState?.elements || [],
          appState: message.data.dataState?.appState || {},
          libraryItems: message.data.dataState?.libraryItems || [],
          serverTimestamp: Date.now(),
        },
      };

      socket.broadcast.emit("canvas:update", updateMessage);

    } catch (error) {
      console.error("Error saving canvas:", error);
      if (callback) {
        callback({
          type: "error",
          message: "Failed to save canvas",
        });
      }
    }
  });

  socket.on("canvas:load", async (message: any, callback: (response: any) => void) => {
    try {
      const db = await getMongoDb();
      const collection = db.collection("tabs"); // Use 'tabs' collection

      const tabId = message.data?.tabId || "singleton";
      const document = await collection.findOne({ _id: tabId } as any);

      const response = {
        type: "canvas:data",
        messageId: message.messageId,
        data: document
          ? {
              elements: document.dataState?.elements || document.elements || [],
              appState: document.dataState?.appState || document.appState || {},
              libraryItems: document.dataState?.libraryItems || [],
              serverTimestamp: document.serverTimestamp,
            }
          : {
              elements: [],
              appState: {},
              libraryItems: [],
              serverTimestamp: Date.now(),
            },
      };

      if (callback) {
        callback(response);
      } else {
         socket.emit("message", JSON.stringify(response));
      }
    } catch (error) {
      console.error("Error loading canvas:", error);
      if (callback) {
        callback({
          type: "error",
          message: "Failed to load canvas",
        });
      }
    }
  });

  socket.on("files:save", async (message: any, callback: (response: any) => void) => {
    try {
      const db = await getMongoDb();
      const collection = db.collection("files");

      const savedFiles = [];
      const erroredFiles = [];

      for (const file of message.data.files || []) {
        try {
          await collection.updateOne(
            { _id: file.id || file.fileId },
            {
              $set: {
                dataURL: file.dataURL,
                mimeType: file.mimeType,
                created: file.created || Date.now(),
                lastRetrieved: file.lastRetrieved || Date.now(),
                version: file.version || 1,
                timestamp: message.data.timestamp,
                updatedAt: new Date(),
              },
            },
            { upsert: true },
          );
          savedFiles.push(file.id || file.fileId);
        } catch (error) {
          erroredFiles.push(file.id || file.fileId);
        }
      }

      if (callback) {
        callback({
          type: "ack",
          messageId: message.messageId,
          success: true,
          savedFiles,
          erroredFiles,
        });
      }
    } catch (error) {
       console.error("Error saving files:", error);
       if (callback) {
         callback({
           type: "error",
           message: "Failed to save files",
         });
       }
    }
  });

  socket.on("files:load", async (message: any, callback: (response: any) => void) => {
    try {
      const db = await getMongoDb();
      const collection = db.collection("files");

      const ids = message.data.ids || [];
      const files = await collection.find({ _id: { $in: ids } }).toArray();

      const loadedFileIds = new Set(files.map((f: any) => f._id));
      const erroredFiles = ids.filter((id: string) => !loadedFileIds.has(id));

      if (callback) {
        callback({
          type: "files:data",
          messageId: message.messageId,
          files: files.map((f: any) => ({
            id: f._id,
            dataURL: f.dataURL,
            mimeType: f.mimeType,
            created: f.created,
            lastRetrieved: f.lastRetrieved,
            version: f.version,
          })),
          erroredFiles: erroredFiles.map((id: string) => [id, true]),
        });
      }
    } catch (error) {
      console.error("Error loading files:", error);
      if (callback) {
        callback({
          type: "error",
          message: "Failed to load files",
        });
      }
    }
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        // Notify others in the room
        socket.to(roomId).emit("room-user-change", Array.from(io.sockets.adapter.rooms.get(roomId) || []).filter(id => id !== socket.id));
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`📵 Client disconnected: ${socket.id}`);
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    connectedClients: io.engine.clientsCount,
  });
});

// REST API for Tabs
app.get("/api/tabs", async (req: Request, res: Response) => {
  try {
    const db = await getMongoDb();
    const collection = db.collection("tabs");
    const tabs = await collection.find().sort({ updatedAt: -1 }).toArray();
    res.json({ tabs });
  } catch (error) {
    console.error("Error fetching tabs:", error);
    res.status(500).json({ error: "Failed to fetch tabs" });
  }
});

app.get("/api/tabs/:id", async (req: Request, res: Response) => {
  try {
    const db = await getMongoDb();
    const collection = db.collection("tabs");
    const tab = await collection.findOne({ _id: req.params.id } as any);
    if (!tab) {
      res.status(404).json({ error: "Tab not found" });
      return;
    }
    res.json({ tab });
  } catch (error) {
    console.error("Error fetching tab:", error);
    res.status(500).json({ error: "Failed to fetch tab" });
  }
});

app.post("/api/tabs", async (req: Request, res: Response) => {
  try {
    const { name, elements, appState } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const db = await getMongoDb();
    const collection = db.collection("tabs");
    
    // Generate a simple ID (in production use UUID or ObjectId)
    const _id = Math.random().toString(36).substring(2, 15);
    
    const newTab = {
      _id,
      name,
      elements: elements || [],
      appState: appState || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collection.insertOne(newTab as any);
    res.status(201).json({ tab: newTab });
  } catch (error) {
    console.error("Error creating tab:", error);
    res.status(500).json({ error: "Failed to create tab" });
  }
});

app.put("/api/tabs/:id", async (req: Request, res: Response) => {
  try {
    const { name, elements, appState } = req.body;
    const db = await getMongoDb();
    const collection = db.collection("tabs");

    const updates: any = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (elements) updates.elements = elements;
    if (appState) updates.appState = appState;

    const result = await collection.updateOne(
      { _id: req.params.id } as any,
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: "Tab not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating tab:", error);
    res.status(500).json({ error: "Failed to update tab" });
  }
});

app.delete("/api/tabs/:id", async (req: Request, res: Response) => {
  try {
    const db = await getMongoDb();
    const collection = db.collection("tabs");
    const result = await collection.deleteOne({ _id: req.params.id } as any);

    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Tab not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting tab:", error);
    res.status(500).json({ error: "Failed to delete tab" });
  }
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Excalidraw Socket.IO Sync server listening on port ${PORT}`);
});

