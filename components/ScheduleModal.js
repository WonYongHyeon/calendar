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

const VodLink = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M10.59 13.41a2 2 0 0 1 0-2.82l3.18-3.18a2 2 0 1 1 2.83 2.83l-1.06 1.06"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    ></path>
    <path
      d="M13.41 10.59a2 2 0 0 1 0 2.82l-3.18 3.18a2 2 0 1 1-2.83-2.83l1.06-1.06"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    ></path>
  </svg>
);

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
    opacity: isDragging ? 0 : 1,
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
  const [isImportant, setIsImportant] = useState(false);
  const [isMemoEditing, setIsMemoEditing] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const [morningTime, setMorningTime] = useState("");
  const [afternoonTime, setAfternoonTime] = useState("");
  const [vodLink, setVodLink] = useState("");

  // isBreakDay와 breakDayImageId 상태를 컴포넌트 내부에서 관리
  const [isBreakDay, setIsBreakDay] = useState(data?.isBreakDay || false);
  const [selectedImageId, setSelectedImageId] = useState(
    data?.breakDayImageId || null
  );

  const [originalData, setOriginalData] = useState({
    events: [],
    memo: "",
    isBreakDay: false,
    breakDayImageId: null,
    morningTime: "",
    afternoonTime: "",
    vodLink: "",
  });

  const [showImageSelector, setShowImageSelector] = useState(false);

  const [eventPage, setEventPage] = useState(1);
  const eventsPerPage = 4;
  const totalEventPages = Math.ceil(events.length / eventsPerPage);
  const paginatedEvents = events.slice(
    (eventPage - 1) * eventsPerPage,
    eventPage * eventsPerPage
  );

  const pageChangeTimerRef = useRef(null);
  const isDraggingOverPaginationRef = useRef(null);

  useEffect(() => {
    if (data) {
      const eventsWithId = data.events.map((event, index) => ({
        ...event,
        id: event.id || `event-${Date.now()}-${index}`,
      }));
      setEvents(eventsWithId);
      setMemo(data.memo || "");
      setMorningTime(data.morningTime || "");
      setAfternoonTime(data.afternoonTime || "");
      setIsBreakDay(data.isBreakDay || false);
      setSelectedImageId(data.breakDayImageId || null);

      setOriginalData({
        events: data.events,
        memo: data.memo,
        isBreakDay: data.isBreakDay,
        breakDayImageId: data.breakDayImageId,
        morningTime: data.morningTime || "",
        afternoonTime: data.afternoonTime || "",
        vodLink: data.vodLink || "",
      });
      setEventPage(1);
    } else {
      setEvents([]);
      setMemo("");
      setMorningTime("");
      setAfternoonTime("");
      setIsBreakDay(false);
      setSelectedImageId(null);
      setVodLink("");

      setOriginalData({
        events: [],
        memo: "",
        isBreakDay: false,
        breakDayImageId: null,
        morningTime: "",
        afternoonTime: "",
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
      setMorningTime(""); // 시간 초기화
      setAfternoonTime(""); // 시간 초기화
    }
    // onSave 함수를 호출하여 상태를 저장 (isBreakDay 상태만 변경)
    onSave(
      dateStr,
      [], // 이벤트는 비움
      memo,
      newIsBreakDay,
      selectedImageId,
      "", // 시간 비움
      "", // 시간 비움
      false // 모달 닫지 않음
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
      false
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
      false
    );
  };

  const handleAddEvent = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      if (newEvent.trim()) {
        const newEventItem = {
          id: `event-${Date.now()}`,
          text: newEvent.trim(),
          isImportant: isImportant,
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
        { text: newEvent.trim(), isImportant, id: `event-${Date.now()}` },
      ];
    }
    onSave(
      dateStr,
      finalEvents,
      memo,
      isBreakDay,
      selectedImageId,
      morningTime,
      afternoonTime
    );
  };

  const showSaveButton = () => {
    const isInitialEmpty =
      originalData.events.length === 0 &&
      originalData.memo === "" &&
      !originalData.isBreakDay &&
      !originalData.morningTime &&
      !originalData.afternoonTime;
    const isCurrentEmpty =
      events.length === 0 &&
      memo.trim() === "" &&
      !isBreakDay &&
      newEvent.trim() === "" &&
      !morningTime &&
      !afternoonTime;
    if (isInitialEmpty && isCurrentEmpty) {
      return false;
    }

    if (
      isBreakDay !== originalData.isBreakDay ||
      selectedImageId !== originalData.breakDayImageId ||
      morningTime !== originalData.morningTime ||
      afternoonTime !== originalData.afternoonTime
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

  const onClickVodLink = () => {
    console.log("VOD 링크 클릭됨", vodLink);
    const title = "VOD 링크 등록";
    const html = `VOD 링크를`;
    if (vodLink.trim() == "") {
      Swal.fire({
        title: "두 개의 입력 필드",
        html:
          '<input type="text" id="swal-input1" class="swal2-input" placeholder="VOD 링크를 입력해주세요.">' +
          '<input type="password" id="swal-input2" class="swal2-input" placeholder="DB 비밀번호를 입력해주세요.">',
        preConfirm: () => {
          return [
            document.getElementById("swal-input1").value,
            document.getElementById("swal-input2").value,
          ];
        },
      }).then((result) => {
        if (result.isConfirmed) {
          const [value1, value2] = result.value;
          console.log("첫 번째 입력:", value1);
          console.log("두 번째 입력:", value2);
        }
      });
    }
  };

  const date = new Date(dateStr);
  const activeEvent = events.find((event) => event.id === activeId);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>
            {`${date.getFullYear()}년 ${
              date.getMonth() + 1
            }월 ${date.getDate()}일`}{" "}
            <span className={styles.vodLinkIcon} onClick={onClickVodLink}>
              <VodLink />
            </span>
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
              <div className={styles.timeSection}>
                <div className={styles.eventTimeSection}>
                  <h4>☀️ 오전 뱅온 시간</h4>
                  <input
                    type="text"
                    className={styles.timeInput}
                    placeholder="예: 7:10"
                    value={morningTime}
                    onChange={(e) => setMorningTime(e.target.value)}
                  />
                </div>
                <div className={styles.eventTimeSection}>
                  <h4>🌙 오후 뱅온 시간</h4>
                  <input
                    type="text"
                    className={styles.timeInput}
                    placeholder="예: 19:00"
                    value={afternoonTime}
                    onChange={(e) => setAfternoonTime(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.eventTitleRow}>
                <h4>🗓️ 일정 추가</h4>
                <div className={styles.importantCheckbox}>
                  <span className={styles.toggleLabel}>오전</span>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={isImportant}
                      onChange={(e) => setIsImportant(e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                  <span className={styles.toggleLabel}>오후</span>
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
                          Math.min(prev + 1, totalEventPages)
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
                        className={
                          activeEvent.isImportant
                            ? styles.importantEventListItem
                            : styles.eventListItem
                        }
                        style={{ cursor: "grabbing" }}
                      >
                        {activeEvent.text}
                      </li>
                    ) : null}
                  </DragOverlay>,
                  document.body
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
