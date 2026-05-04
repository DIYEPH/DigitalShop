import { useState } from "react";

export function useAddedPulse(durationMs = 1200) {
  const [added, setAdded] = useState(false);

  const pulse = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), durationMs);
  };

  return { added, pulse };
}

