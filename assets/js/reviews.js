/* AgriDabaw-3D — ratings and reviews
   Reads the ratings, the survey answers and the players' comments from the
   game's server and posts a new response from the form. Text from the server
   is always inserted with textContent, never as HTML. */
(function () {
  'use strict';

  var section = document.getElementById('reviews');
  if (!section || !window.fetch) return;

  var PAGE_SIZE = 10;
  var MAX_CHARS = 1000;
  var REQUIRED = 'This is a required question';
  var OTHER_REQUIRED = 'Please write your answer beside Other';
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* A preview opened on this computer can talk to a test server, for example
     index.html?api=http://127.0.0.1:8099. Only on localhost, so a shared link
     can never send a visitor's review anywhere else. */
  var api = (section.getAttribute('data-api') || '').replace(/\/+$/, '');
  if (['localhost', '127.0.0.1', '[::1]'].indexOf(location.hostname) !== -1) {
    var override = new URLSearchParams(location.search).get('api');
    if (override && /^https?:\/\//i.test(override)) api = override.replace(/\/+$/, '');
  }

  var form = document.getElementById('rvForm');
  var nameInput = document.getElementById('rvName');
  var nameQ = document.getElementById('rvNameQ');
  var nameError = document.getElementById('rvNameError');
  var ratingQ = document.getElementById('rvRatingQ');
  var ratingError = document.getElementById('rvRatingError');
  var comment = document.getElementById('rvComment');
  var commentQ = document.getElementById('rvCommentQ');
  var commentError = document.getElementById('rvCommentError');
  var featuresQ = document.getElementById('rvFeaturesQ');
  var featuresError = document.getElementById('rvFeaturesError');
  var webRatingQ = document.getElementById('rvWebRatingQ');
  var webRatingError = document.getElementById('rvWebRatingError');
  var hardestQ = document.getElementById('rvHardestQ');
  var hardestError = document.getElementById('rvHardestError');
  var change = document.getElementById('rvChange');
  var changeQ = document.getElementById('rvChangeQ');
  var changeError = document.getElementById('rvChangeError');
  var submit = document.getElementById('rvSubmit');
  var status = document.getElementById('rvStatus');
  var thanks = document.getElementById('rvThanks');
  var again = document.getElementById('rvAgain');

  var feedStatus = document.getElementById('rvFeedStatus');
  var list = document.getElementById('rvList');
  var more = document.getElementById('rvMore');

  var numbers = new Intl.NumberFormat('en-PH');
  var dates = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

  var sending = false;
  var loading = false;
  var nextPage = 0;
  var shown = {};

  function toArray(nodes) {
    return Array.prototype.slice.call(nodes);
  }

  function plural(count, word) {
    return numbers.format(count) + ' ' + word + (count === 1 ? '' : 's');
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

  /* ---------- A 1 to 5 rating: the average, then one bar per level ---------- */
  function starChart(card) {
    var average = card.querySelector('.rv-score__n');
    var avgStars = card.querySelector('.rv-avgstars');
    var totalLine = card.querySelector('.rv-score__count');
    var bars = toArray(card.querySelectorAll('.rv-bar'));
    var tip = card.querySelector('.rv-tip');
    var data = null;

    function levelName(row) {
      var stars = Number(row.getAttribute('data-stars'));
      var word = row.getAttribute('data-word') || '';
      return /^stars?$/.test(word) ? stars + ' ' + word : stars + ' — ' + word;
    }

    function render(next) {
      if (!next) return;
      data = next;

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

    function unavailable() {
      if (!data) totalLine.textContent = 'Ratings are unavailable right now';
    }

    /* The tooltip adds each level's share. The count itself is always printed
       at the end of the bar, so nothing is only readable by hovering. */
    function showTip(row, clientX) {
      if (!data) return;

      var stars = Number(row.getAttribute('data-stars'));
      var total = data.total || 0;
      var count = (data.counts && data.counts[stars - 1]) || 0;
      var share = total ? Math.round(count / total * 100) : 0;

      tip.textContent = '';
      var value = document.createElement('strong');
      value.textContent = plural(count, 'rating');
      var label = document.createElement('span');
      label.textContent = levelName(row) + ' · ' + share + '% of ratings';
      tip.appendChild(value);
      tip.appendChild(label);
      tip.hidden = false;

      bars.forEach(function (other) { other.classList.toggle('is-hot', other === row); });

      /* Beside the pointer (or the bar's end, for keyboard focus) and level
         with the row, so it never covers the average or the bar being read. */
      var box = card.getBoundingClientRect();
      var rowBox = row.getBoundingClientRect();
      var fill = row.querySelector('.rv-bar__fill').getBoundingClientRect();
      var anchor = typeof clientX === 'number' ? clientX : Math.max(fill.right, fill.left + 8);
      var left = anchor - box.left + 14;
      if (left + tip.offsetWidth > box.width - 12) left = anchor - box.left - tip.offsetWidth - 14;

      tip.style.left = Math.max(12, left) + 'px';
      tip.style.top = (rowBox.top - box.top + rowBox.height / 2 - tip.offsetHeight / 2) + 'px';
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

    return { render: render, unavailable: unavailable };
  }

  /* ---------- A choose-all-that-apply question: one bar per choice ---------- */
  /* The choices and their labels are read from the form's own checkboxes, so
     the chart can never list something the form does not ask. A bar's length
     is the share of the people who answered the question that ticked it. */
  function choiceChart(card, boxes) {
    var meta = card.querySelector('.rv-chart__meta');
    var bars = card.querySelector('.rv-hbars');
    var others = card.querySelector('.rv-others');
    var othersTitle = others.querySelector('summary');
    var othersList = others.querySelector('ul');
    var answered = false;

    var rows = boxes.map(function (box, index) {
      var item = document.createElement('li');
      item.className = 'rv-hbar';

      var label = document.createElement('span');
      label.className = 'rv-hbar__label';
      label.textContent = box.getAttribute('data-label') ||
        box.parentNode.textContent.replace(/:\s*$/, '').trim();

      var value = document.createElement('span');
      value.className = 'rv-hbar__value';
      value.textContent = '0';

      var track = document.createElement('span');
      track.className = 'rv-hbar__track';
      track.setAttribute('aria-hidden', 'true');
      var fill = document.createElement('span');
      fill.className = 'rv-hbar__fill';
      track.appendChild(fill);

      item.appendChild(label);
      item.appendChild(value);
      item.appendChild(track);
      bars.appendChild(item);

      return { code: box.value, index: index, item: item, value: value, fill: fill, count: 0 };
    });

    function render(next) {
      if (!next) return;
      answered = true;

      var responses = next.responses || 0;
      meta.textContent = responses
        ? plural(responses, 'response') + ' · most chosen first'
        : 'No answers yet';

      rows.forEach(function (row) { row.count = (next.counts && next.counts[row.code]) || 0; });
      rows.slice()
        .sort(function (a, b) { return b.count - a.count || a.index - b.index; })
        .forEach(function (row) {
          var share = responses ? Math.round(row.count / responses * 100) : 0;
          row.fill.style.width = (responses ? Math.min(100, row.count / responses * 100) : 0) + '%';
          row.value.textContent = responses
            ? numbers.format(row.count) + ' · ' + share + '%'
            : numbers.format(row.count);
          bars.appendChild(row.item);
        });

      var written = next.others || [];
      othersList.textContent = '';
      written.forEach(function (text) {
        var line = document.createElement('li');
        line.textContent = text;
        othersList.appendChild(line);
      });
      othersTitle.textContent = 'Other answers (' + numbers.format(written.length) + ')';
      others.hidden = !written.length;
    }

    function unavailable() {
      if (!answered) meta.textContent = 'Answers are unavailable right now';
    }

    return { render: render, unavailable: unavailable };
  }

  var ratingChart = starChart(document.getElementById('rvRatingChart'));
  var websiteChart = starChart(document.getElementById('rvWebsiteChart'));
  var featuresChart = choiceChart(document.getElementById('rvFeaturesChart'),
    toArray(form.querySelectorAll('input[name="features"]')));
  var hardestChart = choiceChart(document.getElementById('rvHardestChart'),
    toArray(form.querySelectorAll('input[name="hardestSections"]')));

  function renderCharts(data) {
    ratingChart.render(data.summary);

    /* A server from before the survey questions sends no survey block. */
    if (data.survey) {
      featuresChart.render(data.survey.features);
      websiteChart.render(data.survey.website);
      hardestChart.render(data.survey.hardestSections);
    } else {
      chartsUnavailable();
    }
  }

  function chartsUnavailable() {
    ratingChart.unavailable();
    websiteChart.unavailable();
    featuresChart.unavailable();
    hardestChart.unavailable();
  }

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

    /* Reviews sent before names were asked for have none. */
    var who = document.createElement('div');
    who.className = 'rv-item__who';

    var name = document.createElement('span');
    name.className = review.name ? 'rv-item__name' : 'rv-item__name is-anon';
    name.textContent = review.name || 'Anonymous';
    who.appendChild(name);

    var stars = document.createElement('span');
    stars.className = 'rv-item__stars';
    stars.setAttribute('role', 'img');
    stars.setAttribute('aria-label', 'Rated ' + review.rating + ' out of 5');
    for (var i = 1; i <= 5; i++) stars.appendChild(starIcon(i <= review.rating));
    who.appendChild(stars);
    head.appendChild(who);

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

    /* Only reviews sent since the website questions were added have this. */
    if (review.websiteChange) {
      var extra = document.createElement('p');
      extra.className = 'rv-item__extra';
      var lead = document.createElement('strong');
      lead.textContent = 'About the website: ';
      extra.appendChild(lead);
      extra.appendChild(document.createTextNode(review.websiteChange));
      item.appendChild(extra);
    }

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
        renderCharts(data);
        (data.reviews || []).forEach(function (review) { addReview(review, false); });
        nextPage += 1;

        more.textContent = 'Show more reviews';
        more.hidden = !data.hasMore;
        if (!list.firstChild) setFeedStatus('No reviews yet. Be the first to rate AgriDabaw-3D!');
      })
      .catch(function () {
        chartsUnavailable();
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

  /* A row of five stars to pick from. */
  function starInput(rate, question, holder) {
    var options = toArray(rate.querySelectorAll('.rv-rate__opt'));
    var selected = 0;

    function paint(value) {
      options.forEach(function (option, index) {
        option.classList.toggle('is-on', index < value);
      });
    }

    rate.addEventListener('change', function (e) {
      if (e.target.type !== 'radio') return;
      selected = Number(e.target.value);
      paint(selected);
      clearError(question, holder);
    });

    /* Hovering previews the rating; leaving shows the chosen one again. */
    options.forEach(function (option, index) {
      option.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'mouse') paint(index + 1);
      });
    });
    rate.addEventListener('pointerleave', function () { paint(selected); });

    return {
      value: function () { return selected; },
      first: function () { return rate.querySelector('input'); },
      reset: function () { selected = 0; paint(0); }
    };
  }

  /* A list of checkboxes whose last choice is "Other" with a line to write
     on. `alone`, when given, is a choice that cannot be combined with the
     rest ("None"), so ticking it clears the others and the other way round. */
  function checkGroup(holder, question, error, otherBox, otherText, alone) {
    var boxes = toArray(holder.querySelectorAll('input[type="checkbox"]'));

    function chosen() {
      return boxes.filter(function (box) { return box.checked; })
        .map(function (box) { return box.value; });
    }

    holder.addEventListener('change', function (e) {
      var box = e.target;
      if (box.type !== 'checkbox') return;

      if (alone && box.checked) {
        boxes.forEach(function (other) {
          if (other !== box && (box.value === alone || other.value === alone)) other.checked = false;
        });
      }
      if (!otherBox.checked) otherText.removeAttribute('aria-invalid');
      if (box === otherBox && box.checked) otherText.focus();
      if (chosen().length) clearError(question, error);
    });

    /* Writing an answer is as good as ticking the box beside it. */
    otherText.addEventListener('input', function () {
      if (!otherText.value.trim()) return;

      if (!otherBox.checked) {
        otherBox.checked = true;
        if (alone) {
          boxes.forEach(function (other) { if (other.value === alone) other.checked = false; });
        }
      }
      otherText.removeAttribute('aria-invalid');
      clearError(question, error);
    });

    return {
      chosen: chosen,
      other: function () { return otherBox.checked ? otherText.value.trim() : ''; },
      /* Returns the field to send the visitor back to, or null when fine. */
      check: function () {
        if (!chosen().length) {
          showError(question, error, REQUIRED);
          return boxes[0];
        }
        if (otherBox.checked && !otherText.value.trim()) {
          showError(question, error, OTHER_REQUIRED);
          otherText.setAttribute('aria-invalid', 'true');
          return otherText;
        }
        return null;
      }
    };
  }

  /* A long answer with a "used / allowed" counter under it. */
  function longAnswer(field, question, error, counter) {
    function update() {
      var used = field.value.length;
      counter.textContent = numbers.format(used) + ' / ' + numbers.format(MAX_CHARS);
      counter.classList.toggle('is-near', used > MAX_CHARS - 50);
    }

    field.addEventListener('input', function () {
      update();
      if (field.value.trim()) {
        field.removeAttribute('aria-invalid');
        clearError(question, error);
      }
    });

    update();
    return {
      value: function () { return field.value.trim(); },
      update: update,
      check: function () {
        if (field.value.trim()) return null;
        showError(question, error, REQUIRED);
        field.setAttribute('aria-invalid', 'true');
        return field;
      }
    };
  }

  var rating = starInput(document.getElementById('rvRate'), ratingQ, ratingError);
  var webRating = starInput(document.getElementById('rvWebRate'), webRatingQ, webRatingError);
  var features = checkGroup(document.getElementById('rvFeatures'), featuresQ, featuresError,
    document.getElementById('rvFeaturesOtherBox'), document.getElementById('rvFeaturesOther'), null);
  var hardest = checkGroup(document.getElementById('rvHardest'), hardestQ, hardestError,
    document.getElementById('rvHardestOtherBox'), document.getElementById('rvHardestOther'), 'NONE');
  var commentAnswer = longAnswer(comment, commentQ, commentError, document.getElementById('rvCounter'));
  var changeAnswer = longAnswer(change, changeQ, changeError, document.getElementById('rvChangeCounter'));

  nameInput.addEventListener('input', function () {
    if (nameInput.value.trim()) {
      nameInput.removeAttribute('aria-invalid');
      clearError(nameQ, nameError);
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;

    var who = nameInput.value.trim();
    var problems = [];

    if (!who) {
      showError(nameQ, nameError, REQUIRED);
      nameInput.setAttribute('aria-invalid', 'true');
      problems.push(nameInput);
    }
    if (!rating.value()) {
      showError(ratingQ, ratingError, REQUIRED);
      problems.push(rating.first());
    }
    problems.push(commentAnswer.check());
    problems.push(features.check());
    if (!webRating.value()) {
      showError(webRatingQ, webRatingError, REQUIRED);
      problems.push(webRating.first());
    }
    problems.push(hardest.check());
    problems.push(changeAnswer.check());

    /* The questions are checked top to bottom, so the first problem found is
       the one highest on the page. */
    var firstProblem = problems.filter(Boolean)[0];
    if (firstProblem) {
      setStatus('Some questions still need an answer.', true);
      firstProblem.focus();
      return;
    }

    sending = true;
    submit.disabled = true;
    submit.textContent = 'Submitting…';
    setStatus('');

    request('/api/reviews', {
      name: who,
      rating: rating.value(),
      comment: commentAnswer.value(),
      features: features.chosen(),
      featuresOther: features.other(),
      websiteRating: webRating.value(),
      hardestSections: hardest.chosen(),
      hardestOther: hardest.other(),
      websiteChange: changeAnswer.value(),
      website: form.elements.website.value
    })
      .then(function (data) {
        renderCharts(data);
        addReview(data.review, true);
        form.reset();
        rating.reset();
        webRating.reset();
        commentAnswer.update();
        changeAnswer.update();
        form.hidden = true;
        thanks.hidden = false;
        thanks.focus();
      })
      .catch(function (error) {
        var fields = error.fields || {};
        var known = false;

        [
          ['name', nameQ, nameError],
          ['rating', ratingQ, ratingError],
          ['comment', commentQ, commentError],
          ['features', featuresQ, featuresError],
          ['featuresOther', featuresQ, featuresError],
          ['websiteRating', webRatingQ, webRatingError],
          ['hardestSections', hardestQ, hardestError],
          ['hardestOther', hardestQ, hardestError],
          ['websiteChange', changeQ, changeError]
        ].forEach(function (entry) {
          if (!fields[entry[0]]) return;
          showError(entry[1], entry[2], fields[entry[0]]);
          known = true;
        });

        if (error.status === 400 && known) {
          setStatus('Some questions still need an answer.', true);
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

  /* The reminder under the button goes once every marked question is answered. */
  function clearReminder() {
    if (!sending && !form.querySelector('.rv-q--error')) setStatus('');
  }
  form.addEventListener('input', clearReminder);
  form.addEventListener('change', clearReminder);

  again.addEventListener('click', function () {
    thanks.hidden = true;
    form.hidden = false;
    setStatus('');
    nameInput.focus();
  });
})();
