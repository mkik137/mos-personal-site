import * as THREE from 'three';

interface FaceOpts {
  brow?: string;
}

function drawCheeks(ctx: CanvasRenderingContext2D, cx: number): void {
  [-1, 1].forEach((s) => {
    const gx = cx + s * 60, gy = 156;
    const grd = ctx.createRadialGradient(gx, gy, 2, gx, gy, 28);
    grd.addColorStop(0, 'rgba(255,135,125,0.62)');
    grd.addColorStop(1, 'rgba(255,135,125,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(gx, gy, 28, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEyebrows(ctx: CanvasRenderingContext2D, cx: number, eyeY: number, eyeDX: number, browColor: string): void {
  ctx.strokeStyle = browColor;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.moveTo(cx + s * eyeDX - 15, eyeY - 34);
    ctx.quadraticCurveTo(cx + s * eyeDX, eyeY - 40, cx + s * eyeDX + 15, eyeY - 33);
    ctx.stroke();
  });
}

function drawEyes(ctx: CanvasRenderingContext2D, cx: number, eyeY: number, eyeDX: number): void {
  [-1, 1].forEach((s) => {
    const ex = cx + s * eyeDX;
    ctx.fillStyle = 'rgba(60,40,30,0.12)';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY + 2, 18, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f1812';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 13, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex + 4, eyeY - 8, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(ex - 4, eyeY + 9, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawNose(ctx: CanvasRenderingContext2D, cx: number): void {
  ctx.fillStyle = 'rgba(206,150,120,0.9)';
  ctx.beginPath();
  ctx.ellipse(cx, 150, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMouth(ctx: CanvasRenderingContext2D, cx: number): void {
  ctx.strokeStyle = '#7a3b30';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 16, 176);
  ctx.quadraticCurveTo(cx, 190, cx + 16, 176);
  ctx.stroke();
}

export function makeFaceTexture(opts: FaceOpts = {}): THREE.CanvasTexture {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);

  const cx = S / 2;
  const eyeY = 116, eyeDX = 44;
  const browColor = opts.brow ?? '#2a2018';

  drawCheeks(ctx, cx);
  drawEyebrows(ctx, cx, eyeY, eyeDX, browColor);
  drawEyes(ctx, cx, eyeY, eyeDX);
  drawNose(ctx, cx);
  drawMouth(ctx, cx);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
