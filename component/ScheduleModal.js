// components/ScheduleModal.js
import { useState, useEffect } from "react";
import styles from "./Calendar.module.css"; // 캘린더 CSS를 같이 사용

const ScheduleModal = ({ dateStr, data, onClose, onSave }) => {
  const [events, setEvents] = useState([]);
  const [memo, setMemo] = useState("");
  const [newEvent, setNewEvent] = useState("");
  const [isMemoEditing, setIsMemoEditing] = useState(false);

  useEffect(() => {
    setEvents(data.events);
    setMemo(data.memo);
  }, [data]);

  const handleAddEvent = (e) => {
    if (e.key === "Enter" && newEvent.trim()) {
      setEvents([...events, newEvent.trim()]);
      setNewEvent("");
    }
  };

  const handleDeleteEvent = (indexToDelete) => {
    setEvents(events.filter((_, index) => index !== indexToDelete));
  };

  const handleSave = () => {
    onSave(dateStr, events, memo);
  };

  const date = new Date(dateStr);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{`${date.getFullYear()}년 ${
            date.getMonth() + 1
          }월 ${date.getDate()}일`}</h3>
          <button className={styles.closeBtn} onClick={handleSave}>
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          <h4>🗓️ 일정 추가</h4>
          <input
            type="text"
            className={styles.eventInput}
            placeholder="일정을 입력하고 Enter를 누르세요"
            value={newEvent}
            onChange={(e) => setNewEvent(e.target.value)}
            onKeyUp={handleAddEvent}
          />
          <ul className={styles.eventListModal}>
            {events.map((event, index) => (
              <li key={index}>
                {event}
                <button
                  className={styles.deleteEventBtn}
                  onClick={() => handleDeleteEvent(index)}
                >
                  X
                </button>
              </li>
            ))}
          </ul>

          <div className={styles.memoSection}>
            <div className={styles.memoHeader}>
              <h4>📝 메모</h4>
              <button
                className={styles.editMemoBtn}
                onClick={() => setIsMemoEditing(!isMemoEditing)}
              >
                {isMemoEditing ? "저장" : "수정"}
              </button>
            </div>
            <textarea
              className={styles.memoInput}
              placeholder="메모를 입력하세요."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              readOnly={!isMemoEditing}
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.saveBtn} onClick={handleSave}>
            저장하고 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
