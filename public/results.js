document.addEventListener('DOMContentLoaded', () => {
  // 1. 取得 searchId
  const searchId = new URLSearchParams(window.location.search).get('searchId');
  if (!searchId) return;

  // 2. 透過 AJAX 取得圖片資料
  fetch(`/api/files?searchId=${encodeURIComponent(searchId)}`)
    .then(res => res.json())
    .then(data => {
      if (!data.files) return;
      // 用 metaTime 排序（修正：若沒有 metaTime 則 fallback mtime）
      data.files.forEach(f => {
        if (!('metaTime' in f)) {
          // 若 API 回傳沒有 metaTime，則用 modifiedAt
          f.metaTime = f.modifiedAt || 0;
        }
      });
      data.files.sort((a, b) => a.metaTime - b.metaTime);

      // 3. 動態渲染圖片，每5張一列，強制補滿5格
      const grid = document.querySelector('.image-grid');
      grid.innerHTML = '';
      const chunkSize = 5;
      for (let i = 0; i < data.files.length; i += chunkSize) {
        const row = document.createElement('div');
        row.className = 'image-row';
        for (let j = 0; j < chunkSize; j++) {
          const file = data.files[i + j];
          const card = document.createElement('div');
          card.className = 'image-card';
          card.style.flex = '1';
          if (file) {
            const img = document.createElement('img');
            img.className = 'preview-img';
            img.src = `/cache/${searchId}/${file.name}`;
            img.alt = file.name;
            img.dataset.timestamp = file.metaTime;
            card.appendChild(img);

            // 勾選框 + A欄
            const meta = document.createElement('div');
            meta.className = 'meta';
            meta.style.display = 'flex';
            meta.style.flexDirection = 'column';
            meta.style.alignItems = 'flex-start';
            // 勾選框
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'img-select-checkbox';
            checkbox.dataset.filename = file.name;
            meta.appendChild(checkbox);
            // A欄
            const label = document.createElement('label');
            label.textContent = `A: ${file.name}`;
            meta.appendChild(label);
            card.appendChild(meta);

            // 點擊圖片事件
            img.addEventListener('click', (e) => {
              // 若有勾選框被選中，則合併，否則單張放大
              const checked = Array.from(document.querySelectorAll('.img-select-checkbox:checked'));
              if (checked.length >= 2 && checked.length <= 4) {
                const imgs = checked.map(cb => {
                  const filename = cb.dataset.filename;
                  return document.querySelector(`img[alt="${filename}"]`);
                });
                showMergedModal(imgs);
              } else {
                // 單張放大
                showSingleModal(img);
              }
            });
          } else {
            // 空白格
            const empty = document.createElement('div');
            empty.style.visibility = 'hidden';
            empty.style.height = '0';
            card.appendChild(empty);
          }
          row.appendChild(card);
        }
        grid.appendChild(row);
      }

      // 合併按鈕已不需要，改由點擊圖片自動判斷

      // 4. 啟用圖片查看功能（只保留單張放大功能）
      function showSingleModal(img) {
        const modal = document.getElementById('modal');
        const modalImg = document.getElementById('modalImg');
        let scale = 1, translateX = 0, translateY = 0;
        let allImages = Array.from(document.querySelectorAll('.preview-img'));
        let currentImageIndex = allImages.findIndex(i => i.src === img.src);

        function updateTransform() {
          modalImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        }
        function resetImagePosition() {
          translateX = 0; translateY = 0; scale = 1; updateTransform();
        }
        modal.style.display = 'flex';
        modalImg.src = img.src;
        resetImagePosition();
        document.body.style.overflow = 'hidden';

        // 滾輪縮放
        modalImg.onwheel = function(e) {
          e.preventDefault();
          if (e.deltaY < 0) scale = Math.min(4, scale + 0.1);
          else scale = Math.max(1, scale - 0.1);
          updateTransform();
        };
        // 拖曳
        let isDragging = false, startX = 0, startY = 0;
        modalImg.onmousedown = function(e) {
          if (e.button === 0) {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            modalImg.style.cursor = 'grabbing';
          }
        };
        document.onmousemove = function(e) {
          if (isDragging) {
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
          }
        };
        document.onmouseup = function() {
          isDragging = false;
          modalImg.style.cursor = 'grab';
        };

        // 左鍵點擊：下一張
        modalImg.onclick = function(e) {
          if (allImages.length > 1) {
            currentImageIndex = (currentImageIndex + 1) % allImages.length;
            modalImg.src = allImages[currentImageIndex].src;
            resetImagePosition();
          } else {
            modal.style.display = 'none';
            document.body.style.overflow = '';
          }
        };

        // 上一張按鈕
        document.getElementById('prevBtn').onclick = function() {
          if (allImages.length > 1) {
            currentImageIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
            modalImg.src = allImages[currentImageIndex].src;
            resetImagePosition();
          }
        };

        // 下一張按鈕
        document.getElementById('nextBtn').onclick = function() {
          if (allImages.length > 1) {
            currentImageIndex = (currentImageIndex + 1) % allImages.length;
            modalImg.src = allImages[currentImageIndex].src;
            resetImagePosition();
          }
        };

        // 關閉按鈕
        document.getElementById('closeModal').onclick = function() {
          modal.style.display = 'none';
          document.body.style.overflow = '';
        };

        // 鍵盤方向鍵
        document.onkeydown = function(e) {
          if (modal.style.display === 'flex') {
            if (e.key === 'ArrowLeft') {
              // 上一張
              if (allImages.length > 1) {
                currentImageIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
                modalImg.src = allImages[currentImageIndex].src;
                resetImagePosition();
              }
            }
            if (e.key === 'ArrowRight') {
              // 下一張
              if (allImages.length > 1) {
                currentImageIndex = (currentImageIndex + 1) % allImages.length;
                modalImg.src = allImages[currentImageIndex].src;
                resetImagePosition();
              }
            }
            if (e.key === 'ArrowUp') {
              // 放大
              scale = Math.min(4, scale + 0.1);
              updateTransform();
            }
            if (e.key === 'ArrowDown') {
              // 縮小
              scale = Math.max(1, scale - 0.1);
              updateTransform();
            }
            if (e.key === 'Escape') {
              modal.style.display = 'none';
              document.body.style.overflow = '';
            }
          } else {
            // ESC 或 Tab 鍵清除所有選中的圖片
            if (e.key === 'Escape' || e.key === 'Tab') {
              const checkboxes = document.querySelectorAll('.img-select-checkbox:checked');
              checkboxes.forEach(checkbox => {
                checkbox.checked = false;
              });
              // 如果合併模態框開啟，也關閉它
              const mergedModal = document.getElementById('mergedModal');
              if (mergedModal && mergedModal.style.display === 'flex') {
                mergedModal.style.display = 'none';
              }
            }
          }
        };
      }

      // 合併圖片顯示
      function showMergedModal(imgs) {
        let modal = document.getElementById('mergedModal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'mergedModal';
          modal.style.position = 'fixed';
          modal.style.left = 0;
          modal.style.top = 0;
          modal.style.width = '100vw';
          modal.style.height = '100vh';
          modal.style.background = 'rgba(0,0,0,0.8)';
          modal.style.display = 'flex';
          modal.style.alignItems = 'center';
          modal.style.justifyContent = 'center';
          modal.style.zIndex = 9999;
          modal.innerHTML = `<canvas id="mergedCanvas"></canvas>`;
          document.body.appendChild(modal);
        }
        modal.style.display = 'flex';

        // 合併圖片到canvas
        const canvas = document.getElementById('mergedCanvas');
        const ctx = canvas.getContext('2d');
        const count = imgs.length;
        const imgWidth = 400, imgHeight = 400;
        let canvasWidth = imgWidth * (count === 2 ? 2 : count === 3 ? 3 : 2);
        let canvasHeight = imgHeight * (count === 2 ? 1 : count === 3 ? 1 : 2);
        if (count === 3) { canvasWidth = imgWidth * 3; canvasHeight = imgHeight; }
        if (count === 4) { canvasWidth = imgWidth * 2; canvasHeight = imgHeight * 2; }
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        imgs.forEach((img, idx) => {
          let x = 0, y = 0;
          if (count === 2) { x = idx * imgWidth; y = 0; }
          if (count === 3) { x = idx * imgWidth; y = 0; }
          if (count === 4) { x = (idx % 2) * imgWidth; y = Math.floor(idx / 2) * imgHeight; }
          ctx.drawImage(img, x, y, imgWidth, imgHeight);
        });

        // 滾輪縮放
        let scale = 1;
        canvas.onwheel = function(e) {
          e.preventDefault();
          if (e.deltaY < 0) scale = Math.min(4, scale + 0.1);
          else scale = Math.max(0.2, scale - 0.1);
          canvas.style.transform = `scale(${scale})`;
        };

        // 左鍵點擊canvas或modal關閉
        let lastClick = 0;
        canvas.onclick = function(e) {
          const now = Date.now();
          if (now - lastClick < 400) { // 雙擊
            modal.style.display = 'none';
            canvas.style.transform = 'scale(1)';
          }
          lastClick = now;
        };
        modal.onclick = function(e) {
          if (e.target === modal) {
            modal.style.display = 'none';
            canvas.style.transform = 'scale(1)';
          }
        };
      }
    });

  // B 欄格式
  function formatB(ts) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const h = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    const sec = d.getSeconds().toString().padStart(2, '0');
    // 格式 YYYY:MM:DD HH:mm:ss
    return `${y}:${m}:${day} ${h}:${min}:${sec}`;
  }

  // 5. 圖片放大/縮放/關閉功能
  function enableImageModal() {
    const modal = document.getElementById('modal');
    const modalImg = document.getElementById('modalImg');
    const closeModal = document.getElementById('closeModal');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const resetZoom = document.getElementById('resetZoom');
    let currentImageIndex = 0;
    let allImages = Array.from(document.querySelectorAll('.preview-img'));
    let scale = 1;
    let isDragging = false, startX = 0, startY = 0, translateX = 0, translateY = 0;

    function updateCurrentIndex(imgSrc) {
      currentImageIndex = allImages.findIndex(img => img.src === imgSrc);
    }
    function navigateToImage(index) {
      if (index >= 0 && index < allImages.length) {
        modalImg.src = allImages[index].src;
        currentImageIndex = index;
        resetImagePosition();
      }
    }
    function prevImage() { if (currentImageIndex > 0) navigateToImage(currentImageIndex - 1); }
    function nextImage() { if (currentImageIndex < allImages.length - 1) navigateToImage(currentImageIndex + 1); }
    function updateTransform() {
      modalImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }
    function resetImagePosition() {
      translateX = 0; translateY = 0; scale = 1; updateTransform();
    }

    allImages.forEach(img => {
      img.addEventListener('click', () => {
        modal.style.display = 'flex';
        modalImg.src = img.src;
        updateCurrentIndex(img.src);
        resetImagePosition();
        document.body.style.overflow = 'hidden';
      });
    });

    prevBtn.addEventListener('click', prevImage);
    nextBtn.addEventListener('click', nextImage);
    zoomIn.addEventListener('click', () => { scale = Math.min(4, scale + 0.2); updateTransform(); });
    zoomOut.addEventListener('click', () => { scale = Math.max(1, scale - 0.2); updateTransform(); });
    resetZoom.addEventListener('click', resetImagePosition);

    modalImg.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        modalImg.style.cursor = 'grabbing';
      }
    });
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
      }
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
      modalImg.style.cursor = 'grab';
    });

    document.addEventListener('keydown', (e) => {
      if (modal.style.display === 'flex') {
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'Escape') close();
      }
    });

    function close() {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
    closeModal.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    // 滾輪縮放
    modalImg.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) scale = Math.min(4, scale + 0.1);
      else scale = Math.max(1, scale - 0.1);
      updateTransform();
    });
  }
});
