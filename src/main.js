import "./style.css";
import { fetchResults, insertResult, supabaseConfigured } from "./supabase.js";

const WORDS = [
  ["Tummaträ", "tumstock"],
  ["Slabbeposse", "soppåse"],
  ["Knudemos", "potatismos"],
  ["Karkluda", "disktrasa"],
  ["Blannevann", "groggvirke"],
  ["Rabbemos", "rotmos"],
  ["Smöramad", "smörgås"],
  ["Bullerfjös", "stor och klumpig"],
  ["Vrövla", "prata strunt"],
  ["Galenratta", "ragata"],
  ["Pära", "potatis"],
  ["Lua/Lubba", "springa"],
  ["Hubba daj", "flytta dig"],
  ["Traderöv", "tråkmåns"],
  ["Glytt", "litet barn"],
  ["Pågasnöre", "snorvalp"],
  ["Flabb", "mun"],
  ["Ramsvenne", "icke skåning"],
  ["Dabba", "klanta sig"],
  ["Sjåpa sig", "göra sig till"],
  ["Fjant", "larvig person"],
  ["Ålahue", "idiot/dumskalle"],
  ["Grobakont", "dike"],
  ["Fubbick", "idiot"],
  ["Fesmase", "storväxt"],
  ["Rullebör", "skottkärra"],
  ["Hialös", "stirrig"],
  ["Jidder", "tjafs"],
  ["Klydderöv", "klumpig/klantig"],
  ["Fesjunken", "ljummen"],
  ["Dofsing", "vacker kvinna"],
  ["Alika", "stupfull"],
].map(([word, meaning]) => ({ word, meaning }));

const TOTAL_QUESTIONS = 16;
const STORAGE_KEY = "skanequiz-results";
const app = document.querySelector("#app");
let game = null;

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
const results = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveResults = (items) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
const formatTime = (milliseconds) =>
  `${(milliseconds / 1000).toFixed(1).replace(".", ",")} s`;

async function getResults() {
  if (!supabaseConfigured) return results();
  return fetchResults();
}

function renderStart() {
  app.innerHTML = `
    <section class="shell start-screen">
      <div class="panel">
        <div class="brand-mark">Skåne<span>quiz</span></div>
        <p class="eyebrow">Ett test i skånsk tungomål</p>
        <h1>Hur skånsk<br />är du egentligen?</h1>
        <p class="intro">16 ord. 4 svar. Ett försök.<br />Visa vad du går för.</p>
        <form id="start-form" class="start-form">
          <label for="player-name">Ditt för- och efternamn</label>
          <input id="player-name" name="name" autocomplete="name" placeholder="Till exempel Anna Andersson" required minlength="2" />
          <button class="primary-button" type="submit" disabled>Starta quizet <span aria-hidden="true">↗</span></button>
        </form>
        <button class="text-button" id="leaderboard-button" type="button">Se topplistan <span aria-hidden="true">↓</span></button>
        <p class="note">${supabaseConfigured ? "Resultat delas på den gemensamma topplistan." : "Resultat sparas lokalt tills Supabase är anslutet."}</p>
      </div>
    </section>
  `;
  document.querySelector("#start-form").addEventListener("submit", (event) => {
    event.preventDefault();
    startGame(new FormData(event.currentTarget).get("name").trim());
  });
  document.querySelector("#player-name").addEventListener("input", (event) => {
    event.currentTarget.form.querySelector(".primary-button").disabled =
      event.currentTarget.value.trim().length === 0;
  });
  document
    .querySelector("#leaderboard-button")
    .addEventListener("click", renderLeaderboard);
}

function startGame(name) {
  game = {
    name,
    questions: shuffle(WORDS).slice(0, TOTAL_QUESTIONS),
    current: 0,
    score: 0,
    answers: [],
    startedAt: performance.now(),
    locked: false,
  };
  renderQuestion();
}

function renderQuestion() {
  const question = game.questions[game.current];
  const distractors = shuffle(
    WORDS.filter((item) => item.meaning !== question.meaning),
  )
    .slice(0, 3)
    .map((item) => item.meaning);
  const choices = shuffle([question.meaning, ...distractors]);
  game.locked = false;
  app.innerHTML = `
    <section class="shell quiz-screen">
      <div class="panel">
        <header class="quiz-header"><div class="brand-mark small">Skåne<span>quiz</span></div><div class="progress-label">Fråga ${String(game.current + 1).padStart(2, "0")} <span>/ ${TOTAL_QUESTIONS}</span></div><strong class="score-label">${game.score} rätt hittills</strong></header>
        <div class="progress-track" aria-label="Fråga ${game.current + 1} av ${TOTAL_QUESTIONS}">${Array.from({ length: TOTAL_QUESTIONS }, (_, index) => `<span class="progress-segment ${game.answers[index] === true ? "correct" : game.answers[index] === false ? "wrong" : index === game.current ? "active" : ""}"></span>`).join("")}</div>
        <div class="question-meta"><span>Vad betyder ordet?</span></div>
        <h1 class="word">${question.word}</h1>
        <p class="question-prompt">Välj det rätta svaret.</p>
        <div class="answers" role="group" aria-label="Svarsalternativ">
          ${choices.map((choice, index) => `<button class="answer-button" data-choice="${choice}" type="button"><span>${String.fromCharCode(65 + index)}</span>${choice}</button>`).join("")}
        </div>
        <p class="locked-message" id="locked-message">Svaret låses direkt när du väljer.</p>
      </div>
    </section>
  `;
  game.timer = window.setInterval(() => {
    game.elapsed = performance.now() - game.startedAt;
  }, 100);
  document
    .querySelectorAll(".answer-button")
    .forEach((button) =>
      button.addEventListener("click", () => chooseAnswer(button, question)),
    );
}

function chooseAnswer(button, question) {
  if (game.locked) return;
  game.locked = true;
  window.clearInterval(game.timer);
  const correct = button.dataset.choice === question.meaning;
  game.answers[game.current] = correct;
  if (correct) game.score += 1;
  button.classList.add(correct ? "correct" : "wrong");
  if (!correct)
    document
      .querySelector(`[data-choice="${CSS.escape(question.meaning)}"]`)
      ?.classList.add("correct");
  document.querySelectorAll(".answer-button").forEach((item) => {
    item.disabled = true;
  });
  const message = document.querySelector("#locked-message");
  message.textContent = correct
    ? "Rätt! Nästa fråga kommer strax."
    : `Rätt svar: ${question.meaning}`;
  message.classList.add(correct ? "success" : "error");
  window.setTimeout(() => {
    game.current += 1;
    if (game.current === TOTAL_QUESTIONS) renderResult();
    else renderQuestion();
  }, 850);
}

async function renderResult() {
  const elapsed = performance.now() - game.startedAt;
  const entry = {
    name: game.name,
    score: game.score,
    time: elapsed,
    createdAt: Date.now(),
  };
  const allResults = [
    ...results().filter(
      (item) => item.name.toLowerCase() !== entry.name.toLowerCase(),
    ),
    entry,
  ].sort((a, b) => b.score - a.score || a.time - b.time);
  saveResults(allResults);
  let saveError = "";
  try {
    await insertResult(entry);
  } catch (error) {
    console.error("Could not save Supabase result", error);
    saveError = "Resultatet kunde inte sparas på den gemensamma topplistan.";
  }
  app.innerHTML = `
    <section class="shell result-screen">
      <div class="panel">
        <div class="brand-mark small">Skåne<span>quiz</span></div>
        <p class="eyebrow">Quizet är klart</p>
        <h1>Snyggt spelat,<br />${game.name.split(" ")[0]}.</h1>
        <div class="score-block"><strong>${game.score}<span>/${TOTAL_QUESTIONS}</span></strong><small>rätt svar</small></div>
        <div class="time-row"><span>Din tid</span><strong>${formatTime(elapsed)}</strong></div>
        ${saveError ? `<p class="save-error">${saveError}</p>` : ""}
        <div class="result-actions"><button class="primary-button" id="play-again" type="button">Spela igen <span aria-hidden="true">↗</span></button><button class="secondary-button" id="see-board" type="button">Se topplistan</button></div>
      </div>
    </section>
  `;
  document
    .querySelector("#play-again")
    .addEventListener("click", () => startGame(game.name));
  document
    .querySelector("#see-board")
    .addEventListener("click", renderLeaderboard);
}

async function renderLeaderboard() {
  let board;
  let loadError = "";
  try {
    board = await getResults();
  } catch (error) {
    console.error("Could not load Supabase results", error);
    board = [];
    loadError =
      "Topplistan kunde inte hämtas från Supabase. Kontrollera att supabase/schema.sql är körd i SQL Editor.";
  }
  app.innerHTML = `
    <section class="shell leaderboard-screen">
      <div class="panel">
        <button class="back-button" id="back" type="button">← <span>Till start</span></button>
        <div class="brand-mark small">Skåne<span>quiz</span></div>
        <p class="eyebrow">Hittills på festen</p><h1>Topplistan</h1>
        ${loadError ? `<p class="empty-board error">${loadError}</p>` : board.length ? `<div class="leaderboard">${board.map((item, index) => `<div class="leader-row ${index === 0 ? "first" : ""}"><span class="rank">${String(index + 1).padStart(2, "0")}</span><strong>${item.name}</strong><span class="points">${item.score}/${TOTAL_QUESTIONS}</span><span class="result-time">${formatTime(item.time)}</span></div>`).join("")}</div>` : '<p class="empty-board">Ingen har spelat än. Bli först på listan.</p>'}
        <button class="primary-button" id="start-from-board" type="button">Starta quizet <span aria-hidden="true">↗</span></button>
      </div>
    </section>
  `;
  document.querySelector("#back").addEventListener("click", renderStart);
  document
    .querySelector("#start-from-board")
    .addEventListener("click", renderStart);
}

renderStart();
