// Calendar.js

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import styles from "./Calendar.module.css";
import ScheduleModal from "./ScheduleModal";
import SearchModal from "./SearchModal";
import { BREAK_DAY_IMAGES } from "./BreakDayImage";

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

// 검색 아이콘 컴포넌트
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="24px"
    height="24px"
  >
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

// ✅ ID로 이미지 URL을 찾는 헬퍼 함수
const getImageUrlById = (id) => {
  const image = BREAK_DAY_IMAGES.find((img) => img.id === id);
  return image ? image.url : null;
};

// ✅ 이벤트 아이템의 높이를 가져오는 함수
const getEventItemHeight = () => {
  const isMobile = window.innerWidth <= 768;
  return isMobile ? 18 : 26;
};

// ✅ 디바운스 헬퍼 함수
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

// const EVENT_ITEM_HEIGHT = 36; // ✅ 삭제됨
const MORE_BUTTON_HEIGHT = 20;

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [highlightedDate, setHighlightedDate] = useState(null);

  const [maxEventsToShow, setMaxEventsToShow] = useState({});

  const calendarRef = useRef(null);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/schedules");
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

  useEffect(() => {
    if (highlightedDate) {
      const timer = setTimeout(() => {
        setHighlightedDate(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedDate]);

  // ✅ 디바운스 로직 적용
  useLayoutEffect(() => {
    const calculateMaxEvents = () => {
      const newMaxEvents = {};
      const dateCells = calendarRef.current?.querySelectorAll(
        `.${styles.dateCell}`
      );
      if (!dateCells) return;

      // ✅ 이벤트 아이템 높이를 함수로 가져오도록 변경
      const eventItemHeight = getEventItemHeight();

      dateCells.forEach((cell) => {
        const dateStr = cell.getAttribute("data-date");
        if (!dateStr) return;

        const dateNumHeight =
          cell.querySelector(`.${styles.dateNum}`)?.offsetHeight || 0;
        const style = getComputedStyle(cell);
        const padding =
          parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const cellHeight = cell.offsetHeight;

        const availableHeight = cellHeight - dateNumHeight - padding;

        const calculatedEvents = Math.max(
          0,
          Math.floor((availableHeight - MORE_BUTTON_HEIGHT) / eventItemHeight) // ✅ 변수 사용
        );
        newMaxEvents[dateStr] = calculatedEvents;
      });

      setMaxEventsToShow(newMaxEvents);
    };

    const debouncedCalculate = debounce(calculateMaxEvents, 250);

    calculateMaxEvents(); // 첫 렌더링 시에는 즉시 실행
    window.addEventListener("resize", debouncedCalculate);
    return () => window.removeEventListener("resize", debouncedCalculate);
  }, [currentDate, scheduleData]);

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
    setHighlightedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
    setHighlightedDate(null);
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
    setHighlightedDate(null);
  };

  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
    setHighlightedDate(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const handleOpenSearchModal = () => {
    setIsSearchModalOpen(true);
  };

  const handleCloseSearchModal = () => {
    setIsSearchModalOpen(false);
  };

  const handleGoToDate = (dateStr) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    setCurrentDate(new Date(year, month - 1, day));
    setHighlightedDate(dateStr);
    setIsSearchModalOpen(false);
  };

  // ✅ onSave 함수에 breakDayImageId 매개변수 추가
  const handleSaveSchedule = async (
    dateStr,
    newEvents,
    newMemo,
    isBreakDay,
    breakDayImageId
  ) => {
    const originalData = scheduleData[dateStr] || {
      events: [],
      memo: "",
      isBreakDay: false,
      version: 0,
      breakDayImageId: null, // ✅ 추가
    };

    const optimisticData = { ...scheduleData };

    if (isBreakDay) {
      optimisticData[dateStr] = {
        events: [],
        memo: newMemo,
        isBreakDay: true,
        version: (originalData.version || 0) + 1,
        breakDayImageId: breakDayImageId, // ✅ 추가
      };
    } else {
      if (newEvents.length > 0 || newMemo.trim()) {
        optimisticData[dateStr] = {
          events: newEvents,
          memo: newMemo,
          isBreakDay: false,
          version: (originalData.version || 0) + 1,
          breakDayImageId: null, // ✅ 추가
        };
      } else {
        delete optimisticData[dateStr];
      }
    }

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
          isBreakDay: isBreakDay,
          version: originalData.version,
          breakDayImageId: breakDayImageId, // ✅ 추가
        }),
      });

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
              breakDayImageId: schedule.break_day_image_id, // ✅ 추가
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
      const breakDayImageId = cellData?.breakDayImageId; // ✅ 추가

      const isBreakDayWithReason = cellData?.isBreakDay && memo.trim();
      const isBreakDayWithoutReason = cellData?.isBreakDay && !memo.trim();

      const maxEventsCount = maxEventsToShow[dateStr] || 0;
      const visibleEvents = events.slice(0, maxEventsCount);
      const remainingEventsCount = events.length - visibleEvents.length;

      const isHighlighted = highlightedDate === dateStr;

      cells.push(
        <div
          key={dateStr}
          data-date={dateStr}
          className={`${styles.dateCell} ${isToday ? styles.today : ""} ${
            cellData?.isBreakDay === true ? styles.breakDay : ""
          } ${isHighlighted ? styles.highlightedCell : ""}`}
          onClick={() => handleDateClick(dateStr)}
        >
          <div className={styles.dateNum}>{day}</div>
          {isBreakDayWithoutReason ? (
            <div className={styles.breakDayContent}>
              <span className={styles.breakReasonTitle}>휴방</span>
              {/* ✅ 이미지 표시 */}
              {breakDayImageId && (
                <div className={styles.breakDayImageContainer}>
                  <img
                    src={getImageUrlById(breakDayImageId)}
                    alt="휴방 이미지"
                    className={styles.breakDayImage}
                  />
                </div>
              )}
            </div>
          ) : isBreakDayWithReason ? (
            <div className={styles.breakDayContent}>
              <p className={styles.breakReasonText}>{memo}</p>
              {/* ✅ 이미지 표시 */}
              {breakDayImageId && (
                <div className={styles.breakDayImageContainer}>
                  <img
                    src={getImageUrlById(breakDayImageId)}
                    alt="휴방 이미지"
                    className={styles.breakDayImage}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className={styles.eventsList}>
              {visibleEvents.map((event, i) => (
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
              {remainingEventsCount > 0 && (
                <div className={styles.moreEvents}>
                  +{remainingEventsCount}개 더보기
                </div>
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

    return (
      <div ref={calendarRef} className={styles.calendarGrid}>
        {cells}
      </div>
    );
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

      {isSearchModalOpen && (
        <SearchModal
          scheduleData={scheduleData}
          onClose={handleCloseSearchModal}
          onSelectDate={handleGoToDate}
        />
      )}

      <button
        className={styles.searchFloatingBtn}
        onClick={handleOpenSearchModal}
      >
        <SearchIcon />
      </button>

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
