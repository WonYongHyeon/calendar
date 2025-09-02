import { useState } from "react";
import styles from "./Calendar.module.css";

const SearchModal = ({ scheduleData, onClose, onSelectDate }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const filteredResults = [];
    for (const date in scheduleData) {
      const data = scheduleData[date];

      if (data.memo && data.memo.toLowerCase().includes(query)) {
        filteredResults.push({ date, type: "memo", text: data.memo });
      }

      data.events.forEach((event) => {
        if (event.text.toLowerCase().includes(query)) {
          filteredResults.push({ date, type: "event", text: event.text });
        }
      });
    }
    setSearchResults(filteredResults);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>일정 검색</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="검색어를 입력하세요..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyUp={handleKeyPress}
              className={styles.searchInput}
            />
            <button className={styles.searchButton} onClick={handleSearch}>
              검색
            </button>
          </div>

          <div className={styles.searchResultsContainer}>
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <div
                  key={index}
                  className={styles.searchResultItem}
                  onClick={() => onSelectDate(result.date)}
                >
                  <span className={styles.searchResultDate}>
                    {new Date(result.date).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <p className={styles.searchResultText}>
                    {result.type === "event"
                      ? `일정: ${result.text}`
                      : `메모: ${result.text}`}
                  </p>
                </div>
              ))
            ) : (
              <p className={styles.noResults}>검색 결과가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
