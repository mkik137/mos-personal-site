import "./GuestbookPanel.css";

export default function GuestbookPanel() {
  return (
    <section className="panel" id="panel-guestbook">
      <div className="panel-head">
        <span className="panel-eyebrow">— Guestbook / 방명록</span>
        <button className="panel-close" data-close>
          닫기 <span>✕</span>
        </button>
      </div>
      <div className="panel-body">
        <p className="kicker">Leave a trace</p>
        <h1 className="title">방명록</h1>
        <p className="lead">
          지나가다 들른 당신의 한마디가 다음 작업의 씨앗이 됩니다. 짧아도 좋으니 편하게
          남겨주세요.
        </p>

        <hr className="rule" />

        <form className="gb-form" id="gb-form">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label htmlFor="gb-name">이름 / 별명</label>
              <input id="gb-name" type="text" maxLength={24} placeholder="익명의 방문자" />
            </div>
            <div>
              <label htmlFor="gb-msg">메시지</label>
              <textarea
                id="gb-msg"
                rows={3}
                maxLength={280}
                placeholder="여기에 흔적을 남겨주세요…"
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 12,
                }}
              >
                <span
                  id="gb-msgcount"
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 11,
                    letterSpacing: ".08em",
                    color: "var(--faint)",
                  }}
                >
                  0 / 280
                </span>
                <button type="submit" className="gb-submit">
                  남기기 →
                </button>
              </div>
            </div>
          </div>
          <p
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: 10,
              letterSpacing: ".06em",
              color: "var(--faint)",
              margin: "14px 0 0",
            }}
          >
            * 데모용 방명록입니다. 작성한 글은 이 브라우저에만 저장됩니다.
          </p>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 30 }}>
          <h2
            style={{
              fontFamily: "'Poppins','Pretendard'",
              fontWeight: 600,
              fontSize: "1.3rem",
              margin: 0,
            }}
          >
            남겨진 글
          </h2>
          <span
            id="gb-count"
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: 13,
              color: "var(--accent)",
            }}
          >
            00
          </span>
          <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>
        <div id="gb-list" />
      </div>
    </section>
  );
}
