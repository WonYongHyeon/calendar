// ScheduleModal.js

import { useState, useEffect, useRef } from "react";
import styles from "./Calendar.module.css";
import Swal from "sweetalert2";

import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";
import { BREAK_DAY_IMAGES } from "./images";

const getImageUrlById = (id) => {
  const image = BREAK_DAY_IMAGES.find((img) => img.id === id);
  return image ? image.url : null;
};

const getEventItemClassName = (event) => {
  const type = event.scheduleType;

  if (type === "type2" || type === "evening") {
    return styles.eventModalItemEvening;
  }

  if (type === "personal") {
    return styles.eventModalItemPersonal;
  }

  return styles.eventModalItemMorning;
};

// 일정 종류별 색상
const EVENT_COLORS = {
  morning: "#d6eaff",
  evening: "#ffcccc",

  type1: "#d6eaff",
  type2: "#ffcccc",
  type3: "#e9ddff",
  type4: "#d7f7e2",

  personal: "#d4ff00",
};

const getEventColor = (event) => {
  return EVENT_COLORS[event.scheduleType] || EVENT_COLORS.type1;
};

const SortableItem = ({ event, handleDeleteEvent }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
    opacity: isDragging ? 0 : 1,

    // 일정 종류에 따른 색상
    backgroundColor: getEventColor(event),
    color: "#333",
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={getEventItemClassName(event)}
      data-is-dragging={isDragging}
    >
      {event.text}
      <button
        className={styles.deleteEventBtn}
        onClick={() => handleDeleteEvent(event.id)}
      >
        X
      </button>
    </li>
  );
};

const DroppablePrevButton = ({ onClick, disabled }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: "prev-page-droppable",
    data: { direction: "prev" },
  });
  const buttonStyle = isOver
    ? { backgroundColor: "rgba(52, 152, 219, 0.5)" }
    : {};

  return (
    <button
      ref={setNodeRef}
      className={styles.pageBtn}
      onClick={onClick}
      disabled={disabled}
      style={buttonStyle}
    >
      이전
    </button>
  );
};

const DroppableNextButton = ({ onClick, disabled }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: "next-page-droppable",
    data: { direction: "next" },
  });
  const buttonStyle = isOver
    ? { backgroundColor: "rgba(52, 152, 219, 0.5)" }
    : {};

  return (
    <button
      ref={setNodeRef}
      className={styles.pageBtn}
      onClick={onClick}
      disabled={disabled}
      style={buttonStyle}
    >
      다음
    </button>
  );
};

const ScheduleModal = ({ dateStr, data, onClose, onSave }) => {
  const [events, setEvents] = useState([]);
  const [memo, setMemo] = useState("");
  const [newEvent, setNewEvent] = useState("");
  const [eventType, setEventType] = useState("type1");
  const [isMemoEditing, setIsMemoEditing] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const [broadcastTimes, setBroadcastTimes] = useState([]);
  const [newBroadcastTime, setNewBroadcastTime] = useState("");
  const [vodLink, setVodLink] = useState("");

  // isBreakDay와 breakDayImageId 상태를 컴포넌트 내부에서 관리
  const [isBreakDay, setIsBreakDay] = useState(data?.isBreakDay || false);
  const [selectedImageId, setSelectedImageId] = useState(
    data?.breakDayImageId || null,
  );

  const [originalData, setOriginalData] = useState({
    events: [],
    memo: "",
    isBreakDay: false,
    breakDayImageId: null,
    broadcastTimes: [],
    vodLink: "",
  });

  const [showImageSelector, setShowImageSelector] = useState(false);

  const eventTypeOptions = [
    {
      value: "type1",
      label: "1",
      color: "#d6eaff",
    },
    {
      value: "type2",
      label: "2",
      color: "#ffcccc",
    },
    {
      value: "type3",
      label: "3",
      color: "#e9ddff",
    },
    {
      value: "type4",
      label: "4",
      color: "#d7f7e2",
    },
    {
      value: "personal",
      label: "개인",
      color: "#d4ff00",
    },
  ];

  const [eventPage, setEventPage] = useState(1);
  const eventsPerPage = 4;
  const totalEventPages = Math.ceil(events.length / eventsPerPage);
  const paginatedEvents = events.slice(
    (eventPage - 1) * eventsPerPage,
    eventPage * eventsPerPage,
  );

  const pageChangeTimerRef = useRef(null);
  const isDraggingOverPaginationRef = useRef(null);

  useEffect(() => {
    if (data) {
      const eventsWithId = data.events.map((event, index) => ({
        ...event,
        id: event.id || `event-${Date.now()}-${index}`,
        scheduleType:
          event.scheduleType || (event.isImportant ? "evening" : "morning"),
      }));
      setEvents(eventsWithId);
      setMemo(data.memo || "");
      const times = Array.isArray(data.broadcastTimes)
        ? data.broadcastTimes
        : [data.morningTime, data.afternoonTime].filter(Boolean);

      setBroadcastTimes([...times].sort());
      setNewBroadcastTime("");
      setIsBreakDay(data.isBreakDay || false);
      setSelectedImageId(data.breakDayImageId || null);

      const normalizedEvents = data.events.map((event) => ({
        ...event,
        scheduleType:
          event.scheduleType || (event.isImportant ? "evening" : "morning"),
      }));
      setOriginalData({
        events: normalizedEvents,
        memo: data.memo,
        isBreakDay: data.isBreakDay,
        breakDayImageId: data.breakDayImageId,
        broadcastTimes: [...times].sort(),
        vodLink: data.vodLink || "",
      });
      setEventPage(1);
    } else {
      setEvents([]);
      setMemo("");
      setBroadcastTimes([]);
      setNewBroadcastTime("");
      setIsBreakDay(false);
      setSelectedImageId(null);
      setVodLink("");

      setOriginalData({
        events: [],
        memo: "",
        isBreakDay: false,
        breakDayImageId: null,
        broadcastTimes: [],
        vodLink: "",
      });
      setEventPage(1);
    }
  }, [data]);

  // onBreakDayChange 함수를 onSave로 대체
  const handleBreakDayToggle = (e) => {
    const newIsBreakDay = e.target.checked;
    setIsBreakDay(newIsBreakDay);
    if (newIsBreakDay) {
      // 휴방일로 전환 시
      setSelectedImageId(null); // 이미지 초기화
      setEvents([]); // 이벤트 초기화
      setBroadcastTimes([]);
      setNewBroadcastTime("");
    }

    // onSave 함수를 호출하여 상태를 저장 (isBreakDay 상태만 변경)
    onSave(
      dateStr,
      [], // 이벤트 비움
      memo,
      newIsBreakDay,
      selectedImageId,
      "", // 시간 비움
      "", // 시간 비움
      false, // 모달 닫지 않음
      [],
    );
  };

  // 이미지 선택 시 onSave 호출
  const handleImageSelect = (imageId) => {
    setSelectedImageId(imageId);
    setShowImageSelector(false);
    onSave(
      dateStr,
      [],
      memo,
      true, // 휴방일은 true
      imageId,
      "",
      "",
      false,
    );
  };

  // 이미지 삭제 시 onSave 호출
  const handleImageRemove = () => {
    setSelectedImageId(null);
    onSave(
      dateStr,
      [],
      memo,
      true,
      null, // 이미지 ID를 null로
      "",
      "",
      false,
    );
  };

  // 방송 시간 추가
  const handleAddBroadcastTime = () => {
    const input = newBroadcastTime.trim();

    // HH:mm 형식 검사 (7:10, 19:00 모두 허용)
    const match = input.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);

    if (!match) {
      Swal.fire({
        icon: "warning",
        text: "올바른 시간을 입력해 주세요. (예: 08:00)",
      });
      return;
    }

    // 7:10 → 07:10
    const normalizedTime = `${match[1].padStart(2, "0")}:${match[2]}`;

    // 중복 시간 검사
    if (broadcastTimes.includes(normalizedTime)) {
      Swal.fire({
        icon: "warning",
        text: "이미 등록된 방송 시간입니다.",
      });
      return;
    }

    // 시간 추가 및 자동 정렬
    setBroadcastTimes((prev) => [...prev, normalizedTime].sort());

    // 입력창 초기화
    setNewBroadcastTime("");
  };

  // 방송 시간 삭제
  const handleDeleteBroadcastTime = (index) => {
    setBroadcastTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddEvent = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      if (newEvent.trim()) {
        const newEventItem = {
          id: `event-${Date.now()}`,
          text: newEvent.trim(),
          scheduleType: eventType,
        };
        const updatedEvents = [...events, newEventItem];
        setEvents(updatedEvents);
        setNewEvent("");
        const newTotalPages = Math.ceil(updatedEvents.length / eventsPerPage);
        setEventPage(newTotalPages);
      }
    }
  };

  const handleDeleteEvent = (idToDelete) => {
    const updatedEvents = events.filter((event) => event.id !== idToDelete);
    setEvents(updatedEvents);
    const newTotalPages = Math.ceil(updatedEvents.length / eventsPerPage);
    if (eventPage > newTotalPages) {
      setEventPage(Math.max(1, newTotalPages));
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    const isOverDroppable = over?.id && over.data.current?.direction;
    const activeIndex = events.findIndex((item) => item.id === active.id);

    if (!over || isOverDroppable) {
      if (pageChangeTimerRef.current) {
        clearTimeout(pageChangeTimerRef.current);
      }
      isDraggingOverPaginationRef.current = null;
      setActiveId(null);
      return;
    }

    if (over.id && active.id !== over.id) {
      const overIndex = events.findIndex((item) => item.id === over.id);
      const newEvents = arrayMove(events, activeIndex, overIndex);
      setEvents(newEvents);
    }

    if (pageChangeTimerRef.current) {
      clearTimeout(pageChangeTimerRef.current);
    }
    isDraggingOverPaginationRef.current = null;
    setActiveId(null);
  };

  const handleDragOver = (event) => {
    const { over } = event;

    if (!over || !over.data.current || !over.data.current.direction) {
      if (pageChangeTimerRef.current) {
        clearTimeout(pageChangeTimerRef.current);
      }
      isDraggingOverPaginationRef.current = null;
      return;
    }

    const { direction } = over.data.current;

    if (isDraggingOverPaginationRef.current !== direction) {
      if (pageChangeTimerRef.current) {
        clearTimeout(pageChangeTimerRef.current);
      }
      isDraggingOverPaginationRef.current = direction;

      pageChangeTimerRef.current = setTimeout(() => {
        if (direction === "prev" && eventPage > 1) {
          setEventPage((prev) => prev - 1);
        } else if (direction === "next" && eventPage < totalEventPages) {
          setEventPage((prev) => prev + 1);
        }
      }, 1000);
    }
  };

  const handleSave = () => {
    let finalEvents = events;
    if (newEvent.trim()) {
      finalEvents = [
        ...events,
        {
          text: newEvent.trim(),
          scheduleType: eventType,
          id: `event-${Date.now()}`,
        },
      ];
    }
    onSave(
      dateStr,
      finalEvents,
      memo,
      isBreakDay,
      selectedImageId,
      "",
      "",
      true,
      isBreakDay ? [] : broadcastTimes,
    );
  };

  const showSaveButton = () => {
    const isInitialEmpty =
      originalData.events.length === 0 &&
      originalData.memo === "" &&
      !originalData.isBreakDay &&
      originalData.broadcastTimes.length === 0;
    const isCurrentEmpty =
      events.length === 0 &&
      memo.trim() === "" &&
      !isBreakDay &&
      newEvent.trim() === "" &&
      broadcastTimes.length === 0;
    if (isInitialEmpty && isCurrentEmpty) {
      return false;
    }

    if (
      isBreakDay !== originalData.isBreakDay ||
      selectedImageId !== originalData.breakDayImageId ||
      JSON.stringify(broadcastTimes) !==
        JSON.stringify(originalData.broadcastTimes)
    ) {
      return true;
    }

    const currentEvents = [...events];
    if (newEvent.trim()) {
      currentEvents.push({
        text: newEvent.trim(),
        scheduleType: eventType,
        id: "temp-new-event",
      });
    }
    const currentEventTexts = currentEvents.map((e) =>
      JSON.stringify({ text: e.text, scheduleType: e.scheduleType }),
    );
    const originalEventTexts = originalData.events.map((e) =>
      JSON.stringify({ text: e.text, scheduleType: e.scheduleType }),
    );

    if (currentEventTexts.length !== originalEventTexts.length) {
      return true;
    }
    for (let i = 0; i < currentEventTexts.length; i++) {
      if (currentEventTexts[i] !== originalEventTexts[i]) {
        return true;
      }
    }

    if (memo !== originalData.memo) {
      return true;
    }

    return false;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const date = new Date(dateStr);
  const activeEvent = events.find((event) => event.id === activeId);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalContent} ${styles.editModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>
            {`${date.getFullYear()}년 ${
              date.getMonth() + 1
            }월 ${date.getDate()}일`}{" "}
          </h3>

          <div className={styles.breakDayToggle}>
            <span className={styles.toggleLabel}>휴방</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={isBreakDay}
                onChange={handleBreakDayToggle}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          {!isBreakDay && (
            <>
              <div className={styles.eventTimeSection}>
                <h4>방송 시간 설정</h4>

                {/* 시간 입력 */}
                <div className={styles.addEventRow}>
                  <input
                    type="text"
                    className={styles.eventInput}
                    placeholder="예: 20:00"
                    value={newBroadcastTime}
                    onChange={(e) => setNewBroadcastTime(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddBroadcastTime();
                      }
                    }}
                  />

                  <button
                    type="button"
                    className={styles.addEventBtn}
                    onClick={handleAddBroadcastTime}
                  >
                    + 추가
                  </button>
                </div>

                {/* 등록된 방송 시간 */}
                {broadcastTimes.length > 0 && (
                  <div className={styles.broadcastTimeList}>
                    {broadcastTimes.map((time, index) => (
                      <div
                        key={`${time}-${index}`}
                        className={styles.broadcastTimeChip}
                      >
                        <span>{time}</span>

                        <button
                          type="button"
                          className={styles.broadcastTimeRemove}
                          onClick={() => handleDeleteBroadcastTime(index)}
                          aria-label={`${time} 삭제`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* 일정 색상 선택 */}
              <div className={styles.eventTitleRow}>
                <h4>🗓️ 일정 추가</h4>

                <div className={styles.eventTypeGroup}>
                  {eventTypeOptions.map((option) => {
                    const isSelected = eventType === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`${styles.eventTypeBtn} ${
                          isSelected ? styles.activeTypeBtn : ""
                        }`}
                        style={{
                          backgroundColor: option.color,
                          color: "#333",
                          border: isSelected
                            ? "2px solid #555"
                            : "2px solid transparent",
                        }}
                        onClick={() => setEventType(option.value)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
              >
                <SortableContext
                  items={paginatedEvents.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className={styles.eventListModal}>
                    {paginatedEvents.map((event) => (
                      <SortableItem
                        key={event.id}
                        event={event}
                        handleDeleteEvent={handleDeleteEvent}
                      />
                    ))}
                  </ul>
                </SortableContext>
                {totalEventPages > 1 && (
                  <div className={styles.paginationControls}>
                    <DroppablePrevButton
                      onClick={() =>
                        setEventPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={eventPage === 1}
                    />
                    <span>{`${eventPage} / ${totalEventPages}`}</span>
                    <DroppableNextButton
                      onClick={() =>
                        setEventPage((prev) =>
                          Math.min(prev + 1, totalEventPages),
                        )
                      }
                      disabled={eventPage === totalEventPages}
                    />
                  </div>
                )}
                {/* z-index를 높여 모달 위에 표시되도록 수정 */}
                {createPortal(
                  <DragOverlay zIndex={9999}>
                    {activeEvent ? (
                      <li
                        className={getEventItemClassName(activeEvent)}
                        style={{
                          cursor: "grabbing",
                          backgroundColor: getEventColor(activeEvent),
                          color: "#333",
                        }}
                      >
                        {activeEvent.text}
                      </li>
                    ) : null}
                  </DragOverlay>,
                  document.body,
                )}
              </DndContext>
            </>
          )}

          {isBreakDay && (
            <div className={styles.imageSelectionSection}>
              {selectedImageId ? (
                <>
                  <div className={styles.breakDayImageContainer}>
                    <img
                      src={getImageUrlById(selectedImageId)}
                      alt="선택된 휴방 이미지"
                      className={styles.breakDayImage}
                    />
                  </div>
                  <button
                    className={styles.imageSelectBtn}
                    onClick={handleImageRemove}
                  >
                    이미지 삭제
                  </button>
                </>
              ) : (
                <button
                  className={styles.imageSelectBtn}
                  onClick={() => setShowImageSelector(true)}
                >
                  휴방 이미지 선택
                </button>
              )}
              {showImageSelector && (
                <>
                  <div className={styles.imageOptionsContainer}>
                    {BREAK_DAY_IMAGES.map((image) => (
                      <div
                        key={image.id}
                        className={`${styles.imageOptionItem} ${
                          selectedImageId === image.id
                            ? styles.selectedImage
                            : ""
                        }`}
                        onClick={() => handleImageSelect(image.id)}
                      >
                        <img src={getImageUrlById(image.id)} alt={image.id} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className={styles.memoSection}>
            <div className={styles.memoHeader}>
              <h4>{isBreakDay ? "휴방 사유" : "메모"}</h4>
              <button
                className={styles.editMemoBtn}
                onClick={() => setIsMemoEditing(!isMemoEditing)}
              >
                {isMemoEditing ? "저장" : "수정"}
              </button>
            </div>
            <textarea
              className={styles.memoInput}
              placeholder={
                isBreakDay ? "휴방 사유를 입력하세요." : "메모를 입력하세요."
              }
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              onFocus={(e) => {
                e.nativeEvent.stopImmediatePropagation();
              }}
              readOnly={!isMemoEditing}
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button
            className={styles.saveBtn}
            onClick={showSaveButton() ? handleSave : onClose}
          >
            {showSaveButton() ? "저장하고 닫기" : "닫기"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
