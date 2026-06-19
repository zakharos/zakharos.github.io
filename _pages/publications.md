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
<div class="publications">

{% bibliography -f {{ site.scholar.bibliography }} %}

</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const formatCount = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);

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

  // Fetch citation counts from Semantic Scholar (only if not pre-populated)
  document.querySelectorAll('.btn-with-count').forEach(function(wrapper, i) {
    const btn = wrapper.querySelector('.cite-btn[data-arxiv], .cite-btn[data-doi]');
    if (!btn) return;
    const countEl = wrapper.querySelector('.cite-count');
    if (countEl && countEl.textContent.trim()) return;
    const arxiv = btn.getAttribute('data-arxiv');
    const doi = btn.getAttribute('data-doi');
    const paperId = arxiv ? 'arXiv:' + arxiv : doi;
    if (!paperId) return;
    
    setTimeout(function() {
      fetch('https://api.semanticscholar.org/graph/v1/paper/' + encodeURIComponent(paperId) + '?fields=citationCount')
      .then(r => r.json())
      .then(data => {
        if (typeof data.citationCount === 'number' && data.citationCount > 0) {
          if (countEl) countEl.innerHTML = '<i class="fa-solid fa-quote-left"></i> ' + formatCount(data.citationCount);
        }
      })
      .catch(() => {});
    }, i * 50);
  });
});
</script>
