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
  const [toastMessage, setToastMessage] = useState("");

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedules`
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

  useEffect(() => {
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
    const originalData = scheduleData[dateStr] || {
      events: [],
      memo: "",
      isBreakDay: false,
      version: 0,
    };

    const optimisticData = { ...scheduleData };

    if (isBreakDay) {
      if (!newMemo.trim()) {
        optimisticData[dateStr] = {
          events: [],
          memo: "",
          isBreakDay: true,
          version: (originalData.version || 0) + 1,
        };
      } else {
        optimisticData[dateStr] = {
          events: [],
          memo: newMemo,
          isBreakDay: true,
          version: (originalData.version || 0) + 1,
        };
      }
    } else {
      if (newEvents.length > 0 || newMemo.trim()) {
        optimisticData[dateStr] = {
          events: newEvents,
          memo: newMemo,
          isBreakDay: false,
          version: (originalData.version || 0) + 1,
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
            version: originalData.version,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 409) {
          const errorData = await response.json();
          setToastMessage(errorData.error);
        } else {
          setToastMessage("일정 저장에 실패했습니다. 다시 시도해 주세요.");
        }
        setScheduleData((prevData) => ({
          ...prevData,
          [dateStr]: originalData,
        }));
        fetchSchedules();
        setTimeout(() => setToastMessage(""), 5000);
      } else {
        const { schedule } = await response.json();

        const formattedSchedule = schedule
          ? {
              events: schedule.events,
              memo: schedule.memo,
              isBreakDay: schedule.is_break_day,
              version: schedule.version,
            }
          : null;

        setScheduleData((prevData) => {
          const newScheduleData = { ...prevData };
          if (formattedSchedule) {
            newScheduleData[dateStr] = formattedSchedule;
          } else {
            delete newScheduleData[dateStr];
          }
          return newScheduleData;
        });
      }
    } catch (error) {
      console.error("Failed to save schedule to API:", error);
      setToastMessage(
        "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      );
      setScheduleData((prevData) => ({ ...prevData, [dateStr]: originalData }));
      fetchSchedules();
      setTimeout(() => setToastMessage(""), 5000);
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
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
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
          data={
            scheduleData[selectedDate] || { events: [], memo: "", version: 0 }
          }
          onClose={handleCloseModal}
          onSave={handleSaveSchedule}
        />
      )}

      {toastMessage && (
        <div className={styles.toastContainer}>
          <div className={styles.toastMessage}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              {toastMessage.split("\n").map((line, index) => (
                <span key={index}>
                  {line}
                  {index < toastMessage.split("\n").length - 1 && <br />}
                </span>
              ))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
