import { KeyboardEventHandler, useEffect } from "react";

export const clip = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export const useKeyPress = (handle: (event: KeyboardEvent) => void, deps?: React.DependencyList) => {
    // Install keypress listener
    useEffect(() => {
        window.addEventListener('keydown', handle);
        return () => {
          window.removeEventListener('keydown', handle);
        };
      }, deps);

}
