import { getTickets } from "../src/actions/ticket.actions";

const TicketsPage = async () => {
  const tickets = await getTickets();

  return <div>TicketsPage</div>;
};

export default TicketsPage;
