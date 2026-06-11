import * as THREE from 'three';

function drawShibaEyes(ctx: CanvasRenderingContext2D, cx: number, eyeY: number, eyeDX: number): void {
  [-1, 1].forEach((s) => {
    const ex = cx + s * eyeDX;

    // 눈 흰자 (약간 큰 타원)
    ctx.fillStyle = '#f8f4f0';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 17, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 홍채
    ctx.fillStyle = '#1a0f08';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY + 1, 13, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 큰 반사광
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex + 5, eyeY - 7, 5, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 작은 반사광
    ctx.fillStyle = 'rgba(255,255,255,0.70)';
    ctx.beginPath();
    ctx.arc(ex - 5, eyeY + 9, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawShibaBrows(ctx: CanvasRenderingContext2D, cx: number, eyeY: number, eyeDX: number): void {
  // 탄색 눈썹 마킹 (아바타의 눈썹처럼 선명하게)
  [-1, 1].forEach((s) => {
    const ex = cx + s * eyeDX;
    ctx.fillStyle = 'rgba(210,148,68,0.98)';
    ctx.beginPath();
    ctx.ellipse(ex + s * 1, eyeY - 31, 11, 7.5, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawShibaCheeks(ctx: CanvasRenderingContext2D, cx: number): void {
  // 아바타처럼 선명한 볼터치
  [-1, 1].forEach((s) => {
    const gx = cx + s * 68, gy = 155;
    const grd = ctx.createRadialGradient(gx, gy, 2, gx, gy, 30);
    grd.addColorStop(0, 'rgba(255,130,110,0.52)');
    grd.addColorStop(1, 'rgba(255,130,110,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(gx, gy, 30, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function makeShibaFaceTexture(): THREE.CanvasTexture {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);

  const cx = S / 2;
  const eyeY = 100, eyeDX = 50;

  drawShibaCheeks(ctx, cx);
  drawShibaBrows(ctx, cx, eyeY, eyeDX);
  drawShibaEyes(ctx, cx, eyeY, eyeDX);

  // 코
  ctx.fillStyle = '#1a100a';
  ctx.beginPath();
  ctx.ellipse(cx, 148, 13, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx - 4, 144, 4, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // 미소
  ctx.strokeStyle = 'rgba(100,50,20,0.88)';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 13, 166);
  ctx.quadraticCurveTo(cx, 182, cx + 13, 166);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
