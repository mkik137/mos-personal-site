import * as THREE from 'three';

export function animateLimbs(
  model: THREE.Object3D,
  speed: number,
  airborne: boolean,
  jumpVel: number,
  t: number,
  idlePhase = 0,
): void {
  const ud = model.userData;
  if (!ud?.leftArm) return;

  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

  // ── 팔·다리 ──────────────────────────────────
  if (airborne) {
    ud.leftArm.rotation.x  = lerp(ud.leftArm.rotation.x,  -2.1, 0.18);
    ud.rightArm.rotation.x = lerp(ud.rightArm.rotation.x, -2.1, 0.18);
    const legPose = jumpVel > 0 ? 0.55 : -0.2;
    ud.leftLeg.rotation.x  = lerp(ud.leftLeg.rotation.x,  legPose,       0.18);
    ud.rightLeg.rotation.x = lerp(ud.rightLeg.rotation.x, legPose * 0.6, 0.18);
  } else {
    const amt = Math.min(speed / 6, 1);
    if (amt > 0.06) {
      const swing = Math.sin(t * 9) * 0.62 * amt;
      ud.leftLeg.rotation.x  =  swing;
      ud.rightLeg.rotation.x = -swing;
      ud.leftArm.rotation.x  = -swing * 0.9;
      ud.rightArm.rotation.x =  swing * 0.9;
    } else {
      const breathe = Math.sin(t * 1.6 + idlePhase) * 0.05;
      ud.leftArm.rotation.x  = lerp(ud.leftArm.rotation.x,   breathe, 0.1);
      ud.rightArm.rotation.x = lerp(ud.rightArm.rotation.x, -breathe, 0.1);
      ud.leftLeg.rotation.x  = lerp(ud.leftLeg.rotation.x,  0, 0.1);
      ud.rightLeg.rotation.x = lerp(ud.rightLeg.rotation.x, 0, 0.1);
    }
  }

  // ── 꼬리 (시바 전용) ──────────────────────────
  if (!ud.tail) return;

  if (airborne) {
    // 공중에서 꼬리가 들려 올라감
    ud.tail.rotation.x = lerp(ud.tail.rotation.x,  0.55, 0.12);
    ud.tail.rotation.y = lerp(ud.tail.rotation.y,  0,    0.10);
    ud.tail.rotation.z = lerp(ud.tail.rotation.z,  0,    0.10);
  } else if (speed > 0.5) {
    // 달리거나 걸을 때: 속도에 비례한 흔들기
    // 빠를수록 주기 빠르고 진폭 넓음 + 약간 위로 올림
    const fast   = speed > 7;
    const freq   = fast ? 8.0  : 5.0;
    const amp    = fast ? 0.72 : 0.46;
    const tiltUp = fast ? 0.30 : 0.14; // 꼬리를 약간 들어올림
    ud.tail.rotation.y  = Math.sin(t * freq + idlePhase)        * amp;
    ud.tail.rotation.x  = lerp(ud.tail.rotation.x, -tiltUp, 0.08);
    // 수평 8자 보조 흔들기 (z 축)로 입체감 추가
    ud.tail.rotation.z  = Math.sin(t * freq * 0.5 + idlePhase)  * amp * 0.22;
  } else {
    // 가만히 있을 때: 느리고 작게 좌우로 살랑거림
    ud.tail.rotation.y  = Math.sin(t * 2.0 + idlePhase) * 0.20;
    ud.tail.rotation.x  = lerp(ud.tail.rotation.x, 0, 0.06);
    ud.tail.rotation.z  = Math.sin(t * 1.1 + idlePhase) * 0.06;
  }
}
