// ScheduleModal.js

import { useState, useEffect } from "react";
import styles from "./Calendar.module.css";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// SortableItem 컴포넌트는 변경 없음
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
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={
        event.isImportant ? styles.importantEventListItem : styles.eventListItem
      }
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

const ScheduleModal = ({ dateStr, data, onClose, onSave }) => {
  const [events, setEvents] = useState([]);
  const [memo, setMemo] = useState("");
  const [newEvent, setNewEvent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [isMemoEditing, setIsMemoEditing] = useState(false);
  const [isBreakDay, setIsBreakDay] = useState(false);

  // ✅ 페이지네이션을 위한 새로운 상태 추가
  const [currentPage, setCurrentPage] = useState(1);
  const EVENTS_PER_PAGE = 4;

  const [originalData, setOriginalData] = useState({
    events: [],
    memo: "",
    isBreakDay: false,
  });

  useEffect(() => {
    if (data) {
      const eventsWithId = data.events.map((event, index) => ({
        ...event,
        id: event.id || `event-${Date.now()}-${index}`,
      }));
      setEvents(eventsWithId);
      setMemo(data.memo || "");
      setIsBreakDay(data.isBreakDay || false);

      setOriginalData({
        events: data.events,
        memo: data.memo,
        isBreakDay: data.isBreakDay,
      });
    } else {
      setEvents([]);
      setMemo("");
      setIsBreakDay(false);
      setOriginalData({
        events: [],
        memo: "",
        isBreakDay: false,
      });
    }
    // ✅ 모달이 열릴 때 항상 첫 페이지로 초기화
    setCurrentPage(1);
  }, [data]);

  const handleAddEvent = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      if (newEvent.trim()) {
        const newEventItem = {
          id: `event-${Date.now()}`,
          text: newEvent.trim(),
          isImportant: isImportant,
        };
        setEvents([...events, newEventItem]);
        setNewEvent("");
        // ✅ 새 일정이 추가되면 마지막 페이지로 이동
        setCurrentPage(Math.ceil((events.length + 1) / EVENTS_PER_PAGE));
      }
    }
  };

  const handleDeleteEvent = (idToDelete) => {
    setEvents(events.filter((event) => event.id !== idToDelete));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setEvents((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = () => {
    let finalEvents = events;
    if (newEvent.trim()) {
      finalEvents = [...events, { text: newEvent.trim(), isImportant }];
    }
    const eventsToSave = isBreakDay ? [] : finalEvents;
    onSave(dateStr, eventsToSave, memo, isBreakDay);
  };

  const handleClose = () => {
    onClose();
  };

  // ✅ 버튼 활성화 여부를 정확하게 판단하는 함수
  const showSaveButton = () => {
    // 1. 초기 상태가 비어있고, 입력된 내용도 없다면 false 반환
    const isInitialEmpty =
      originalData.events.length === 0 &&
      originalData.memo === "" &&
      !originalData.isBreakDay;
    const isCurrentEmpty =
      events.length === 0 &&
      memo.trim() === "" &&
      !isBreakDay &&
      newEvent.trim() === "";
    if (isInitialEmpty && isCurrentEmpty) {
      return false;
    }

    // 2. 휴방 상태 변경
    if (isBreakDay !== originalData.isBreakDay) {
      return true;
    }

    // 3. 이벤트 목록의 변경 확인 (순서 포함)
    const currentEvents = [...events];
    if (newEvent.trim()) {
      currentEvents.push({ text: newEvent.trim(), isImportant });
    }
    const currentEventTexts = currentEvents.map((e) =>
      JSON.stringify({ text: e.text, isImportant: e.isImportant })
    );
    const originalEventTexts = originalData.events.map((e) =>
      JSON.stringify({ text: e.text, isImportant: e.isImportant })
    );

    if (currentEventTexts.length !== originalEventTexts.length) {
      return true;
    }
    for (let i = 0; i < currentEventTexts.length; i++) {
      if (currentEventTexts[i] !== originalEventTexts[i]) {
        return true;
      }
    }

    // 4. 메모 변경
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
    })
  );

  const date = new Date(dateStr);

  // ✅ 현재 페이지에 보여줄 이벤트 목록 계산
  const indexOfLastEvent = currentPage * EVENTS_PER_PAGE;
  const indexOfFirstEvent = indexOfLastEvent - EVENTS_PER_PAGE;
  const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(events.length / EVENTS_PER_PAGE);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{`${date.getFullYear()}년 ${
            date.getMonth() + 1
          }월 ${date.getDate()}일`}</h3>
          <div className={styles.breakDayToggle}>
            <span className={styles.toggleLabel}>휴방</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={isBreakDay}
                onChange={(e) => {
                  setIsBreakDay(e.target.checked);
                  if (e.target.checked) {
                    setEvents([]);
                  }
                }}
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                {/* ✅ 높이를 고정할 새로운 div 추가 */}
                <div className={styles.eventListContainer}>
                  <SortableContext
                    items={currentEvents.map((e) => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className={styles.eventListModal}>
                      {currentEvents.map((event) => (
                        <SortableItem
                          key={event.id}
                          event={event}
                          handleDeleteEvent={handleDeleteEvent}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </div>
              </DndContext>
              {/* ✅ 페이지네이션 버튼 추가 */}
              {totalPages > 1 && (
                <div className={styles.paginationControls}>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className={styles.pageBtn}
                  >
                    이전
                  </button>
                  <span>{`${currentPage} / ${totalPages}`}</span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className={styles.pageBtn}
                  >
                    다음
                  </button>
                </div>
              )}
            </>
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
              readOnly={!isMemoEditing}
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button
            className={styles.saveBtn}
            onClick={showSaveButton() ? handleSave : handleClose}
          >
            {showSaveButton() ? "저장하고 닫기" : "닫기"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
