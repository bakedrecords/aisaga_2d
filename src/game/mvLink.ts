/** A clickable credit link to the source music video, shown on the title only.
 *  Implemented as a DOM element (canvas text can't be clicked). No-op headless. */
const URL = "https://www.youtube.com/watch?v=iTBFHXub7sQ";
const LABEL = "♪ 原曲MV『愛をさがしだせ！』銀幕一楼とTIMECAFE";

let el: HTMLAnchorElement | null = null;

export function showMvLink(visible: boolean): void {
  if (typeof document === "undefined") return;
  if (!el) {
    el = document.createElement("a");
    el.id = "mv-link";
    el.href = URL;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    el.textContent = LABEL;
    document.body.appendChild(el);
  }
  el.style.display = visible ? "" : "none";
}
