function moveArchiveToSidebar() {
  var primarySidebar = document.querySelector(".md-sidebar--primary");
  var secondarySidebar = document.querySelector(".md-sidebar--secondary");
  if (!primarySidebar || !secondarySidebar) return;

  var archiveSection = null;
  var sections = primarySidebar.querySelectorAll(".md-nav__item--section");
  for (var i = 0; i < sections.length; i++) {
    if (sections[i].style.display === "none") continue;
    var label = sections[i].querySelector(".md-nav__link");
    if (label && label.textContent.trim() === "归档") {
      archiveSection = sections[i];
      break;
    }
  }

  if (!archiveSection) return;

  var archiveNav = archiveSection.querySelector(".md-nav[data-md-level]");
  var archiveList = archiveNav ? archiveNav.querySelector(".md-nav__list") : null;
  if (!archiveList) return;

  var inner = secondarySidebar.querySelector(".md-sidebar__inner");
  if (!inner) return;

  var nav = document.createElement("nav");
  nav.className = "md-nav md-nav--secondary md-nav--archive";
  nav.setAttribute("aria-label", "归档");

  var title = document.createElement("div");
  title.className = "md-nav__title";
  title.textContent = "归档";
  nav.appendChild(title);
  nav.appendChild(archiveList.cloneNode(true));

  inner.innerHTML = "";
  inner.appendChild(nav);

  archiveSection.style.display = "none";
  secondarySidebar.classList.add("md-sidebar--archive-active");
  secondarySidebar.removeAttribute("hidden");
}

document.addEventListener("DOMContentLoaded", moveArchiveToSidebar);

if (typeof document$ !== "undefined") {
  document$.subscribe(moveArchiveToSidebar);
}
