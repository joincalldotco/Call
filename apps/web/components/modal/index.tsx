import { AddMemberToTeam } from "./add-member-to-team";
import { CreateContacts } from "./create-contacts";
import { CreateTeam } from "./create-team";
import { StartCall } from "./start-call";
import { Thoughts } from "./thoughts";
import { ViewParticipants } from "./view-participants";
const Modals = () => {
  return (
    <>
      <CreateTeam />
      <StartCall />
      <CreateContacts />
      <Thoughts />
      <AddMemberToTeam />
      <ViewParticipants />
    </>
  );
};

export default Modals;
