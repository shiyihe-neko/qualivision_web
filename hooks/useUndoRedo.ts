import { useState, useCallback } from 'react';

export default function useUndoRedo<T>(initialState: T) {
  const [present, setPresent] = useState<T>(initialState);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setFuture([present, ...future]);
    setPresent(previous);
    setPast(newPast);
  }, [past, present, future, canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast([...past, present]);
    setPresent(next);
    setFuture(newFuture);
  }, [past, present, future, canRedo]);

  const set = useCallback((newPresent: T | ((prev: T) => T)) => {
    setPresent((curr) => {
      const updated = typeof newPresent === 'function' 
        ? (newPresent as (prev: T) => T)(curr) 
        : newPresent;
      
      if (updated === curr) return curr; // No change

      setPast((prevPast) => [...prevPast, curr].slice(-20)); // Limit history to 20 steps
      setFuture([]); // Clear future on new action
      return updated;
    });
  }, []);

  // Set without pushing to history (for loading files, etc.)
  const reset = useCallback((newState: T) => {
    setPresent(newState);
    setPast([]);
    setFuture([]);
  }, []);

  return { state: present, set, undo, redo, canUndo, canRedo, reset };
}