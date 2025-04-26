document.addEventListener("DOMContentLoaded", async () => {
  const allBookmarksElement = document.getElementById("all-bookmarks");
  const deleteAllButton = document.getElementById("delete-all");
  const storageText = document.getElementById("storage-text");
  const storageProgress = document.getElementById("storage-progress");
  const exportButton = document.getElementById("export-button");
  const importButton = document.getElementById("import-button");
  const importFileInput = document.getElementById("import-file");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-options");

  const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString();

  const updateTotalStorageUsage = () => {
    chrome.storage.sync.getBytesInUse(null, (bytesInUse) => {
      const maxStorage = 102400;
      const percentageUsed = ((bytesInUse / maxStorage) * 100).toFixed(2);
      storageText.textContent = `Total Storage Used: ${percentageUsed}% (${bytesInUse} bytes)`;
      storageProgress.style.width = `${percentageUsed}%`;
      storageProgress.style.backgroundColor =
        percentageUsed > 80 ? "#ff5733" : "#007bff";
    });
  };

  const renderBookmarks = () => {
    chrome.storage.sync.get(null, (data) => {
      allBookmarksElement.innerHTML = "";
      const searchQuery = searchInput?.value.toLowerCase() || "";
      const sortBy = sortSelect?.value || "date";

      let videoIds = Object.keys(data).filter((id) => !id.endsWith("_title"));

      if (sortBy === "title") {
        videoIds.sort((a, b) => {
          const titleA = (data[`${a}_title`] || "").toLowerCase();
          const titleB = (data[`${b}_title`] || "").toLowerCase();
          return titleA.localeCompare(titleB);
        });
      }

      const pinnedVideos = JSON.parse(
        localStorage.getItem("pinnedVideos") || "{}"
      );

      videoIds = videoIds.filter((id) => data[id]); // ensure valid keys

      // Sort based on pinning first, then title/date
      videoIds.sort((a, b) => {
        const aPinned = pinnedVideos[a] ? 1 : 0;
        const bPinned = pinnedVideos[b] ? 1 : 0;

        if (aPinned !== bPinned) return bPinned - aPinned; // Pinned first

        if (sortBy === "title") {
          const titleA = (data[`${a}_title`] || "").toLowerCase();
          const titleB = (data[`${b}_title`] || "").toLowerCase();
          return titleA.localeCompare(titleB);
        }

        // Default fallback sort by latest bookmark timestamp (desc)
        const lastA = Math.max(
          ...(JSON.parse(data[a] || "[]").map((b) => b.timestamp) || [0])
        );
        const lastB = Math.max(
          ...(JSON.parse(data[b] || "[]").map((b) => b.timestamp) || [0])
        );
        return lastB - lastA;
      });

      if (videoIds.length === 0) {
        allBookmarksElement.innerHTML = "<i>No bookmarks saved yet.</i>";
        deleteAllButton.style.display = "none";
        return;
      }

      deleteAllButton.style.display = "block";

      videoIds.forEach((videoId) => {
        let videoBookmarks = JSON.parse(data[videoId] || "[]");
        if (!videoBookmarks.length) return;
        videoBookmarks = videoBookmarks.map((b) => ({
          ...b,
          addedAt: formatTimestamp(b.timestamp),
        }));
        videoBookmarks.sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp    
          
        // Sort by title or date based on user selection
        if (sortBy === "title") {
          videoBookmarks.sort((a, b) =>
            a.shortDesc.localeCompare(b.shortDesc)
          );
        } else if (sortBy === "date") {
          videoBookmarks.sort((a, b) => b.timestamp - a.timestamp);
        } 
        else if (sortBy === "time") {
          videoBookmarks.sort((a, b) => a.time - b.time);
        }
        else if (sortBy === "desc") {
          videoBookmarks.sort((a, b) => a.shortDesc.localeCompare(b.shortDesc));
        } 
        else if (sortBy === "asc") {
          videoBookmarks.sort((a, b) => b.shortDesc.localeCompare(a.shortDesc));

            chrome.storage.sync.get([videoId], (data) => {
              const bookmarks = JSON.parse(data[videoId]);
              const fromIndex = bookmarks.findIndex(
                (b) => b.time === draggedTime
              );
              const toIndex = bookmarks.findIndex(
                (b) => b.time === bookmark.time
              );
              if (fromIndex !== -1 && toIndex !== -1) {
                const [moved] = bookmarks.splice(fromIndex, 1);
                bookmarks.splice(toIndex, 0, moved);
                chrome.storage.sync.set(
                  { [videoId]: JSON.stringify(bookmarks) },
                  renderBookmarks
                );
              }
            });
          });

          // Video preview
          bookmarkItem.addEventListener("mouseenter", () => {
            const startTime = Math.floor(bookmark.time || 0);
            const preview = document.createElement("iframe");
            preview.src = `https://www.youtube.com/embed/${videoId}?start=${startTime}&autoplay=1&mute=1`;
            preview.width = "320";
            preview.height = "180";
            preview.style.position = "absolute";
            preview.style.top = "0";
            preview.style.left = "100%";
            preview.style.zIndex = "1000";
            preview.style.border = "none";
            preview.style.borderRadius = "8px";
            bookmarkItem.appendChild(preview);

            bookmarkItem.addEventListener(
              "mouseleave",
              () => preview.remove(),
              { once: true }
            );
          });
        });

        videoSection.appendChild(bookmarkList);
        allBookmarksElement.appendChild(videoSection);
      });

      updateTotalStorageUsage();
    });
  };

  const deleteBookmark = (videoId, time, bookmarkElement, videoSection) => {
    chrome.storage.sync.get([videoId], (data) => {
      let bookmarks = data[videoId] ? JSON.parse(data[videoId]) : [];
      bookmarks = bookmarks.filter((b) => b.time !== time);
      if (bookmarks.length > 0) {
        chrome.storage.sync.set(
          { [videoId]: JSON.stringify(bookmarks) },
          () => {
            bookmarkElement.remove();
            updateTotalStorageUsage();
          }
        );
      } else {
        chrome.storage.sync.remove(videoId, () => {
          videoSection.remove();
          updateTotalStorageUsage();
        });
      }
    });
  };

  deleteAllButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all bookmarks?")) {
      chrome.storage.sync.clear(() => {
        alert("All bookmarks deleted!");
        allBookmarksElement.innerHTML = "<i>No bookmarks saved yet.</i>";
        deleteAllButton.style.display = "none";
        updateTotalStorageUsage();
      });
    }
  });

  function exportBookmarks() {
    chrome.storage.sync.get(null, (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bookmarks.json";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 1000);
    });
  }

  async function importBookmarks(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        chrome.storage.sync.get(null, async (existingData) => {
          const mergedData = { ...existingData, ...importedData };
          for (const [key, value] of Object.entries(mergedData)) {
            await new Promise((resolve) =>
              chrome.storage.sync.set({ [key]: value }, resolve)
            );
          }
          alert("Bookmarks imported successfully!");
          setTimeout(() => location.reload(), 500);
        });
      } catch {
        alert("Invalid file format.");
      }
    };
    reader.readAsText(file);
  }

  exportButton.addEventListener("click", exportBookmarks);
  importButton.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", importBookmarks);
  searchInput.addEventListener("input", renderBookmarks);
  sortSelect.addEventListener("change", renderBookmarks);

  renderBookmarks();
});
