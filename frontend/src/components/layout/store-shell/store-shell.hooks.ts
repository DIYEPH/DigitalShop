import { useState } from "react";

export function useStoreShell() {
  const [eventModalOpen, setEventModalOpen] = useState(false);

  const openEventModal = () => setEventModalOpen(true);
  const closeEventModal = () => setEventModalOpen(false);

  return {
    eventModalOpen,
    openEventModal,
    closeEventModal,
  };
}

