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
import { BREAK_DAY_IMAGES } from "./images";

const getImageUrlById = (id) => {
  const image = BREAK_DAY_IMAGES.find((img) => img.id === id);
  return image ? image.url : null;
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

const ScheduleModal = ({
  dateStr,
  data,
  onClose,
  onSave,
  onBreakDayChange,
}) => {
  const [events, setEvents] = useState([]);
  const [memo, setMemo] = useState("");
  const [newEvent, setNewEvent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [isMemoEditing, setIsMemoEditing] = useState(false);

  // ✅ 누락된 상태 추가
  const [showImageSelector, setShowImageSelector] = useState(false);

  const isBreakDay = data?.isBreakDay || false;
  const selectedImageId = data?.breakDayImageId || null;

  const [originalData, setOriginalData] = useState({
    events: [],
    memo: "",
    isBreakDay: false,
    breakDayImageId: null,
  });

  useEffect(() => {
    if (data) {
      const eventsWithId = data.events.map((event, index) => ({
        ...event,
        id: event.id || `event-${Date.now()}-${index}`,
      }));
      setEvents(eventsWithId);
      setMemo(data.memo || "");
      setOriginalData({
        events: data.events,
        memo: data.memo,
        isBreakDay: data.isBreakDay,
        breakDayImageId: data.breakDayImageId,
      });
    } else {
      setEvents([]);
      setMemo("");
      setOriginalData({
        events: [],
        memo: "",
        isBreakDay: false,
        breakDayImageId: null,
      });
    }
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
      finalEvents = [
        ...events,
        { text: newEvent.trim(), isImportant, id: `event-${Date.now()}` },
      ];
    }
    const eventsToSave = isBreakDay ? [] : finalEvents;
    onSave(dateStr, eventsToSave, memo, isBreakDay, selectedImageId);
  };

  const handleClose = () => {
    onClose();
  };

  const showSaveButton = () => {
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

    if (
      isBreakDay !== originalData.isBreakDay ||
      selectedImageId !== originalData.breakDayImageId
    ) {
      return true;
    }

    const currentEvents = [...events];
    if (newEvent.trim()) {
      currentEvents.push({
        text: newEvent.trim(),
        isImportant,
        id: "temp-new-event",
      });
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

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
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
                  onBreakDayChange(
                    dateStr,
                    e.target.checked,
                    memo,
                    selectedImageId
                  );
                }}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>
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
                <SortableContext
                  items={events.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className={styles.eventListModal}>
                    {events.map((event) => (
                      <SortableItem
                        key={event.id}
                        event={event}
                        handleDeleteEvent={handleDeleteEvent}
                      />
                    ))}
                  </ul>
                </SortableContext>
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
                    onClick={() => {
                      onBreakDayChange(dateStr, true, memo, null);
                    }}
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
                <div className={styles.imageOptionsContainer}>
                  {BREAK_DAY_IMAGES.map((image) => (
                    <div
                      key={image.id}
                      className={`${styles.imageOptionItem} ${
                        selectedImageId === image.id ? styles.selectedImage : ""
                      }`}
                      onClick={() => {
                        onBreakDayChange(dateStr, true, memo, image.id);
                        setShowImageSelector(false);
                      }}
                    >
                      <img src={getImageUrlById(image.id)} alt={image.id} />
                    </div>
                  ))}
                </div>
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
