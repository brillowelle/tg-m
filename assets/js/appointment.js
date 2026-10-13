(function () {
    "use strict";

    /*======================================
      Appointment Form
      ========================================*/
    // Google Apps Script web app that saves each request to the Google Sheet and emails the clinic
    const ENDPOINT = "https://script.google.com/macros/s/AKfycbzK-qOLnxlMq6S7LhlfRepqll4jQo-GCweZeWVBoTOw77gY9F162Om-VndPkCI6JjM0/exec";
    const WHATSAPP_NUMBER = "96891774829";
    const CLOSED_DAY = 6; // Saturday
    const TIMEOUT_MS = 20000;

    const card = document.querySelector(".appt-form");
    const form = document.getElementById("appointment-form");
    if (!card || !form) return;

    const msg = form.dataset;
    const status = form.querySelector(".appt-status");
    const submit = form.querySelector("[type='submit']");
    const dateInput = form.elements.date;

    // Local calendar date as YYYY-MM-DD (toISOString would shift it to UTC)
    function isoDate(date) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    }
    dateInput.min = isoDate(new Date());

    form.elements.lang.value = document.documentElement.lang || "en";
    form.elements.page.value = location.pathname.split("/").pop() || "index.html";

    function problemWith(field) {
        const value = field.value.trim();
        if (field.required && !value) return msg.msgRequired;
        if (!value) return "";
        if (field.name === "phone" && value.replace(/\D/g, "").length < 8) return msg.msgPhone;
        if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return msg.msgEmail;
        if (field.name === "date") {
            if (value < dateInput.min) return msg.msgPast;
            if (new Date(value + "T00:00:00").getDay() === CLOSED_DAY) return msg.msgClosed;
        }
        return "";
    }

    function check(field) {
        const problem = problemWith(field);
        const error = field.closest(".appt-field").querySelector(".appt-error");
        field.setAttribute("aria-invalid", problem ? "true" : "false");
        error.textContent = problem;
        return !problem;
    }

    const fields = Array.from(form.querySelectorAll(".appt-control"));
    fields.forEach(function (field) {
        field.addEventListener("blur", function () { check(field); });
        field.addEventListener("input", function () {
            if (field.getAttribute("aria-invalid") === "true") check(field);
        });
    });

    function showStatus(text, kind) {
        status.textContent = text;
        status.className = "appt-status" + (text ? " is-" + kind : "");
    }

    function setSending(sending) {
        submit.disabled = sending;
        submit.classList.toggle("is-sending", sending);
    }

    // What the visitor chose, in the page's language (the sheet receives the fixed English values)
    function shownValue(name) {
        const first = form.querySelector("[name='" + name + "']");
        if (first.type === "radio") {
            const checked = form.querySelector("[name='" + name + "']:checked");
            return checked ? checked.nextElementSibling.textContent.trim() : "";
        }
        if (first.tagName === "SELECT") return first.value ? first.options[first.selectedIndex].text.trim() : "";
        return first.value.trim();
    }

    // The same details as a WhatsApp message, each line labelled with its field's label
    function whatsappUrl() {
        const lines = [msg.waIntro];
        ["name", "phone", "email", "service", "doctor", "date", "time", "message"].forEach(function (name) {
            const value = shownValue(name);
            if (!value) return;
            const label = form.querySelector("[name='" + name + "']").closest(".appt-field").querySelector(".appt-label");
            lines.push(label.dataset.short + ": " + value);
        });
        return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
    }

    function showSuccess() {
        const url = whatsappUrl();
        card.querySelector(".appt-success__name").textContent = form.elements.name.value.trim();
        card.querySelector(".appt-success__wa").href = url;
        card.classList.add("is-sent");
        const heading = card.querySelector(".appt-success__title");
        heading.focus({ preventScroll: true });
        if (window.lenis) window.lenis.scrollTo(card);
        else card.scrollIntoView({ block: "start" });
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (submit.disabled) return;

        const invalid = fields.filter(function (field) { return !check(field); });
        if (invalid.length) {
            showStatus(msg.msgFix, "error");
            invalid[0].focus();
            return;
        }

        // Bots fill the hidden field; they get the success screen and nothing is sent
        if (form.elements.website.value) return showSuccess();

        setSending(true);
        showStatus(msg.msgSending, "info");

        const abort = new AbortController();
        const timer = setTimeout(function () { abort.abort(); }, TIMEOUT_MS);

        // A form-encoded body keeps this a "simple" cross-origin request, which Apps Script requires
        fetch(ENDPOINT, { method: "POST", body: new URLSearchParams(new FormData(form)), signal: abort.signal })
            .then(function (response) {
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.text();
            })
            .then(function (text) {
                let reply = {};
                try { reply = JSON.parse(text); } catch (error) { /* older script versions reply with plain text */ }
                if (reply.result === "error") throw new Error(reply.error || "Rejected");
                showStatus("", "");
                showSuccess();
            })
            .catch(function () {
                showStatus(msg.msgError, "error");
            })
            .finally(function () {
                clearTimeout(timer);
                setSending(false);
            });
    });

    card.querySelector(".appt-success__again").addEventListener("click", function () {
        form.reset();
        form.elements.lang.value = document.documentElement.lang || "en";
        form.elements.page.value = location.pathname.split("/").pop() || "index.html";
        fields.forEach(function (field) { field.removeAttribute("aria-invalid"); });
        card.classList.remove("is-sent");
        form.elements.name.focus();
    });
})();
