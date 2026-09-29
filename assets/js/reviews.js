/* AgriDabaw-3D — ratings and reviews
   Reads the overall rating and the players' comments from the game's server
   and posts a new rating and comment from the form. Text from the server is
   always inserted with textContent, never as HTML. */
(function () {
  'use strict';

  var section = document.getElementById('reviews');
  if (!section || !window.fetch) return;

  var PAGE_SIZE = 10;
  var MAX_CHARS = 1000;
  var REQUIRED = 'This is a required question';
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* A preview opened on this computer can talk to a test server, for example
     index.html?api=http://127.0.0.1:8099. Only on localhost, so a shared link
     can never send a visitor's review anywhere else. */
  var api = (section.getAttribute('data-api') || '').replace(/\/+$/, '');
  if (['localhost', '127.0.0.1', '[::1]'].indexOf(location.hostname) !== -1) {
    var override = new URLSearchParams(location.search).get('api');
    if (override && /^https?:\/\//i.test(override)) api = override.replace(/\/+$/, '');
  }

  var average = document.getElementById('rvAverage');
  var avgStars = document.getElementById('rvAvgStars');
  var totalLine = document.getElementById('rvTotal');
  var bars = Array.prototype.slice.call(section.querySelectorAll('.rv-bar'));
  var tip = document.getElementById('rvTip');
  var summaryCard = section.querySelector('.rv-summary');

  var form = document.getElementById('rvForm');
  var rate = document.getElementById('rvRate');
  var options = Array.prototype.slice.call(rate.querySelectorAll('.rv-rate__opt'));
  var ratingQ = document.getElementById('rvRatingQ');
  var ratingError = document.getElementById('rvRatingError');
  var comment = document.getElementById('rvComment');
  var commentQ = document.getElementById('rvCommentQ');
  var commentError = document.getElementById('rvCommentError');
  var counter = document.getElementById('rvCounter');
  var submit = document.getElementById('rvSubmit');
  var status = document.getElementById('rvStatus');
  var thanks = document.getElementById('rvThanks');
  var again = document.getElementById('rvAgain');

  var feedStatus = document.getElementById('rvFeedStatus');
  var list = document.getElementById('rvList');
  var more = document.getElementById('rvMore');

  var numbers = new Intl.NumberFormat('en-PH');
  var dates = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

  var summary = null;
  var selected = 0;
  var sending = false;
  var loading = false;
  var nextPage = 0;
  var shown = {};

  function plural(count, word) {
    return numbers.format(count) + ' ' + word + (count === 1 ? '' : 's');
  }

  function starLabel(stars) {
    return stars + (stars === 1 ? ' star' : ' stars');
  }

  /* ---------- Talking to the server ---------- */
  function request(path, body) {
    var init = { method: body ? 'POST' : 'GET', headers: { 'Accept': 'application/json' } };
    if (body) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    return fetch(api + path, init).then(function (response) {
      return response.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (err) { data = null; }

        if (!response.ok) {
          var error = new Error((data && data.message) || 'Request failed');
          error.status = response.status;
          error.fields = (data && data.fieldErrors) || {};
          throw error;
        }
        return data;
      });
    });
  }

  /* ---------- Overall rating ---------- */
  function renderSummary(next) {
    if (!next) return;
    summary = next;

    var total = next.total || 0;
    var mean = total ? next.average : 0;

    average.textContent = mean.toFixed(1);
    average.classList.toggle('is-empty', !total);
    avgStars.style.setProperty('--fill', (mean / 5 * 100) + '%');
    avgStars.setAttribute('aria-label', total
      ? 'Average rating ' + mean.toFixed(1) + ' out of 5'
      : 'No ratings yet');
    totalLine.textContent = total ? plural(total, 'rating') : 'No ratings yet';

    bars.forEach(function (row) {
      var stars = Number(row.getAttribute('data-stars'));
      var count = (next.counts && next.counts[stars - 1]) || 0;
      row.querySelector('.rv-bar__fill').style.width = (total ? count / total * 100 : 0) + '%';
      row.querySelector('.rv-bar__count').textContent = numbers.format(count);
    });
  }

  function summaryUnavailable() {
    if (summary) return;
    totalLine.textContent = 'Ratings are unavailable right now';
  }

  /* The tooltip adds each level's share. The count itself is always printed at
     the end of the bar, so nothing is only readable by hovering. */
  function showTip(row, clientX) {
    if (!summary) return;

    var stars = Number(row.getAttribute('data-stars'));
    var total = summary.total || 0;
    var count = (summary.counts && summary.counts[stars - 1]) || 0;
    var share = total ? Math.round(count / total * 100) : 0;

    tip.textContent = '';
    var value = document.createElement('strong');
    value.textContent = plural(count, 'rating');
    var label = document.createElement('span');
    label.textContent = starLabel(stars) + ' · ' + share + '% of ratings';
    tip.appendChild(value);
    tip.appendChild(label);
    tip.hidden = false;

    bars.forEach(function (other) { other.classList.toggle('is-hot', other === row); });

    /* Beside the pointer (or the bar's end, for keyboard focus) and level with
       the row, so it never covers the average above or the bar being read. */
    var card = summaryCard.getBoundingClientRect();
    var rowBox = row.getBoundingClientRect();
    var fill = row.querySelector('.rv-bar__fill').getBoundingClientRect();
    var anchor = typeof clientX === 'number' ? clientX : Math.max(fill.right, fill.left + 8);
    var left = anchor - card.left + 14;
    if (left + tip.offsetWidth > card.width - 12) left = anchor - card.left - tip.offsetWidth - 14;

    tip.style.left = Math.max(12, left) + 'px';
    tip.style.top = (rowBox.top - card.top + rowBox.height / 2 - tip.offsetHeight / 2) + 'px';
  }

  function hideTip() {
    tip.hidden = true;
    bars.forEach(function (row) { row.classList.remove('is-hot'); });
  }

  bars.forEach(function (row) {
    row.addEventListener('pointermove', function (e) { showTip(row, e.clientX); });
    row.addEventListener('pointerleave', hideTip);
    row.addEventListener('focus', function () { showTip(row); });
    row.addEventListener('blur', hideTip);
  });

  /* ---------- Everyone's reviews ---------- */
  function starIcon(on) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', on ? 'rv-star is-on' : 'rv-star');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#rv-star');
    svg.appendChild(use);
    return svg;
  }

  function buildReview(review) {
    var item = document.createElement('li');
    item.className = 'rv-item';

    var head = document.createElement('div');
    head.className = 'rv-item__head';

    var stars = document.createElement('span');
    stars.className = 'rv-item__stars';
    stars.setAttribute('role', 'img');
    stars.setAttribute('aria-label', 'Rated ' + review.rating + ' out of 5');
    for (var i = 1; i <= 5; i++) stars.appendChild(starIcon(i <= review.rating));
    head.appendChild(stars);

    var written = new Date(review.createdAt);
    if (!isNaN(written.getTime())) {
      var time = document.createElement('time');
      time.className = 'rv-item__date';
      time.dateTime = review.createdAt;
      time.textContent = dates.format(written);
      head.appendChild(time);
    }

    var text = document.createElement('p');
    text.className = 'rv-item__text';
    text.textContent = review.comment;

    item.appendChild(head);
    item.appendChild(text);
    return item;
  }

  function addReview(review, atTop) {
    if (!review || !review.id || shown[review.id]) return;
    shown[review.id] = true;

    var item = buildReview(review);
    if (atTop) {
      item.classList.add('is-new');
      list.insertBefore(item, list.firstChild);
    } else {
      list.appendChild(item);
    }
    setFeedStatus('');
  }

  function setFeedStatus(message, isError) {
    feedStatus.textContent = message;
    feedStatus.classList.toggle('is-error', !!isError);
    feedStatus.hidden = !message;
  }

  function loadPage() {
    if (loading) return;
    loading = true;
    more.disabled = true;
    if (!list.firstChild) setFeedStatus('Loading reviews…');

    request('/api/reviews?page=' + nextPage + '&size=' + PAGE_SIZE)
      .then(function (data) {
        renderSummary(data.summary);
        (data.reviews || []).forEach(function (review) { addReview(review, false); });
        nextPage += 1;

        more.textContent = 'Show more reviews';
        more.hidden = !data.hasMore;
        if (!list.firstChild) setFeedStatus('No reviews yet. Be the first to rate AgriDabaw-3D!');
      })
      .catch(function () {
        summaryUnavailable();
        setFeedStatus(list.firstChild
          ? "More reviews couldn't be loaded. Please try again."
          : "Reviews couldn't be loaded right now. Please try again in a moment.", true);
        more.textContent = 'Try again';
        more.hidden = false;
      })
      .then(function () {
        loading = false;
        more.disabled = false;
      });
  }

  more.addEventListener('click', loadPage);

  /* Nothing is fetched until the section is near the screen, so a visitor who
     never scrolls this far never calls the server. */
  if ('IntersectionObserver' in window) {
    var feedObserver = new IntersectionObserver(function (entries) {
      if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
      feedObserver.disconnect();
      loadPage();
    }, { rootMargin: '600px 0px' });
    feedObserver.observe(section);
  } else {
    loadPage();
  }

  /* ---------- The form ---------- */
  function paintStars(value) {
    options.forEach(function (option, index) {
      option.classList.toggle('is-on', index < value);
    });
  }

  function showError(question, holder, message) {
    holder.textContent = message;
    holder.hidden = false;
    question.classList.add('rv-q--error');
  }

  function clearError(question, holder) {
    holder.textContent = '';
    holder.hidden = true;
    question.classList.remove('rv-q--error');
  }

  function setStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle('is-error', !!isError);
  }

  function updateCounter() {
    var used = comment.value.length;
    counter.textContent = numbers.format(used) + ' / ' + numbers.format(MAX_CHARS);
    counter.classList.toggle('is-near', used > MAX_CHARS - 50);
  }

  rate.addEventListener('change', function (e) {
    if (e.target.name !== 'rating') return;
    selected = Number(e.target.value);
    paintStars(selected);
    clearError(ratingQ, ratingError);
  });

  /* Hovering previews the rating; leaving shows the chosen one again. */
  options.forEach(function (option, index) {
    option.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse') paintStars(index + 1);
    });
  });
  rate.addEventListener('pointerleave', function () { paintStars(selected); });

  comment.addEventListener('input', function () {
    updateCounter();
    if (comment.value.trim()) {
      comment.removeAttribute('aria-invalid');
      clearError(commentQ, commentError);
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;

    var text = comment.value.trim();
    var firstProblem = null;

    if (!selected) {
      showError(ratingQ, ratingError, REQUIRED);
      firstProblem = rate.querySelector('input');
    }
    if (!text) {
      showError(commentQ, commentError, REQUIRED);
      comment.setAttribute('aria-invalid', 'true');
      firstProblem = firstProblem || comment;
    }
    if (firstProblem) {
      setStatus('');
      firstProblem.focus();
      return;
    }

    sending = true;
    submit.disabled = true;
    submit.textContent = 'Submitting…';
    setStatus('');

    request('/api/reviews', {
      rating: selected,
      comment: text,
      website: form.elements.website.value
    })
      .then(function (data) {
        renderSummary(data.summary);
        addReview(data.review, true);
        form.reset();
        selected = 0;
        paintStars(0);
        updateCounter();
        form.hidden = true;
        thanks.hidden = false;
        thanks.focus();
      })
      .catch(function (error) {
        var fields = error.fields || {};
        if (error.status === 400 && (fields.rating || fields.comment)) {
          if (fields.rating) showError(ratingQ, ratingError, fields.rating);
          if (fields.comment) showError(commentQ, commentError, fields.comment);
        } else if (error.status === 400 || error.status === 429) {
          setStatus(error.message, true);
        } else {
          setStatus('Your review could not be sent. Check your internet connection and try again.', true);
        }
      })
      .then(function () {
        sending = false;
        submit.disabled = false;
        submit.textContent = 'Submit';
      });
  });

  again.addEventListener('click', function () {
    thanks.hidden = true;
    form.hidden = false;
    setStatus('');
    var first = rate.querySelector('input');
    if (first) first.focus();
  });

  updateCounter();
})();
