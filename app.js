(() => {
  // Cinema intro is owned by the inline script in index.html.
  // Do not clear cinema-active here — that would fight the intro while it plays.

  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const checkForm = document.querySelector("#check-form");
  const websiteInput = document.querySelector("#website");
  const checkButton = document.querySelector("#check-button");
  const checkResult = document.querySelector("#check-result");
  const checkName = document.querySelector("#check-name");
  const checkResolved = document.querySelector("#check-resolved");
  const checkPresent = document.querySelector("#check-present");
  const checkMissing = document.querySelector("#check-missing");
  const checkPresentWrap = document.querySelector("#check-present-wrap");
  const checkMissingWrap = document.querySelector("#check-missing-wrap");
  const checkScore = document.querySelector("#check-score");
  const checkScoreNum = document.querySelector("#check-score-num");
  const checkScoreLabel = document.querySelector("#check-score-label");
  const checkScoreDetail = document.querySelector("#check-score-detail");
  const checkScoreNote = document.querySelector("#check-score-note");
  const checkGap = document.querySelector("#check-gap");
  const checkMessage = document.querySelector("#check-message");
  const checkError = document.querySelector("#check-error");
  const checkStatus = document.querySelector("#check-status");
  const checkLive = document.querySelector("#check-live");
  const checkLiveLabel = document.querySelector("#check-live-label");
  const contactPraxis = document.querySelector("#contact-praxis");
  let lastCheckedUrl = "";
  let lastQuery = "";

  const germanCountWord = (n) => {
    const words = [
      "null",
      "ein",
      "zwei",
      "drei",
      "vier",
      "fünf",
      "sechs",
      "sieben",
      "acht",
      "neun",
      "zehn",
      "elf",
      "zwölf",
    ];
    return words[n] || String(n);
  };

  const gapSentence = (missingCount) => {
    if (missingCount === 0) return "Die üblichen Punkte sind da.";
    if (missingCount === 1) return "Ein üblicher Punkt fehlt.";
    const word = germanCountWord(missingCount);
    const cap = word.charAt(0).toUpperCase() + word.slice(1);
    return `${cap} übliche Punkte fehlen.`;
  };

  const setGap = (text) => {
    if (!checkGap) return;
    if (text) {
      checkGap.hidden = false;
      checkGap.textContent = text;
    } else {
      checkGap.hidden = true;
      checkGap.textContent = "";
    }
  };

  const setLiveState = (state) => {
    if (!checkLive) return;
    checkLive.dataset.state = state === "running" ? "running" : "idle";
    if (checkLiveLabel) {
      checkLiveLabel.textContent = state === "running" ? "Prüft …" : "Live";
    }
  };

  const looksLikeUrl = (value) => {
    const raw = value.trim();
    if (!raw || /\s/.test(raw)) return false;
    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw);
        return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
      } catch {
        return false;
      }
    }
    return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/:?#].*)?$/i.test(raw);
  };

  const canSubmitQuery = (value) => {
    const raw = value.trim();
    if (raw.length < 3) return false;
    return looksLikeUrl(raw) || raw.length >= 3;
  };

  const setCheckEnabled = () => {
    if (!websiteInput || !checkButton) return;
    checkButton.disabled = !canSubmitQuery(websiteInput.value) || checkButton.dataset.loading === "1";
  };

  if (websiteInput) {
    websiteInput.addEventListener("input", setCheckEnabled);
    setCheckEnabled();
  }

  const showLoading = (on, searchingName) => {
    if (checkButton) {
      checkButton.dataset.loading = on ? "1" : "0";
      checkButton.textContent = on
        ? searchingName
          ? "Suche…"
          : "Prüfe…"
        : "Praxis prüfen";
      setCheckEnabled();
    }
    setLiveState(on ? "running" : "idle");
    if (checkStatus) {
      checkStatus.hidden = !on;
      checkStatus.textContent = on
        ? searchingName
          ? "Praxis-Website wird gesucht…"
          : "Öffentliche Website wird gelesen…"
        : "";
    }
  };

  const fillList = (ul, items, miss) => {
    if (!ul) return;
    ul.replaceChildren();
    (items || []).forEach((item) => {
      const li = document.createElement("li");
      li.classList.add(miss ? "is-miss" : "is-ok");
      const strong = document.createElement("strong");
      strong.textContent = item.label;
      li.append(strong, document.createTextNode(`: ${item.value}`));
      ul.append(li);
    });
  };

  const renderCheckData = (data, fallbackName) => {
    if (checkError) {
      checkError.hidden = true;
      checkError.textContent = "";
    }

    if (checkMessage) {
      if (data.message) {
        checkMessage.hidden = false;
        checkMessage.textContent = data.message;
      } else {
        checkMessage.hidden = true;
        checkMessage.textContent = "";
      }
    }

    const hasScore = data.found !== false && typeof data.score === "number";
    if (checkScore && hasScore) {
      checkScore.hidden = false;
      if (checkScoreNum) checkScoreNum.textContent = String(data.score);
      if (checkScoreLabel) checkScoreLabel.textContent = data.scoreLabel || "Digital-Stand";
      if (checkScoreDetail) checkScoreDetail.textContent = data.scoreDetail || "";
      if (checkScoreNote) checkScoreNote.textContent = data.note || "";
      checkScore.dataset.band =
        data.score >= 70 ? "high" : data.score >= 40 ? "mid" : "low";
      const missingCount = Array.isArray(data.missing) ? data.missing.length : 0;
      setGap(gapSentence(missingCount));
    } else if (checkScore) {
      checkScore.hidden = true;
      setGap("");
    }

    if (data.found === false) {
      // Clear heading of any leftover tokens; show a clear German result title.
      if (checkName) checkName.textContent = "Keine Website gefunden";
      if (checkResolved) {
        const q = (data.query || fallbackName || "").trim();
        if (q) {
          checkResolved.hidden = false;
          checkResolved.textContent = `Gesucht: ${q}`;
        } else {
          checkResolved.hidden = true;
          checkResolved.textContent = "";
        }
      }
      setGap("");
      fillList(checkPresent, [], false);
      fillList(checkMissing, [], true);
      if (checkPresentWrap) checkPresentWrap.hidden = true;
      if (checkMissingWrap) checkMissingWrap.hidden = true;
      return;
    }

    if (checkName) checkName.textContent = fallbackName;

    if (checkResolved) {
      if (data.resolvedHost) {
        checkResolved.hidden = false;
        checkResolved.textContent =
          data.resolvedFrom === "name"
            ? `Gefundene Website: ${data.resolvedHost}`
            : `Geprüft: ${data.resolvedHost}`;
      } else {
        checkResolved.hidden = true;
        checkResolved.textContent = "";
      }
    }

    fillList(checkPresent, data.present, false);
    fillList(checkMissing, data.missing, true);
    if (checkMissingWrap) checkMissingWrap.hidden = !(data.missing && data.missing.length);
    if (checkPresentWrap) {
      const hasPresent = data.present && data.present.length;
      checkPresentWrap.hidden = !hasPresent;
      if (hasPresent) checkPresentWrap.open = false;
    }
  };

  if (checkForm) {
    checkForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const query = websiteInput?.value.trim() || "";
      if (!canSubmitQuery(query)) return;

      const asUrl = looksLikeUrl(query);
      lastQuery = query;
      showLoading(true, !asUrl);
      if (checkResult) checkResult.hidden = true;
      if (checkName) checkName.textContent = "";
      if (checkError) {
        checkError.hidden = true;
        checkError.textContent = "";
      }
      if (checkMessage) {
        checkMessage.hidden = true;
        checkMessage.textContent = "";
      }
      if (checkScore) checkScore.hidden = true;
      if (checkPresent) checkPresent.replaceChildren();
      if (checkMissing) checkMissing.replaceChildren();
      setGap("");
      if (checkResolved) {
        checkResolved.hidden = true;
        checkResolved.textContent = "";
      }

      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: query }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.ok === false) {
          throw new Error(
            (data && data.error) || "Die Prüfung ist fehlgeschlagen. Bitte später erneut versuchen."
          );
        }

        lastCheckedUrl = data.url || (asUrl ? query : "");
        const heading =
          data.query ||
          data.resolvedHost ||
          lastCheckedUrl.replace(/^https?:\/\//i, "") ||
          query;
        renderCheckData(data, heading);
        if (contactPraxis) {
          contactPraxis.value = asUrl ? contactPraxis.value : query;
          if (!contactPraxis.value && data.resolvedHost) contactPraxis.value = data.resolvedHost;
        }
        if (checkResult) {
          checkResult.hidden = false;
          checkResult.scrollIntoView({ block: "nearest" });
        }
      } catch (err) {
        if (checkName) checkName.textContent = "Prüfung fehlgeschlagen";
        if (checkScore) checkScore.hidden = true;
        setGap("");
        if (checkPresentWrap) checkPresentWrap.hidden = true;
        if (checkMissingWrap) checkMissingWrap.hidden = true;
        if (checkResolved) checkResolved.hidden = true;
        if (checkMessage) checkMessage.hidden = true;
        if (checkError) {
          checkError.hidden = false;
          checkError.textContent =
            err && err.message
              ? err.message
              : "Die Website konnte nicht geprüft werden.";
        }
        if (checkResult) {
          checkResult.hidden = false;
          checkResult.scrollIntoView({ block: "nearest" });
        }
      } finally {
        showLoading(false, false);
      }
    });
  }

  const contactForm = document.querySelector("#contact-form");
  const ready = document.querySelector("#ready");
  const formStatus = document.querySelector("#form-status");

  if (contactForm && ready) {
    const field = (name) => contactForm.querySelector(`[name="${name}"]`);
    const servicePick = contactForm.querySelector(".service-pick");
    const consentRow = contactForm.querySelector(".consent");
    const consentInput = field("consent");
    const serviceInputs = () =>
      [...contactForm.querySelectorAll('input[name="services"]')];

    const clearInvalid = (el) => el?.classList.remove("is-invalid");
    const markInvalid = (el) => el?.classList.add("is-invalid");

    const clearAllInvalid = () => {
      contactForm
        .querySelectorAll(".is-invalid")
        .forEach((el) => el.classList.remove("is-invalid"));
    };

    const validEmail = (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 120;

    const validateInquiry = () => {
      clearAllInvalid();
      if (formStatus) formStatus.textContent = "";

      const nameEl = field("name");
      const emailEl = field("email");
      const phoneEl = field("phone");
      const praxisEl = field("praxis");
      const cityEl = field("city");
      const name = String(nameEl?.value || "").trim();
      const email = String(emailEl?.value || "").trim();
      const phone = String(phoneEl?.value || "").trim();
      const praxis = String(praxisEl?.value || "").trim();
      const city = String(cityEl?.value || "").trim();
      const services = serviceInputs()
        .filter((input) => input.checked)
        .map((input) => input.value);
      const consentOn = Boolean(consentInput?.checked);

      if (name.length < 2) {
        markInvalid(nameEl);
        if (formStatus) formStatus.textContent = "Bitte Name ausfüllen.";
        nameEl?.focus();
        return null;
      }
      if (!validEmail(email)) {
        markInvalid(emailEl);
        if (formStatus) formStatus.textContent = "Bitte E-Mail ausfüllen.";
        emailEl?.focus();
        return null;
      }
      if (phone.replace(/\D/g, "").length < 6) {
        markInvalid(phoneEl);
        if (formStatus) formStatus.textContent = "Bitte Telefon ausfüllen.";
        phoneEl?.focus();
        return null;
      }
      if (praxis.length < 2) {
        markInvalid(praxisEl);
        if (formStatus) formStatus.textContent = "Bitte Praxis ausfüllen.";
        praxisEl?.focus();
        return null;
      }
      if (city.length < 2) {
        markInvalid(cityEl);
        if (formStatus) formStatus.textContent = "Bitte Ort ausfüllen.";
        cityEl?.focus();
        return null;
      }
      if (services.length < 1) {
        markInvalid(servicePick);
        if (formStatus) {
          formStatus.textContent = "Bitte mindestens eine Leistung wählen.";
        }
        serviceInputs()[0]?.focus();
        return null;
      }
      if (!consentOn) {
        markInvalid(consentRow);
        if (formStatus) formStatus.textContent = "Bitte Datenschutz bestätigen.";
        consentInput?.focus();
        return null;
      }

      // Never forward an autofilled honeypot as `company` — that made the API
      // return {ok:true} without sending mail. Server still traps direct spam
      // that posts company/douba_hp. Optional note must not block send.
      const hp = field("douba_hp");
      if (hp && hp.value) hp.value = "";

      return {
        name,
        email,
        phone,
        praxis,
        city,
        services,
        note: String(field("note")?.value || ""),
        consent: true,
        douba_hp: "",
      };
    };

    ["name", "email", "phone", "praxis", "city", "note"].forEach((name) => {
      const el = field(name);
      el?.addEventListener("input", () => {
        clearInvalid(el);
        if (formStatus) formStatus.textContent = "";
      });
    });

    serviceInputs().forEach((input) => {
      input.addEventListener("change", () => {
        if (serviceInputs().some((box) => box.checked)) {
          clearInvalid(servicePick);
          if (formStatus) formStatus.textContent = "";
        }
      });
    });

    consentInput?.addEventListener("change", () => {
      if (consentInput.checked) {
        clearInvalid(consentRow);
        if (formStatus) formStatus.textContent = "";
      }
    });

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = validateInquiry();
      if (!body) return;

      const submit = contactForm.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      if (formStatus) formStatus.textContent = "Wird gesendet …";

      try {
        const response = await fetch("/api/inquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.ok !== true) {
          if (formStatus) {
            formStatus.textContent =
              payload.error || "Die Anfrage konnte nicht gesendet werden.";
          }
          return;
        }
        contactForm.hidden = true;
        ready.hidden = false;
        if (formStatus) formStatus.textContent = "";
      } catch {
        if (formStatus) {
          formStatus.textContent =
            "Die Anfrage konnte nicht gesendet werden. Bitte noch einmal versuchen.";
        }
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }

  const approvalPhone = document.querySelector("#approval-phone");
  if (approvalPhone) {
    const post = document.querySelector("#approval-post");
    const stamp = document.querySelector("#approval-stamp");
    const note = document.querySelector("#approval-note");
    const actions = document.querySelector("#approval-actions");
    const change = document.querySelector("#approval-change");
    const changeInput = document.querySelector("#approval-change-input");
    const copy = document.querySelector("#approval-copy");
    const live = document.querySelector("#approval-live");
    const reset = document.querySelector("#approval-reset");
    const ok = document.querySelector("#approval-ok");
    const edit = document.querySelector("#approval-edit");
    const original = copy ? copy.textContent : "";

    const showLive = () => {
      if (changeInput && changeInput.value.trim() && copy) {
        copy.textContent = changeInput.value.trim();
      }
      if (stamp) {
        stamp.textContent = "Live";
        stamp.classList.add("is-live");
      }
      window.setTimeout(() => {
        post?.classList.add("is-live");
        if (note) note.hidden = true;
        if (live) {
          live.hidden = false;
          live.classList.add("is-in");
        }
        if (reset) reset.hidden = false;
      }, 280);
    };

    ok?.addEventListener("click", () => {
      if (actions) actions.hidden = true;
      if (change) change.hidden = true;
      showLive();
    });

    edit?.addEventListener("click", () => {
      if (!change) return;
      const open = change.hidden;
      change.hidden = !open;
      if (open) changeInput?.focus();
    });

    reset?.addEventListener("click", () => {
      post?.classList.remove("is-live");
      stamp?.classList.remove("is-live");
      if (stamp) stamp.textContent = "Freigabe offen";
      if (copy) copy.textContent = original;
      if (changeInput) changeInput.value = "";
      if (change) change.hidden = true;
      if (actions) actions.hidden = false;
      if (note) note.hidden = false;
      if (live) {
        live.hidden = true;
        live.classList.remove("is-in");
      }
      reset.hidden = true;
    });
  }

  const callPhone = document.querySelector("#call-phone");
  if (callPhone) {
    const incoming = document.querySelector("#call-incoming");
    const active = document.querySelector("#call-active");
    const play = document.querySelector("#call-play");
    const transcript = document.querySelector("#call-transcript");
    const stage = document.querySelector("#call-stage");
    const note = document.querySelector("#call-note");
    const reset = document.querySelector("#call-reset");
    const statusText = document.querySelector("#call-status-text");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const firstBubbleMs = 600;
    const gapMs = 2200;
    const handoffMs = 1200;
    let timers = [];
    let running = false;

    const dialogue = [
      { who: "ki", text: "Guten Tag, hier antwortet die KI der Praxis. Die Behandlung läuft gerade — worum geht es?" },
      { who: "patient", text: "Ich brauche einen Kontrolltermin." },
      { who: "ki", text: "Gern. Wie ist Ihr Name?" },
      { who: "patient", text: "Anna Berger." },
      { who: "ki", text: "Danke. Passt Ihnen Donnerstagvormittag, oder soll die Praxis zurückrufen?" },
      { who: "patient", text: "Bitte zurückrufen." },
      { who: "ki", text: "Ist notiert. Die Praxis ruft Sie zurück. Auf Wiederhören." },
    ];

    const clearTimers = () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers = [];
    };

    const later = (fn, ms) => {
      const id = window.setTimeout(fn, ms);
      timers.push(id);
      return id;
    };

    const makeBubble = (line, instant) => {
      const bubble = document.createElement("div");
      bubble.className = `call-bubble call-bubble-${line.who}${instant ? " is-in" : ""}`;
      const who = document.createElement("span");
      who.className = "call-bubble-who";
      who.textContent = line.who === "ki" ? "KI" : "Patient";
      bubble.appendChild(who);
      bubble.appendChild(document.createTextNode(line.text));
      return bubble;
    };

    const showHandoff = (instant) => {
      if (statusText) statusText.textContent = "Beendet";
      stage?.classList.add("is-handoff");
      if (note) {
        note.hidden = false;
        if (instant) {
          note.classList.add("is-in");
        } else {
          requestAnimationFrame(() => note.classList.add("is-in"));
        }
      }
      if (reset) reset.hidden = false;
      running = false;
      callPhone.dataset.state = "done";
    };

    const scrollTranscript = () => {
      if (!transcript) return;
      transcript.scrollTop = transcript.scrollHeight;
    };

    const playDialogue = () => {
      if (!transcript) return;
      transcript.innerHTML = "";
      note?.classList.remove("is-in");
      if (note) note.hidden = true;
      stage?.classList.remove("is-handoff");
      if (reset) reset.hidden = true;
      if (statusText) statusText.textContent = "KI am Apparat";
      running = true;
      callPhone.dataset.state = "active";

      if (reduceMotion) {
        dialogue.forEach((line) => transcript.appendChild(makeBubble(line, true)));
        scrollTranscript();
        showHandoff(true);
        return;
      }

      dialogue.forEach((line, index) => {
        later(() => {
          const bubble = makeBubble(line, false);
          transcript.appendChild(bubble);
          requestAnimationFrame(() => {
            bubble.classList.add("is-in");
            scrollTranscript();
          });
          if (index === dialogue.length - 1) {
            later(() => showHandoff(false), handoffMs);
          }
        }, firstBubbleMs + index * gapMs);
      });
    };

    const resetCall = () => {
      clearTimers();
      running = false;
      if (transcript) transcript.innerHTML = "";
      note?.classList.remove("is-in");
      if (note) note.hidden = true;
      stage?.classList.remove("is-handoff");
      if (reset) reset.hidden = true;
      if (active) active.hidden = true;
      if (incoming) incoming.hidden = false;
      if (statusText) statusText.textContent = "KI am Apparat";
      callPhone.dataset.state = "incoming";
    };

    play?.addEventListener("click", () => {
      if (running) return;
      clearTimers();
      if (incoming) incoming.hidden = true;
      if (active) active.hidden = false;
      playDialogue();
    });

    reset?.addEventListener("click", () => {
      resetCall();
    });
  }

  const stepsWrap = document.querySelector(".steps-wrap");
  if (stepsWrap) {
    const fill = stepsWrap.querySelector(".steps-guide-fill");
    const pct = stepsWrap.querySelector(".steps-guide-pct");
    const name = stepsWrap.querySelector(".steps-guide-name");
    const labels = ["Ablauf", "Prüfen", "Vorschlagen", "Freigeben", "Umsetzen"];
    const setStep = (n) => {
      const step = Math.max(0, Math.min(4, n));
      stepsWrap.dataset.step = String(step);
      const value = step * 25;
      if (fill) fill.style.width = `${value}%`;
      if (pct) pct.textContent = `${value}%`;
      if (name) name.textContent = labels[step];
    };
    stepsWrap.querySelectorAll(".steps li").forEach((item, index) => {
      const step = index + 1;
      item.addEventListener("mouseenter", () => setStep(step));
      item.addEventListener("focusin", () => setStep(step));
    });
    stepsWrap.addEventListener("mouseleave", () => setStep(0));
  }
})();
