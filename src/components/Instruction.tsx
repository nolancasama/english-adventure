import { say } from "../audio";

export function Instruction({ children }: { children: string }) {
  return <button className="instruction" onClick={() => say(children, { lang: "ja-JP" })}>{children} <span aria-hidden="true">🔈</span></button>;
}
