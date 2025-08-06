"use client";

import { useEffect, useRef } from "react";
import { useCallContext } from "@/contexts/call-context";

export const useCallProducers = () => {
  const { state, mediasoup } = useCallContext();
  const consumedProducers = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (
      !state.joined ||
      !state.producers.length ||
      !mediasoup.device ||
      !state.recvTransportReady
    )
      return;

    console.log("[Call] Processing existing producers:", state.producers);
    console.log("[Call] Current userId:", mediasoup.userId);

    state.producers.forEach((producer) => {
      console.log(
        `[Call] Checking producer ${producer.id} from peer ${producer.peerId}`
      );

      if (
        !consumedProducers.current.has(producer.id) &&
        producer.peerId !== mediasoup.userId
      ) {
        console.log(`[Call] Consuming existing producer: ${producer.id}`);
        consumedProducers.current.add(producer.id);
        if (!mediasoup.device || !mediasoup.device.rtpCapabilities) {
          console.error(
            "[Call] Cannot consume: mediasoup device or rtpCapabilities missing"
          );
          return;
        }
        mediasoup.consume(
          producer.id,
          mediasoup.device.rtpCapabilities,
          undefined,
          producer.muted
        );
        console.log(
          `[Call] Skipping producer ${producer.id}: already consumed or own producer`
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.joined,
    state.producers,
    mediasoup.device,
    state.recvTransportReady,
    mediasoup.consume,
    mediasoup.userId,
  ]);

  useEffect(() => {
    if (
      !state.joined ||
      !mediasoup.socket ||
      !mediasoup.device ||
      !state.recvTransportReady
    )
      return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "newProducer" && data.id) {
          console.log("[Call] New producer message:", data);

          if (data.peerId === mediasoup.userId) {
            console.log("[Call] Ignoring own producer");
            return;
          }

          if (!consumedProducers.current.has(data.id)) {
            console.log(
              `[Call] Consuming new producer: ${data.id} from peer: ${data.peerId}`
            );
            consumedProducers.current.add(data.id);
            if (!mediasoup.device || !mediasoup.device.rtpCapabilities) {
              console.error(
                "[Call] Cannot consume: mediasoup device or rtpCapabilities missing"
              );
              return;
            }
            mediasoup.consume(
              data.id,
              mediasoup.device.rtpCapabilities,
              undefined,
              data.muted
            );
            console.log(`[Call] Producer ${data.id} already consumed`);
          }
        }

        if (data.type === "producerClosed") {
          console.log("[Call] Producer closed:", data);
          const producerId = data.producerId;

          consumedProducers.current.delete(producerId);
        }
      } catch (err) {
        console.error("[WebSocket] Error processing message:", err);
      }
    };

    mediasoup.socket?.addEventListener("message", handleMessage);
    return () => {
      mediasoup.socket?.removeEventListener("message", handleMessage);
    };
  }, [
    state.joined,
    mediasoup.socket,
    mediasoup.device,
    state.recvTransportReady,
    mediasoup.consume,
    mediasoup.userId,
  ]);

  useEffect(() => {
    return () => {
      consumedProducers.current.clear();
    };
  }, []);

  return { consumedProducers: consumedProducers.current };
};
