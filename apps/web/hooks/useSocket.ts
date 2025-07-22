"use client";
import { useEffect, useRef, useState } from "react";

const getSocketUrl = () => {
  if (typeof window === "undefined") return "ws://localhost:4001";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  const port = "4001";
  return `${protocol}//${host}:${port}`;
};

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const connectWebSocket = () => {
      const socket = new WebSocket(getSocketUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        console.log("[useSocket] WebSocket connection opened at:", getSocketUrl());
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };

      socket.onclose = () => {
        setConnected(false);
        console.log("[useSocket] WebSocket connection closed");
        reconnectTimeoutRef.current = window.setTimeout(connectWebSocket, 2000);
      };

      socket.onerror = (err) => {
        console.error("[useSocket] WebSocket error:", err);
      };
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { socket: socketRef.current, connected };
}
