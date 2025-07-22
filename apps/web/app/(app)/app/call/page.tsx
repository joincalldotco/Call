'use client';
import CallSection from "@/components/app/section/call-section";
import { useSocket } from "@/hooks/useSocket";

export default function CallPage() {
  const { connected } = useSocket();
  return (
    <>
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1000 }}>
        <span style={{
          padding: '6px 12px',
          borderRadius: 8,
          background: connected ? '#22c55e' : '#ef4444',
          color: 'white',
          fontWeight: 600,
        }}>
          {connected ? 'WebSocket connected' : 'WebSocket desconnected'}
        </span>
      </div>
      <CallSection />
    </>
  );
} 