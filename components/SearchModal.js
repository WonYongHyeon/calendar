// SearchModal.js
import { useState, useEffect, useRef } from "react";
import styles from "./Calendar.module.css";

const SearchModal = ({ onClose, onSelectDate }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [allSchedules, setAllSchedules] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAllSchedules = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/schedules/all");
        if (!response.ok) {
          throw new Error("Failed to fetch all schedules");
        }
        const data = await response.json();
        setAllSchedules(data);
      } catch (error) {
        console.error("Error fetching all schedules:", error);
      }
      setIsLoading(false);
    };
    fetchAllSchedules();
  }, []);

  const handleSearch = () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const filteredResults = [];
    for (const date in allSchedules) {
      const data = allSchedules[date];

      if (data.memo && data.memo.toLowerCase().includes(query)) {
        filteredResults.push({ date, type: "memo", text: data.memo });
      }

      if (data.events) {
        data.events.forEach((event) => {
          if (event.text.toLowerCase().includes(query)) {
            filteredResults.push({ date, type: "event", text: event.text });
          }
        });
      }
    }

    // ✅ 검색 결과를 날짜 기준으로 오름차순 정렬합니다.
    filteredResults.sort((a, b) => new Date(a.date) - new Date(b.date));

    // ✅ 정렬된 결과를 월별로 그룹화합니다.
    const groupedResults = filteredResults.reduce((acc, result) => {
      const date = new Date(result.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}년 ${month}월`;

      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(result);
      return acc;
    }, {});

    setSearchResults(groupedResults); // ✅ 그룹화된 객체로 상태를 업데이트합니다.
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

          {isLoading ? (
            <p className={styles.loadingMessage}>
              🗓️ 일정 데이터를 불러오는 중...
            </p>
          ) : searchResults && Object.keys(searchResults).length > 0 ? ( // ✅ 검색 결과가 객체인지 확인
            <div className={styles.searchResultsContainer}>
              {Object.keys(searchResults).map((monthKey, index) => (
                <div key={index}>
                  <h4 className={styles.monthHeader}>{monthKey}</h4>{" "}
                  {/* ✅ 월 헤더 */}
                  {searchResults[monthKey].map((result, resultIndex) => (
                    <div
                      key={resultIndex}
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
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.noResults}>검색 결과가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
