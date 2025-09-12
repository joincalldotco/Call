import { CallRoom } from "@/components/call/call-room";

interface CallRoomPageProps {
  params: Promise<{ id: string }>;
}

const CallRoomPage = async ({ params }: CallRoomPageProps) => {
  const { id } = await params;
  return <CallRoom id={id} />;
};

export default CallRoomPage;
