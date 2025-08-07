import { AddMemberToTeam } from "./add-member-to-team";
import { CreateContact } from "./create-contact";
import { CreateTeam } from "./create-team";
import { StartCall } from "./start-call";
import { Thoughts } from "./thoughts";
import { ViewParticipants } from "./view-participants";
const Modals = () => {
  return (
    <>
      <CreateTeam />
      <StartCall />
      <CreateContact />
      <Thoughts />
      <AddMemberToTeam />
      <ViewParticipants />
    </>
  );
};

export default Modals;
