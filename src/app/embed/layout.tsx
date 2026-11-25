import type { ReactNode } from "react";

const escapeScript = `document.addEventListener("keydown",function(event){if(event.key==="Escape"&&window.parent!==window){window.parent.postMessage({type:"driftwood-close"},window.location.origin)}},true);`;

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: escapeScript }} />
      {children}
    </>
  );
}
