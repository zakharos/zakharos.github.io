---
layout: page
permalink: /publications/
title: publications
description: list of publications ordered by year
years: [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017]
nav: true
nav_order: 1
---
<!-- _pages/publications.md -->
<div class="publication-filters" style="margin-bottom: 1.5rem;">
  <button class="filter-btn active" data-filter="all">All</button>
  <button class="filter-btn" data-filter="3d-reconstruction">3D Reconstruction</button>
  <button class="filter-btn" data-filter="neural-representations">Neural Representations</button>
  <button class="filter-btn" data-filter="generative-modeling">Generative Modeling</button>
  <button class="filter-btn" data-filter="world-models">World Models</button>
  <button class="filter-btn" data-filter="pose-estimation">Pose Estimation</button>
  <button class="filter-btn" data-filter="sim2real">Sim2Real</button>
</div>

<div class="publications">

{% bibliography -f {{ site.scholar.bibliography }} %}

</div>

<style>
.publication-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}
.filter-btn {
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 0.75rem;
  padding: 0.15rem 0.5rem;
  font-size: 0.7em;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--global-text-color);
}
.filter-btn:hover {
  border-color: var(--global-theme-color);
  color: var(--global-theme-color);
}
.filter-btn.active {
  background: var(--global-theme-color);
  border-color: var(--global-theme-color);
  color: white;
}
.publications .bibliography li.filtered-out {
  display: none !important;
}
.publications h2.bibliography.filtered-out {
  display: none !important;
}
/* .pub-tags / .pub-tag styling lives globally in _sass/_base.scss */
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const formatCount = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);

  // Publication filtering (single select)
  const filterBtns = document.querySelectorAll('.filter-btn');
  const pubItems = document.querySelectorAll('.publications .bibliography li');

  function applyFilter(filter) {
    pubItems.forEach(item => {
      const row = item.querySelector('.row[data-tags]');
      const tags = row ? row.getAttribute('data-tags') : '';
      
      if (filter === 'all' || tags.includes(filter)) {
        item.classList.remove('filtered-out');
      } else {
        item.classList.add('filtered-out');
      }
    });

    // Hide year headers with no visible items
    document.querySelectorAll('.publications h2.bibliography').forEach(yearHeader => {
      const bibList = yearHeader.nextElementSibling;
      if (bibList && bibList.classList.contains('bibliography')) {
        const visibleItems = bibList.querySelectorAll('li:not(.filtered-out)');
        if (visibleItems.length > 0) {
          yearHeader.classList.remove('filtered-out');
        } else {
          yearHeader.classList.add('filtered-out');
        }
      }
    });

    // Update URL hash
    if (filter !== 'all') {
      history.replaceState(null, '', '#' + filter);
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const filter = this.getAttribute('data-filter');
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      applyFilter(filter);
    });
  });

  // Check URL hash on load for deep linking
  const hash = window.location.hash.slice(1);
  if (hash) {
    const matchingBtn = document.querySelector(`.filter-btn[data-filter="${hash}"]`);
    if (matchingBtn) {
      filterBtns.forEach(b => b.classList.remove('active'));
      matchingBtn.classList.add('active');
      applyFilter(hash);
    }
  }

  // Fetch GitHub stars (only if not pre-populated)
  document.querySelectorAll('.github-stars-count[data-repo]').forEach(function(el, i) {
    if (el.textContent.trim()) return;
    const repo = el.getAttribute('data-repo');
    if (!repo) return;
    setTimeout(function() {
      fetch('https://api.github.com/repos/' + repo, {
        headers: { Accept: 'application/vnd.github.v3+json' }
      })
      .then(r => r.json())
      .then(data => {
        if (typeof data.stargazers_count === 'number') {
          el.innerHTML = '<i class="fa-solid fa-star"></i> ' + formatCount(data.stargazers_count);
        }
      })
      .catch(() => {});
    }, i * 100);
  });
});
</script>
