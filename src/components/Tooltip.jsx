import { createContext, useContext, useRef, useState, useCallback } from 'react';

const TooltipCtx = createContext(null);

export function TooltipProvider({ children }) {
  const [state, setState] = useState(null); // {x,y,html}
  const show = useCallback((x, y, html) => setState({ x, y, html }), []);
  const hide = useCallback(() => setState(null), []);
  return (
    <TooltipCtx.Provider value={{ show, hide }}>
      {children}
      <TooltipEl state={state} />
    </TooltipCtx.Provider>
  );
}

export function useTooltip() {
  return useContext(TooltipCtx);
}

function TooltipEl({ state }) {
  const ref = useRef(null);
  if (!state) return <div className="tooltip" hidden />;
  const pad = 14;
  let left = state.x + pad, top = state.y + pad;
  if (typeof window !== 'undefined') {
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = ref.current?.offsetWidth || 160, h = ref.current?.offsetHeight || 40;
    if (left + w > vw - 8) left = state.x - w - pad;
    if (top + h > vh - 8) top = state.y - h - pad;
  }
  return (
    <div ref={ref} className="tooltip" style={{ left, top }} dangerouslySetInnerHTML={{ __html: state.html }} />
  );
}
