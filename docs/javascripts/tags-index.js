function buildTagsOverview() {
  var overview = document.getElementById("tags-overview");
  if (!overview) return;

  var article = overview.closest(".md-content__inner");
  if (!article) return;

  var headings = article.querySelectorAll('h2[id^="tag:"]');
  if (!headings.length) return;

  overview.innerHTML = "";
  var tagMap = {};
  var orderedIds = [];

  headings.forEach(function (heading) {
    var tag = heading.querySelector(".md-tag");
    if (!tag) return;

    var list = heading.nextElementSibling;
    var count =
      list && list.tagName === "UL" ? list.querySelectorAll("li").length : 0;

    if (!tagMap[heading.id]) {
      tagMap[heading.id] = { tag: tag, count: count };
      orderedIds.push(heading.id);
      return;
    }

    tagMap[heading.id].count += count;
  });

  overview.innerHTML = "";

  orderedIds.forEach(function (id) {
    var entry = tagMap[id];

    var link = document.createElement("a");
    link.className = "tags-overview__item";
    link.href = "#" + id;

    var tagClone = entry.tag.cloneNode(true);
    link.appendChild(tagClone);

    var countEl = document.createElement("span");
    countEl.className = "tags-overview__count";
    countEl.textContent = String(entry.count);
    link.appendChild(countEl);

    overview.appendChild(link);
  });
}

document.addEventListener("DOMContentLoaded", buildTagsOverview);

if (typeof document$ !== "undefined") {
  document$.subscribe(buildTagsOverview);
}
