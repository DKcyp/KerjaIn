import { useState } from 'react';

export function useBAStatusUpdate() {
  const [loading, setLoading] = useState(false);

  const updateStatus = async (baId: number, newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blueprint-baru/${baId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      setLoading(false);
      return data;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  return { updateStatus, loading };
}
