// Calendar.js

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import styles from "./Calendar.module.css";
import ScheduleModal from "./ScheduleModal";
import SearchModal from "./SearchModal";
import { BREAK_DAY_IMAGES } from "./images";
import Swal from "sweetalert2";

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
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const HelpIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="8"></circle>
    <text
      x="50%"
      y="50%"
      font-size="10"
      text-anchor="middle"
      dominant-baseline="middle"
      fill="currentColor"
    >
      ?
    </text>
  </svg>
);

const HamburgerMenu = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="24"
    height="24"
  >
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
);

const getImageUrlById = (id) => {
  const image = BREAK_DAY_IMAGES.find((img) => img.id === id);
  return image ? image.url : null;
};

const getEventItemHeight = () => {
  const isMobile = window.innerWidth <= 768;
  return isMobile ? 22 : 26;
};

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [isSearchModalOpen, setIsSearchModal] = useState(false);
  const [highlightedDate, setHighlightedDate] = useState(null);
  const [isMobile, setIsMobile] = useState(true);

  const [maxEventsToShow, setMaxEventsToShow] = useState({});
  const [isMenuOpen, setIsMenuOpen] = useState(false); // ✅ 메뉴 상태 추가
  const menuRef = useRef(null); // ✅ 메뉴 DOM 참조를 위한 ref 추가

  const calendarRef = useRef(null);

  // ✅ 메뉴 외부 클릭 감지 로직 추가
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 800);
    };

    handleResize(); // 초기 실행

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  // ✅ SweetAlert2를 사용한 백업 및 복원 함수
  const handleActionWithPassword = async (action) => {
    const title = action === "backup" ? "데이터 백업" : "데이터 복원";
    const html =
      action === "backup"
        ? "현재 일정표를 백업합니다.<br>기존 백업 데이터는 덮어쓰여집니다."
        : "<b>경고:</b> 백업된 데이터로 현재 일정표를 덮어쓰시겠습니까?";
    const confirmButtonText = action === "backup" ? "백업" : "복원";

    Swal.fire({
      title,
      html,
      input: "password", // ✅ 비밀번호 입력 필드
      inputPlaceholder: "비밀번호를 입력하세요",
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: "취소",
      showLoaderOnConfirm: true, // ✅ 확인 버튼 클릭 시 로딩 스피너 표시
      preConfirm: async (password) => {
        try {
          const response = await fetch(`/api/backup-restore?action=${action}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `${title}에 실패했습니다.`);
          }
          return response.json();
        } catch (error) {
          Swal.showValidationMessage(`요청 실패: ${error.message}`);
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: "success",
          title: "완료!",
          text: `일정표 ${
            action === "backup" ? "백업" : "복원"
          }이 성공적으로 완료되었습니다.`,
        });
        if (action === "restore") {
          fetchSchedules(); // 복원 후 데이터 새로고침
        }
      }
    });
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

  useLayoutEffect(() => {
    const calculateMaxEvents = () => {
      const newMaxEvents = {};
      const dateCells = calendarRef.current?.querySelectorAll(
        `.${styles.dateCell}`
      );
      if (!dateCells) return;

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
          Math.floor((availableHeight - 16) / eventItemHeight)
        );
        newMaxEvents[dateStr] = calculatedEvents;
      });

      setMaxEventsToShow(newMaxEvents);
    };

    const debouncedCalculate = debounce(calculateMaxEvents, 250);

    calculateMaxEvents();
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
    setIsSearchModal(true);
  };

  const handleCloseSearchModal = () => {
    setIsSearchModal(false);
  };

  const handleGoToDate = (dateStr) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    setCurrentDate(new Date(year, month - 1, day));
    setHighlightedDate(dateStr);
    setIsSearchModal(false);
  };

  const handleBreakDayChange = async (
    dateStr,
    newIsBreakDay,
    newMemo,
    newBreakDayImageId
  ) => {
    const currentData = scheduleData[dateStr] || {
      events: [],
      memo: "",
      isBreakDay: false,
      version: 0,
      breakDayImageId: null,
      morningTime: "",
      afternoonTime: "",
    };

    setScheduleData((prevData) => ({
      ...prevData,
      [dateStr]: {
        ...currentData,
        events: currentData.events,
        isBreakDay: newIsBreakDay,
        memo: newMemo,
        breakDayImageId: newBreakDayImageId,
      },
    }));

    await handleSaveSchedule(
      dateStr,
      currentData.events,
      newMemo,
      newIsBreakDay,
      newBreakDayImageId,
      currentData.morningTime,
      currentData.afternoonTime,
      false
    );
  };

  const handleSaveSchedule = async (
    dateStr,
    newEvents,
    newMemo,
    isBreakDay,
    breakDayImageId,
    morningTime,
    afternoonTime,
    shouldCloseModal = true
  ) => {
    const originalData = scheduleData[dateStr] || {
      events: [],
      memo: "",
      isBreakDay: false,
      version: 0,
      breakDayImageId: null,
      morningTime: "",
      afternoonTime: "",
    };

    const optimisticData = { ...scheduleData };

    if (isBreakDay) {
      optimisticData[dateStr] = {
        ...originalData,
        events: newEvents,
        memo: newMemo,
        isBreakDay: true,
        breakDayImageId: breakDayImageId,
        version: (originalData.version || 0) + 1,
        morningTime: "",
        afternoonTime: "",
      };
    } else {
      if (
        newEvents.length > 0 ||
        newMemo.trim() ||
        morningTime.trim() ||
        afternoonTime.trim()
      ) {
        optimisticData[dateStr] = {
          ...originalData,
          events: newEvents,
          memo: newMemo,
          isBreakDay: false,
          breakDayImageId: null,
          version: (originalData.version || 0) + 1,
          morningTime: morningTime,
          afternoonTime: afternoonTime,
        };
      } else {
        delete optimisticData[dateStr];
      }
    }

    setScheduleData(optimisticData);
    if (shouldCloseModal) {
      handleCloseModal();
    }

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
          breakDayImageId: breakDayImageId,
          morningTime: morningTime,
          afternoonTime: afternoonTime,
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
              breakDayImageId: schedule.break_day_image_id,
              morningTime: schedule.morning_time,
              afternoonTime: schedule.afternoon_time,
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
      const events = cellData?.events || [];
      const memo = cellData?.memo || "";
      const breakDayImageId = cellData?.breakDayImageId || null;
      const morningTime = cellData?.morningTime || "";
      const afternoonTime = cellData?.afternoonTime || "";

      // 이 부분을 수정했습니다. events 배열을 직접 사용합니다.
      const combinedEvents = events;

      const maxEventsCount = maxEventsToShow[dateStr] || 0;
      const visibleEvents = combinedEvents.slice(0, maxEventsCount);
      const remainingEventsCount =
        combinedEvents.length > maxEventsCount
          ? combinedEvents.length - maxEventsCount
          : 0;

      const isBreakDay = cellData?.isBreakDay === true;
      const isBreakDayWithReason = isBreakDay && memo.trim();

      const isHighlighted = highlightedDate === dateStr;

      cells.push(
        <div
          key={dateStr}
          data-date={dateStr}
          className={`${styles.dateCell} ${isToday ? styles.today : ""} ${
            isBreakDay ? styles.breakDay : ""
          } ${isHighlighted ? styles.highlightedCell : ""}`}
          onClick={() => handleDateClick(dateStr)}
        >
          {/* ✅ 날짜와 시간을 묶는 새로운 헤더 */}
          <div className={styles.dateHeader}>
            <div className={styles.dateNum}>{day}</div>
            {!isBreakDay && (morningTime || afternoonTime) && (
              <div className={styles.timeDisplay}>
                {morningTime && <span>☀️{isMobile ? "" : morningTime}</span>}
                {/* 오전과 오후 시간 사이에 구분자 추가 */}
                {morningTime && afternoonTime && <span> / </span>}
                {afternoonTime && (
                  <span>🌙{isMobile ? "" : afternoonTime}</span>
                )}
              </div>
            )}
          </div>

          {isBreakDay && (
            <div className={styles.breakDayContent}>
              {isBreakDayWithReason ? (
                <div className={styles.breakReasonText}>{memo}</div>
              ) : (
                <span className={styles.breakReasonTitle}>휴방</span>
              )}
              {breakDayImageId && (
                <div className={styles.breakDayImageContainer}>
                  <img
                    className={styles.breakDayImage}
                    src={getImageUrlById(breakDayImageId)}
                    alt="휴방 이미지"
                  />
                </div>
              )}
            </div>
          )}

          {!isBreakDay && (
            <>
              <ul className={styles.eventList}>
                {visibleEvents.map((evt, idx) => {
                  return !evt.isImportant ? (
                    <li key={idx} className={styles.eventItem}>
                      {evt.text}
                    </li>
                  ) : (
                    <li key={idx} className={styles.eventItemImportant}>
                      {evt.text}
                    </li>
                  );
                })}
              </ul>
              {remainingEventsCount > 0 && (
                <div className={styles.moreButton}>
                  +{remainingEventsCount}개 더보기
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // ✅ 동적으로 남은 칸 채우기
    const totalDaysInGrid = firstDayOfMonth + lastDateOfMonth;
    const requiredCells = Math.ceil(totalDaysInGrid / 7) * 7;
    const remainingCells = requiredCells - cells.length;

    for (let i = 0; i < remainingCells; i++) {
      cells.push(
        <div
          key={`next-${i}`}
          className={`${styles.dateCell} ${styles.otherMonth}`}
          onClick={null}
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
            scheduleData[selectedDate] || {
              events: [],
              memo: "",
              version: 0,
              isBreakDay: false,
              breakDayImageId: null,
              morningTime: "",
              afternoonTime: "",
            }
          }
          onClose={handleCloseModal}
          onSave={handleSaveSchedule}
          onBreakDayChange={handleBreakDayChange}
        />
      )}

      {isSearchModalOpen && (
        <SearchModal
          scheduleData={scheduleData}
          onClose={handleCloseSearchModal}
          onSelectDate={handleGoToDate}
        />
      )}

      {/* ✅ 플로팅 버튼 및 메뉴 UI 수정 */}
      <div className={styles.floatingMenuContainer} ref={menuRef}>
        {isMenuOpen && (
          <div className={styles.floatingMenu}>
            <ul>
              <li
                onClick={() => {
                  handleOpenSearchModal();
                  setIsMenuOpen(false); // 메뉴 아이템 클릭 시 메뉴 닫기
                }}
              >
                <SearchIcon />
                <span>일정 검색</span>
              </li>
              {/* 다른 메뉴 아이템을 여기에 추가할 수 있습니다. */}
              <li onClick={() => handleActionWithPassword("backup")}>
                데이터 백업
              </li>
              <li onClick={() => handleActionWithPassword("restore")}>
                데이터 복원
              </li>
            </ul>
          </div>
        )}
        <button
          className={styles.searchFloatingBtn}
          onClick={() => setIsMenuOpen((prev) => !prev)} // 클릭 시 메뉴 토글
        >
          <HamburgerMenu />
        </button>
      </div>

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
