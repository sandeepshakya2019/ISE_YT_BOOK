(() => {
  let youtubeLeftControls, youtubePlayer;
  let currentVideo = "";
  let currentVideoBookmarks = [];

  const fetchBookmarks = () => {
    return new Promise((resolve) => {
      if (!chrome || !chrome.runtime || !chrome.storage) {
        console.warn("Chrome runtime/storage is not available.");
        alert("Please Reload the Page📌");
        resolve([]);
        return;
      }

      chrome.storage.sync.get([currentVideo], (obj) => {
        resolve(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []);
      });
    });
  };

  const addNewBookmarkEventHandler = async () => {
    try {
      const currentTime = youtubePlayer.currentTime;

      // Get current date and format it as dd/mm/yyyy hh:mm:ss
      const now = new Date();
      const formattedDate = `${now.getDate().toString().padStart(2, "0")}/${(
        now.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${now.getFullYear()} ${now
        .getHours()
        .toString()
        .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now
        .getSeconds()
        .toString()
        .padStart(2, "0")}`;

      // Extract video title from the webpage
      const videoTitleElement = document.querySelector(
        "#title h1 yt-formatted-string"
      );
      const videoTitle = videoTitleElement
        ? videoTitleElement.innerText.trim()
        : "Unknown Video";
      console.log(videoTitle);

      const newBookmark = {
        id: Math.floor(Math.random() * 1000000),
        time: currentTime,
        desc: "Bookmark at " + getTime(currentTime),
        addedAt: "Added at " + formattedDate,
        shortDesc: "Bookmark added with a short description of this video",
        title: videoTitle,
      };

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
            const notification = document.createElement("div");
            notification.classList.add("bookmark-notification");
            notification.innerText = "Bookmark added successfully! 📌";

            notification.style.position = "fixed";
            notification.style.bottom = "10px";
            notification.style.left = "50%";
            notification.style.transform = "translateX(-50%)";
            notification.style.backgroundColor = "#4CAF50";
            notification.style.color = "white";
            notification.style.padding = "10px 20px";
            notification.style.borderRadius = "5px";
            notification.style.fontSize = "16px";
            notification.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
            notification.style.zIndex = "1000";

            document.body.appendChild(notification);

            setTimeout(() => {
              notification.style.transition = "opacity 1s ease";
              notification.style.opacity = "0";
              setTimeout(() => {
                notification.remove();
              }, 1000);
            }, 3000);
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
