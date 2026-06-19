import "./SkillBar.css";

// 중앙 하단 스킬바 — world 엔진(skills.ts)이 4개 장착 슬롯 + 열기 버튼을 명령형으로 채운다.
// 시작(startWorld) 후 revealSkillBar() 가 .on 을 붙여 노출한다. 숫자키 1~4 / 클릭으로 시전.
export default function SkillBar() {
  return <div id="skillbar" aria-label="스킬" />;
}
