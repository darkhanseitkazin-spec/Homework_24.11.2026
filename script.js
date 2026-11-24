const STORAGE_KEY = "project-task-tracker-tasks";
const ALLOWED_STATUSES = ["В плане", "В работе", "Готово"];

const form = document.querySelector("#task-form");
const errorMessage = document.querySelector("#form-error");
const tasksList = document.querySelector("#tasks-list");
const emptyState = document.querySelector("#empty-state");
const tasksCount = document.querySelector("#tasks-count");

let tasks = loadTasks();

function loadTasks() {
  try {
    const savedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(savedTasks) ? savedTasks : [];
  } catch (error) {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatDate(date) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

function formatEstimate(estimate) {
  return `${estimate.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} ч`;
}

function getStatusClass(status) {
  if (status === "В работе") {
    return "status--progress";
  }

  if (status === "Готово") {
    return "status--done";
  }

  return "status--planned";
}

function getTasksWord(count) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "задач";
  }

  if (lastDigit === 1) {
    return "задача";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "задачи";
  }

  return "задач";
}

function createMeta(label, value) {
  const container = document.createElement("div");
  const labelElement = document.createElement("span");
  const valueElement = document.createElement("span");

  container.className = "task__meta";
  labelElement.className = "task__meta-label";
  valueElement.className = "task__meta-value";
  labelElement.textContent = label;
  valueElement.textContent = value;
  container.append(labelElement, valueElement);

  return container;
}

function createTaskElement(task) {
  const taskElement = document.createElement("article");
  const main = document.createElement("div");
  const title = document.createElement("h3");
  const project = document.createElement("span");
  const status = document.createElement("span");

  taskElement.className = "task";
  main.className = "task__main";
  title.className = "task__title";
  project.className = "task__project";
  status.className = `status ${getStatusClass(task.status)}`;

  title.textContent = task.title;
  project.textContent = task.project;
  status.textContent = task.status;

  main.append(title, project);
  taskElement.append(
    main,
    createMeta("Срок", formatDate(task.deadline)),
    createMeta("Оценка", formatEstimate(task.estimate)),
    status
  );

  return taskElement;
}

function renderTasks() {
  tasksList.replaceChildren(...tasks.map(createTaskElement));
  emptyState.hidden = tasks.length > 0;
  tasksCount.textContent = `${tasks.length} ${getTasksWord(tasks.length)}`;
}

function validateTask(task) {
  if (!task.title || !task.project || !task.deadline) {
    return "Заполните все поля.";
  }

  if (!Number.isFinite(task.estimate) || task.estimate <= 0 || task.estimate * 2 % 1 !== 0) {
    return "Оценка должна быть больше 0 и указана с шагом 0,5 часа.";
  }

  if (!ALLOWED_STATUSES.includes(task.status)) {
    return "Выберите допустимый статус задачи.";
  }

  return "";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const task = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: formData.get("title").trim(),
    project: formData.get("project").trim(),
    deadline: formData.get("deadline"),
    estimate: Number(formData.get("estimate")),
    status: formData.get("status")
  };
  const validationError = validateTask(task);

  if (validationError) {
    errorMessage.textContent = validationError;
    return;
  }

  tasks.push(task);
  saveTasks();
  renderTasks();
  form.reset();
  errorMessage.textContent = "";
  document.querySelector("#title").focus();
});

renderTasks();
