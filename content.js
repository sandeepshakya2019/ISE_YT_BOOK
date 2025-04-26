(() => {
  let youtubeLeftControls, youtubePlayer;
  let currentVideo = "";
  let currentVideoBookmarks = [];

  const fetchBookmarks = () => {


      currentVideoBookmarks = await fetchBookmarks();

      chrome.storage.sync.set(
        {
          [currentVideo]: JSON.stringify(
            [...currentVideoBookmarks, newBookmark].sort(
              (a, b) => a.time - b.time
            )
          ),
          [`${currentVideo}_title`]: videoTitle,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error("Storage error:", chrome.runtime.lastError);
            alert("Failed to save bookmark. Please try again!");
          } else {
            alert("Bookmark added successfully! 📌");
          }
        }
      );

      currentVideoBookmarks = await fetchBookmarks();
    } catch (error) {
      console.error("Error in addNewBookmarkEventHandler:", error);
      alert("An error occurred while adding the bookmark. ❌");
    }
  };

  const newVideoLoaded = async () => {
    const bookmarkBtnExists =
      document.getElementsByClassName("bookmark-btn")[0];
    currentVideoBookmarks = await fetchBookmarks();

    if (!bookmarkBtnExists) {
      const bookmarkBtn = document.createElement("img");
      bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
      bookmarkBtn.className = "ytp-button " + "bookmark-btn";
      bookmarkBtn.title = "Click to bookmark current timestamp";
      bookmarkBtn.style.width = "40px";
      bookmarkBtn.style.height = "40px";

      youtubeLeftControls =
        document.getElementsByClassName("ytp-left-controls")[0];
      youtubePlayer = document.getElementsByClassName("video-stream")[0];

      youtubeLeftControls.appendChild(bookmarkBtn);
      bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler);
    }
  };

  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, value, videoId } = obj;

    if (type === "NEW") {
      currentVideo = videoId;
      newVideoLoaded();
    } else if (type === "PLAY") {
      youtubePlayer.currentTime = value;
    } else if (type === "DELETE") {
      currentVideoBookmarks = currentVideoBookmarks.filter(
        (b) => b.time != value
      );
      chrome.storage.sync.set(
        {
          [currentVideo]: JSON.stringify(currentVideoBookmarks),
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error("Error deleting bookmark:", chrome.runtime.lastError);
            alert("Failed to delete bookmark. ❌");
          } else {
            alert("Bookmark deleted successfully! 🗑️");
          }
        }
      );

      response(currentVideoBookmarks);
    }
  });

  newVideoLoaded();
})();

const getTime = (t) => {
  var date = new Date(0);
  date.setSeconds(t);
  return date.toISOString().substr(11, 8);
};
