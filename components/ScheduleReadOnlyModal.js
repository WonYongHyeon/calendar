import styles from "./Calendar.module.css";
import { BREAK_DAY_IMAGES } from "./images";

const EVENT_COLORS = {
  morning: "#d6eaff",
  evening: "#ffcccc",
  type1: "#d6eaff",
  type2: "#ffcccc",
  type3: "#e9ddff",
  type4: "#d7f7e2",
  personal: "#d4ff00",
};

export default function ScheduleReadOnlyModal({ dateStr, data, onClose }) {
  const [year, month, day] = dateStr.split("-").map(Number);

  const events = data?.events || [];
  const memo = data?.memo || "";
  const isBreakDay = data?.isBreakDay || false;

  const broadcastTimes = Array.isArray(data?.broadcastTimes)
    ? data.broadcastTimes
    : [data?.morningTime, data?.afternoonTime].filter(Boolean);

  const breakDayImage = BREAK_DAY_IMAGES.find(
    (image) => image.id === data?.breakDayImageId,
  );

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalContent} ${styles.readOnlyModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 날짜 */}
        <div className={styles.modalHeader}>
          <h3>
            {year}년 {month}월 {day}일
          </h3>

          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* 휴방 */}
          {isBreakDay ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <h3>휴방</h3>

              {breakDayImage && (
                <img
                  src={breakDayImage.url}
                  alt="휴방 이미지"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "200px",
                    objectFit: "contain",
                    marginTop: "15px",
                  }}
                />
              )}
            </div>
          ) : (
            <>
              {/* 방송 시간 */}
              {broadcastTimes.length > 0 && (
                <div className={styles.eventTimeSection}>
                  <h4>방송 시간</h4>

                  <div className={styles.broadcastTimeList}>
                    {broadcastTimes.map((time, index) => (
                      <div
                        key={`${time}-${index}`}
                        className={styles.broadcastTimeChip}
                      >
                        <span>{time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 일정 */}
              <div style={{ marginTop: "20px" }}>
                <h4>🗓️ 일정</h4>

                {events.length > 0 ? (
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      marginTop: "12px",
                    }}
                  >
                    {events.map((event, index) => (
                      <li
                        key={event.id || index}
                        style={{
                          padding: "12px",
                          marginBottom: "8px",
                          borderRadius: "8px",
                          backgroundColor:
                            EVENT_COLORS[event.scheduleType] ||
                            EVENT_COLORS.type1,
                          color: "#333",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {event.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: "#999", marginTop: "12px" }}>
                    등록된 일정이 없습니다.
                  </p>
                )}
              </div>
            </>
          )}

          {/* 메모 및 휴방 사유 */}
          {memo && (
            <div className={styles.memoSection} style={{ marginTop: "20px" }}>
              <h4>{isBreakDay ? "휴방 사유" : "메모"}</h4>

              <div
                style={{
                  marginTop: "10px",
                  padding: "12px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  color: "#333",
                }}
              >
                {memo}
              </div>
            </div>
          )}
        </div>

        {/* 닫기 */}
        <div className={styles.modalFooter}>
          <button className={styles.saveBtn} onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
