document.addEventListener('DOMContentLoaded', () => {
  for (let i = 1; i <= 5; i++) {
    const searchForm = document.getElementById(`searchForm_${i}`);
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const month = document.getElementById(`month_${i}`).value;
      const day = document.getElementById(`day_${i}`).value;
      const name = document.getElementById(`name_${i}`).value;
      const searchStatus = document.getElementById(`searchStatus_${i}`);

      searchStatus.textContent = '正在搜索并下载图片，请稍候...';

      try {
        const url = `/api/files?month=${month}&day=${day}&name=${name}`;
        console.log("发起搜索请求:", url);

        // 使用 fetch 发起请求，并在成功后打开新标签页
        console.log("准备发送请求:", {month, day, name});
        
        fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then(response => {
          console.log("收到响应状态:", response.status);
          if (!response.ok) {
            return response.text().then(text => {
              throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
            });
          }
          return response.json();
        })
        .then(data => {
          console.log("API响应数据:", data);
          if (data && data.searchId) {
            const resultsUrl = `/results?searchId=${data.searchId}`;
            console.log("准备打开结果页面:", resultsUrl);
            window.open(resultsUrl, '_blank');
          } else {
            throw new Error('无效的响应格式');
          }
        })
        .catch(error => {
          console.error('API请求失败:', error);
          searchStatus.textContent = `请求失败: ${error.message}`;
          searchStatus.style.color = 'red';
        });
      } catch (error) {
        console.error('搜索出错:', error);
        searchStatus.textContent = '搜索出错';
      } finally {
        searchStatus.textContent = ''; // 清空状态
      }
    });
  }
});
