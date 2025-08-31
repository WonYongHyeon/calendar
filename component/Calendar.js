// components/Calendar.js
import { useState, useEffect } from "react";
import styles from "./Calendar.module.css";
import ScheduleModal from "./ScheduleModal";

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // 컴포넌트가 처음 렌더링될 때 localStorage에서 데이터 불러오기
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("calendarSchedules");
      if (savedData) {
        setScheduleData(JSON.parse(savedData));
      }
    } catch (error) {
      console.error("Failed to parse schedule data from localStorage", error);
    }
  }, []);

  // scheduleData가 변경될 때마다 localStorage에 저장하기
  useEffect(() => {
    localStorage.setItem("calendarSchedules", JSON.stringify(scheduleData));
  }, [scheduleData]);

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const handleSaveSchedule = (dateStr, newEvents, newMemo) => {
    const newData = { ...scheduleData };

    if (newEvents.length === 0 && !newMemo) {
      delete newData[dateStr];
    } else {
      newData[dateStr] = { events: newEvents, memo: newMemo };
    }

    setScheduleData(newData);
    handleCloseModal();
  };

  const renderHeader = () => {
    return (
      <div className={styles.calendarHeader}>
        <button className={styles.navBtn} onClick={handlePrevMonth}>
          &lt;
        </button>
        <h2>
          {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
        </h2>
        <button className={styles.navBtn} onClick={handleNextMonth}>
          &gt;
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return (
      <div className={styles.calendarGrid}>
        {days.map((day) => (
          <div key={day} className={styles.dayName}>
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const lastDateOfMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    // 이전 달 날짜
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(
        <div
          key={`prev-${i}`}
          className={`${styles.dateCell} ${styles.otherMonth}`}
        ></div>
      );
    }

    // 현재 달 날짜
    for (let day = 1; day <= lastDateOfMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      const today = new Date();
      const isToday =
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

      const cellData = scheduleData[dateStr];
      const events = cellData ? cellData.events : [];
      const maxEventsToShow = 2;

      cells.push(
        <div
          key={dateStr}
          className={`${styles.dateCell} ${isToday ? styles.today : ""}`}
          onClick={() => handleDateClick(dateStr)}
        >
          <div className={styles.dateNum}>{day}</div>
          <div className={styles.eventsList}>
            {events.slice(0, maxEventsToShow).map((event, i) => (
              <div key={i} className={styles.eventItem}>
                {event}
              </div>
            ))}
            {events.length > maxEventsToShow && (
              <div className={styles.moreEvents}>
                +{events.length - maxEventsToShow}개 더보기
              </div>
            )}
          </div>
        </div>
      );
    }

    // 다음 달 날짜 (그리드 채우기)
    // 다음 달 날짜 (마지막 줄 채우기)
    while (cells.length % 7 !== 0) {
      cells.push(
        <div
          key={`next-${cells.length}`}
          className={`${styles.dateCell} ${styles.otherMonth}`}
        ></div>
      );
    }

    return <div className={styles.calendarGrid}>{cells}</div>;
  };

  return (
    <div className={styles.calendarContainer}>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      {isModalOpen && (
        <ScheduleModal
          dateStr={selectedDate}
          data={scheduleData[selectedDate] || { events: [], memo: "" }}
          onClose={handleCloseModal}
          onSave={handleSaveSchedule}
        />
      )}
    </div>
  );
};

export default Calendar;
