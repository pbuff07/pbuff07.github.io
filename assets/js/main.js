const searchPage = document.querySelector("[data-search-page]");

async function initSearch() {
  if (!searchPage) return;

  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");

  try {
    const response = await fetch("/index.json");
    const data = await response.json();

    const render = (items) => {
      if (!items.length) {
        results.innerHTML = "<li>没有匹配结果</li>";
        return;
      }

      results.innerHTML = items
        .slice(0, 20)
        .map(
          (item) =>
            `<li><a href="${item.permalink}">${item.title}</a><time>${item.date}</time></li>`
        )
        .join("");
    };

    input.addEventListener("input", (event) => {
      const keyword = event.target.value.trim().toLowerCase();
      if (!keyword) {
        results.innerHTML = "<li>开始输入后显示结果</li>";
        return;
      }

      const filtered = data.filter((item) =>
        `${item.title} ${item.summary} ${item.content}`.toLowerCase().includes(keyword)
      );
      render(filtered);
    });
  } catch (error) {
    results.innerHTML = "<li>搜索索引加载失败，请稍后重试</li>";
  }
}

initSearch();
