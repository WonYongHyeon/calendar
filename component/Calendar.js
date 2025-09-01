import { useState, useEffect } from "react";
import styles from "./Calendar.module.css";
import ScheduleModal from "./ScheduleModal";

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState({});
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태 추가
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // 컴포넌트가 처음 렌더링될 때 DB에서 데이터 불러오기
  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("../api/schedules");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setScheduleData(data);
      } catch (error) {
        console.error("Failed to fetch schedules from API:", error);
        // 사용자에게 에러를 알리는 UI를 추가할 수도 있습니다.
      }
      setIsLoading(false);
    };
    fetchSchedules();
  }, []);

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

  // 서버 API로 데이터를 전송하여 저장하는 함수
  const handleSaveSchedule = async (dateStr, newEvents, newMemo) => {
    const optimisticData = { ...scheduleData };
    if (newEvents.length === 0 && !newMemo.trim()) {
      delete optimisticData[dateStr];
    } else {
      optimisticData[dateStr] = { events: newEvents, memo: newMemo };
    }
    // UI를 즉시 업데이트 (사용자 경험 향상)
    setScheduleData(optimisticData);
    handleCloseModal();

    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: dateStr,
          events: newEvents,
          memo: newMemo,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save schedule");
      }
    } catch (error) {
      console.error("Failed to save schedule to API:", error);
      // 에러 발생 시 UI를 원래 데이터로 되돌리는 로직을 추가할 수 있습니다.
    }
  };

  // 헤더 렌더링 (월/년, 네비게이션)
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

  // 요일 이름 렌더링
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

  // 날짜 셀 렌더링
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
      {/* 로딩 중일 때와 아닐 때를 구분하여 렌더링 */}
      {isLoading ? (
        <div
          className={styles.calendarGrid}
          style={{
            minHeight: "500px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p>🗓️ 일정 데이터를 불러오는 중...</p>
        </div>
      ) : (
        renderCells()
      )}

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
