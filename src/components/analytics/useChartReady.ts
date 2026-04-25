"use client";

import * as React from "react";

export function useChartReady<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [ready, setReady] = React.useState(false);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.max(0, Math.floor(rect.width));
      const height = Math.max(0, Math.floor(rect.height));
      setSize({ width, height });
      setReady(width > 0 && height > 0);
    };

    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return { ref, ready, width: size.width, height: size.height };
}
