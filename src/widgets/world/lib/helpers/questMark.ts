// @ts-nocheck
// 퀘스트 마크 — 말풍선 안에 그리는 "?" (퀘스트를 받으러 오라는 유도 표시).
// 동기 캔버스 드로잉(폰트 미로드 시 fallback 으로도 모양 동일) → 별도 로딩/이미지 불필요.

// ctx 의 (cx,cy) 중심에 size 크기의 "?" 를 그린다 (골드 채움 + 어두운 외곽선).
export function drawQuestMark(c, cx, cy, size): void {
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `800 ${size}px Poppins, Arial, sans-serif`;
  c.lineJoin = 'round';
  c.miterLimit = 2;
  // 외곽선 (흰 말풍선에서 대비)
  c.strokeStyle = '#4a2e10';
  c.lineWidth = Math.max(3, size * 0.14);
  c.strokeText('?', cx, cy + 1);
  // 채움 (골드)
  c.fillStyle = '#f6a91e';
  c.fillText('?', cx, cy + 1);
  c.restore();
}
