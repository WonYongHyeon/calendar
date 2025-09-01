// components/ScheduleModal.js
import { useState, useEffect } from "react";
import styles from "./Calendar.module.css";

const ScheduleModal = ({ dateStr, data, onClose, onSave }) => {
  const [events, setEvents] = useState([]);
  const [memo, setMemo] = useState("");
  const [newEvent, setNewEvent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [isMemoEditing, setIsMemoEditing] = useState(false);

  useEffect(() => {
    setEvents(data.events || []);
    setMemo(data.memo || "");
  }, [data]);

  const handleAddEvent = (e) => {
    // 엔터 키 (e.key === 'Enter') 또는 버튼 클릭 (e.type === 'click') 시 동작
    if (e.key === "Enter" || e.type === "click") {
      if (newEvent.trim()) {
        const newEventItem = {
          text: newEvent.trim(),
          isImportant: isImportant,
        };
        setEvents([...events, newEventItem]);
        setNewEvent("");
        setIsImportant(false);
      }
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
          {/* 일정 추가 타이틀과 중요 버튼을 한 줄에 배치 */}
          <div className={styles.eventTitleRow}>
            <h4>🗓️ 일정 추가</h4>
            <div className={styles.importantCheckbox}>
              <span className={styles.toggleLabel}>아침</span>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
              <span className={styles.toggleLabel}>저녁</span>
            </div>
          </div>

          <div className={styles.addEventRow}>
            <input
              type="text"
              className={styles.eventInput}
              placeholder="일정을 입력하세요"
              value={newEvent}
              onChange={(e) => setNewEvent(e.target.value)}
              onKeyUp={handleAddEvent}
            />
            <button className={styles.addEventBtn} onClick={handleAddEvent}>
              등록
            </button>
          </div>
          <ul className={styles.eventListModal}>
            {events.map((event, index) => (
              <li
                key={index}
                className={
                  event.isImportant
                    ? styles.importantEventListItem
                    : styles.eventListItem
                }
              >
                {event.text}
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
