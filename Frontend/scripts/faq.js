'use strict';

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('faq');
  renderFooter();
  initAccordion();
  initCategoryFilter();
  initSearch();
});

/* ============================================================
   ACCORDION
   ============================================================ */
function initAccordion() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const isOpen  = btn.getAttribute('aria-expanded') === 'true';
      const answer  = btn.nextElementSibling;
      const item    = btn.closest('.faq-item');

      if (isOpen) {
        btn.setAttribute('aria-expanded', 'false');
        answer.hidden = true;
        item.classList.remove('open');
      } else {
        // Close any other open item in the same section
        const section = btn.closest('.faq-section');
        section.querySelectorAll('.faq-question[aria-expanded="true"]').forEach(other => {
          if (other !== btn) {
            other.setAttribute('aria-expanded', 'false');
            other.nextElementSibling.hidden = true;
            other.closest('.faq-item').classList.remove('open');
          }
        });

        btn.setAttribute('aria-expanded', 'true');
        answer.hidden = false;
        item.classList.add('open');

        // Smooth scroll into view on mobile
        if (window.innerWidth < 768) {
          setTimeout(() => btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
        }
      }
    });
  });
}

/* ============================================================
   CATEGORY FILTER
   ============================================================ */
function initCategoryFilter() {
  const btns = document.querySelectorAll('.faq-cat-btn');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterByCategory(btn.dataset.cat);
    });
  });
}

function filterByCategory(cat) {
  const sections = document.querySelectorAll('.faq-section');
  const noResults = document.getElementById('faq-no-results');

  if (cat === 'all') {
    sections.forEach(s => s.classList.remove('hidden'));
    sections.forEach(s => {
      s.querySelectorAll('.faq-item').forEach(i => i.classList.remove('hidden'));
    });
    if (noResults) noResults.hidden = true;
    return;
  }

  sections.forEach(s => {
    if (s.dataset.cat === cat) {
      s.classList.remove('hidden');
    } else {
      s.classList.add('hidden');
    }
  });
  if (noResults) noResults.hidden = true;
}

/* ============================================================
   LIVE SEARCH WITH HIGHLIGHT
   ============================================================ */
let searchTimeout = null;

function initSearch() {
  const input = document.getElementById('faq-search');
  if (!input) return;

  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => runSearch(input.value.trim()), 200);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      input.value = '';
      runSearch('');
    }
  });
}

function runSearch(query) {
  const sections   = document.querySelectorAll('.faq-section');
  const noResults  = document.getElementById('faq-no-results');
  const termSpan   = document.getElementById('faq-no-results-term');
  const catBtns    = document.querySelectorAll('.faq-cat-btn');

  // Reset category filter to "all" when searching
  catBtns.forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));

  if (!query) {
    // Clear — show everything
    sections.forEach(s => {
      s.classList.remove('hidden');
      s.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('hidden');
        clearHighlight(item);
      });
    });
    if (noResults) noResults.hidden = true;
    return;
  }

  const q = query.toLowerCase();
  let totalVisible = 0;

  sections.forEach(s => {
    let sectionVisible = 0;
    s.querySelectorAll('.faq-item').forEach(item => {
      const qText = item.querySelector('.faq-question').textContent.toLowerCase();
      const aText = item.querySelector('.faq-answer')?.textContent.toLowerCase() || '';
      const match = qText.includes(q) || aText.includes(q);

      item.classList.toggle('hidden', !match);
      if (match) {
        sectionVisible++;
        totalVisible++;
        highlightText(item, query);
        // Auto-open matching items when searching
        const btn    = item.querySelector('.faq-question');
        const answer = btn.nextElementSibling;
        btn.setAttribute('aria-expanded', 'true');
        answer.hidden = false;
      } else {
        clearHighlight(item);
      }
    });

    s.classList.toggle('hidden', sectionVisible === 0);
  });

  if (noResults) {
    noResults.hidden = totalVisible > 0;
    if (termSpan) termSpan.textContent = query;
  }
}

function highlightText(item, query) {
  // Highlight in question text only (safe — question is static text, no user data)
  const btn = item.querySelector('.faq-question');
  // Only the first text node (the question label)
  let originalText = btn.dataset.originalText;
  if (!originalText) {
    // Store original text on first use
    const textNode = Array.from(btn.childNodes).find(n => n.nodeType === 3);
    if (!textNode) return;
    originalText = textNode.textContent;
    btn.dataset.originalText = originalText;
  }

  const regex    = new RegExp(`(${escapeRegex(query)})`, 'gi');
  const replaced = originalText.replace(regex, '<mark class="faq-highlight">$1</mark>');

  // Replace only the text node safely
  const textNode = Array.from(btn.childNodes).find(n => n.nodeType === 3);
  if (!textNode) return;

  const span = document.createElement('span');
  span.innerHTML = replaced; // safe: originalText is static, query is escaped
  textNode.replaceWith(span);
}

function clearHighlight(item) {
  const btn = item.querySelector('.faq-question');
  const originalText = btn.dataset.originalText;
  if (!originalText) return;

  const span = btn.querySelector('span');
  if (span) {
    const restored = document.createTextNode(originalText);
    span.replaceWith(restored);
  }
  delete btn.dataset.originalText;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
