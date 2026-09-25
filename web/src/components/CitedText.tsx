/** Renders [n] citation markers as chips without pulling in a markdown lib. */
export function CitedText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[\d+\])/g).map((part, i) =>
        /^\[\d+\]$/.test(part) ? <sup key={i}>{part}</sup> : <span key={i}>{part}</span>
      )}
    </>
  );
}
