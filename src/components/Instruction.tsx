import { say } from "../audio";
import { Icon } from "./Icon";

export function Instruction({ children }: { children: string }) {
  const tapIndex = children.indexOf("タップ");
  const beforeTap = tapIndex >= 0 ? children.slice(0, tapIndex) : children;
  const afterTap = tapIndex >= 0 ? children.slice(tapIndex) : "";

  return (
    <button className="instruction" onClick={() => say(children, { lang: "ja-JP" })}>
      <span className="instruction-text">
        {beforeTap}
        {afterTap && <><wbr />{afterTap}</>}
      </span>
      <Icon name="speaker" />
    </button>
  );
}
