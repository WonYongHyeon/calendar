// components/Calendar.js
import { useState, useEffect } from "react";
import styles from "./Calendar.module.css";
import ScheduleModal from "./ScheduleModal";

// 왼쪽 화살표 SVG 컴포넌트
const PrevArrow = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="24px"
    height="24px"
  >
    <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" />
  </svg>
);

// 오른쪽 화살표 SVG 컴포넌트
const NextArrow = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="24px"
    height="24px"
  >
    <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" />
  </svg>
);

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/schedules/route`
        );
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setScheduleData(data);
      } catch (error) {
        console.error("Failed to fetch schedules from API:", error);
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

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const handleSaveSchedule = async (
    dateStr,
    newEvents,
    newMemo,
    isBreakDay
  ) => {
    const optimisticData = { ...scheduleData };

    if (isBreakDay) {
      optimisticData[dateStr] = { events: [], memo: newMemo, isBreakDay: true };
    } else {
      if (newEvents.length > 0 || newMemo.trim()) {
        optimisticData[dateStr] = {
          events: newEvents,
          memo: newMemo,
          isBreakDay: false,
        };
      } else {
        delete optimisticData[dateStr];
      }
    }

    setScheduleData(optimisticData);
    handleCloseModal();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedules`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: dateStr,
            events: newEvents,
            memo: newMemo,
            isBreakDay: isBreakDay,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to save schedule");
      }
    } catch (error) {
      console.error("Failed to save schedule to API:", error);
    }
  };

  const renderHeader = () => {
    return (
      <div className={styles.calendarHeader}>
        <h2 className={styles.currentMonth}>
          {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
        </h2>
        <div className={styles.navButtons}>
          <button className={styles.navBtn} onClick={handlePrevMonth}>
            <PrevArrow />
          </button>
          <button className={styles.todayBtn} onClick={handleGoToday}>
            오늘
          </button>
          <button className={styles.navBtn} onClick={handleNextMonth}>
            <NextArrow />
          </button>
        </div>
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
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(
        <div
          key={`prev-${i}`}
          className={`${styles.dateCell} ${styles.otherMonth}`}
        ></div>
      );
    }

    for (let day = 1; day <= lastDateOfMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const today = new Date();
      const isToday =
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();
      const cellData = scheduleData[dateStr];
      const events = cellData ? cellData.events : [];
      const memo = cellData ? cellData.memo : "";

      const isBreakDayWithReason = cellData?.isBreakDay && memo.trim();
      const isBreakDayWithoutReason = cellData?.isBreakDay && !memo.trim();

      const maxEventsToShow = 6;

      cells.push(
        <div
          key={dateStr}
          className={`${styles.dateCell} ${isToday ? styles.today : ""} ${
            cellData?.isBreakDay === true ? styles.breakDay : ""
          }`}
          onClick={() => handleDateClick(dateStr)}
        >
          <div className={styles.dateNum}>{day}</div>
          {/* 조건부 렌더링 수정 */}
          {isBreakDayWithoutReason ? (
            <div className={styles.breakMessage}>
              <span className={styles.breakReasonTitle}>휴방</span>
            </div>
          ) : isBreakDayWithReason ? (
            <div className={styles.breakReasonOnly}>
              <p className={styles.breakReasonText}>{memo}</p>
            </div>
          ) : (
            <div className={styles.eventsList}>
              {events.length <= maxEventsToShow ? (
                events.map((event, i) => (
                  <div
                    key={i}
                    className={
                      event.isImportant
                        ? styles.eventItemImportant
                        : styles.eventItem
                    }
                  >
                    {event.text}
                  </div>
                ))
              ) : (
                <>
                  {events.slice(0, maxEventsToShow).map((event, i) => (
                    <div
                      key={i}
                      className={
                        event.isImportant
                          ? styles.eventItemImportant
                          : styles.eventItem
                      }
                    >
                      {event.text}
                    </div>
                  ))}
                  <div className={styles.moreEvents}>
                    +{events.length - maxEventsToShow}개 더보기
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      );
    }

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
