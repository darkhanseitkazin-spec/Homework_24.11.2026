const STORAGE_KEY = "project-task-tracker-tasks";
const CONTRACTS_STORAGE_KEY = "project-task-tracker-contracts";
const ALLOWED_STATUSES = ["В плане", "В работе", "Готово"];

const form = document.querySelector("#task-form");
const errorMessage = document.querySelector("#form-error");
const contractForm = document.querySelector("#contract-form");
const contractFormError = document.querySelector("#contract-form-error");
const contractSelect = document.querySelector("#contract");
const contractsList = document.querySelector("#contracts-list");
const contractsEmptyState = document.querySelector("#contracts-empty-state");
const tasksList = document.querySelector("#tasks-list");
const emptyState = document.querySelector("#empty-state");
const tasksCount = document.querySelector("#tasks-count");
const projectSummaries = document.querySelector("#project-summaries");
const summariesEmptyState = document.querySelector("#summaries-empty-state");

let tasks = loadTasks();
let contracts = loadContracts();

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

function loadContracts() {
  try {
    const savedContracts = JSON.parse(localStorage.getItem(CONTRACTS_STORAGE_KEY));
    return Array.isArray(savedContracts) ? savedContracts : [];
  } catch (error) {
    return [];
  }
}

function saveContracts() {
  localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(contracts));
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
  const deleteButton = document.createElement("button");
  const contract = contracts.find((item) => item.id === task.contractId);

  taskElement.className = "task";
  main.className = "task__main";
  title.className = "task__title";
  project.className = "task__project";
  status.className = `status ${getStatusClass(task.status)}`;
  deleteButton.className = "task__delete";
  deleteButton.type = "button";

  title.textContent = task.title;
  project.textContent = task.project;
  status.textContent = task.status;
  deleteButton.textContent = "Удалить";
  deleteButton.setAttribute("aria-label", `Удалить задачу «${task.title}»`);
  deleteButton.addEventListener("click", () => deleteTask(task.id));

  main.append(title, project);
  taskElement.append(
    main,
    createMeta("Срок", formatDate(task.deadline)),
    createMeta("Оценка", formatEstimate(task.estimate)),
    createMeta("Контракт", contract ? contract.name : "Без контракта"),
    status,
    deleteButton
  );

  return taskElement;
}

function getContractHours(contractId) {
  return tasks.reduce((total, task) => {
    return task.contractId === contractId ? total + task.estimate : total;
  }, 0);
}

function createContractElement(contract) {
  const contractElement = document.createElement("article");
  const title = document.createElement("h3");
  const metrics = document.createElement("dl");
  const taskHours = getContractHours(contract.id);
  const remainingHours = contract.limit - taskHours;

  contractElement.className = "contract";
  title.className = "contract__title";
  metrics.className = "contract__metrics";
  title.textContent = contract.name;
  metrics.append(
    createSummaryMetric("Лимит", formatEstimate(contract.limit)),
    createSummaryMetric("В задачах", formatEstimate(taskHours)),
    createSummaryMetric(
      remainingHours >= 0 ? "Осталось" : "Превышение",
      formatEstimate(Math.abs(remainingHours))
    )
  );
  contractElement.append(title, metrics);

  return contractElement;
}

function renderContractOptions() {
  const selectedContractId = contractSelect.value;
  const emptyOption = document.createElement("option");

  emptyOption.value = "";
  emptyOption.textContent = "Без контракта";
  contractSelect.replaceChildren(emptyOption);

  contracts.forEach((contract) => {
    const option = document.createElement("option");
    option.value = contract.id;
    option.textContent = contract.name;
    contractSelect.append(option);
  });

  if (contracts.some((contract) => contract.id === selectedContractId)) {
    contractSelect.value = selectedContractId;
  }
}

function renderContracts() {
  contractsList.replaceChildren(...contracts.map(createContractElement));
  contractsEmptyState.hidden = contracts.length > 0;
  renderContractOptions();
}

function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks();
  renderTasks();
}

function getProjectSummaries() {
  const summaries = new Map();

  tasks.forEach((task) => {
    const summary = summaries.get(task.project) || {
      project: task.project,
      tasksCount: 0,
      totalHours: 0,
      doneHours: 0,
      remainingHours: 0
    };

    summary.tasksCount += 1;
    summary.totalHours += task.estimate;

    if (task.status === "Готово") {
      summary.doneHours += task.estimate;
    } else {
      summary.remainingHours += task.estimate;
    }

    summaries.set(task.project, summary);
  });

  return [...summaries.values()];
}

function createSummaryMetric(label, value) {
  const metric = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");

  metric.className = "summary__metric";
  term.className = "summary__label";
  description.className = "summary__value";
  term.textContent = label;
  description.textContent = value;
  metric.append(term, description);

  return metric;
}

function createProjectSummaryElement(summary) {
  const summaryElement = document.createElement("article");
  const title = document.createElement("h3");
  const metrics = document.createElement("dl");

  summaryElement.className = "summary";
  title.className = "summary__title";
  metrics.className = "summary__metrics";
  title.textContent = summary.project;
  metrics.append(
    createSummaryMetric("Задачи", `${summary.tasksCount} ${getTasksWord(summary.tasksCount)}`),
    createSummaryMetric("Всего", formatEstimate(summary.totalHours)),
    createSummaryMetric("Готово", formatEstimate(summary.doneHours)),
    createSummaryMetric("Осталось", formatEstimate(summary.remainingHours))
  );
  summaryElement.append(title, metrics);

  return summaryElement;
}

function renderProjectSummaries() {
  const summaries = getProjectSummaries();

  projectSummaries.replaceChildren(...summaries.map(createProjectSummaryElement));
  summariesEmptyState.hidden = summaries.length > 0;
}

function renderTasks() {
  tasksList.replaceChildren(...tasks.map(createTaskElement));
  emptyState.hidden = tasks.length > 0;
  tasksCount.textContent = `${tasks.length} ${getTasksWord(tasks.length)}`;
  renderContracts();
  renderProjectSummaries();
}

function validateContract(contract) {
  if (!contract.name) {
    return "Введите название контракта.";
  }

  if (!Number.isFinite(contract.limit) || contract.limit <= 0 || contract.limit * 2 % 1 !== 0) {
    return "Лимит должен быть больше 0 и указан с шагом 0,5 часа.";
  }

  return "";
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

  if (task.contractId && !contracts.some((contract) => contract.id === task.contractId)) {
    return "Выберите существующий контракт.";
  }

  return "";
}

contractForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(contractForm);
  const contract = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: formData.get("name").trim(),
    limit: Number(formData.get("limit"))
  };
  const validationError = validateContract(contract);

  if (validationError) {
    contractFormError.textContent = validationError;
    return;
  }

  contracts.push(contract);
  saveContracts();
  renderContracts();
  contractForm.reset();
  contractFormError.textContent = "";
  document.querySelector("#contract-name").focus();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const task = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: formData.get("title").trim(),
    project: formData.get("project").trim(),
    deadline: formData.get("deadline"),
    estimate: Number(formData.get("estimate")),
    status: formData.get("status"),
    contractId: formData.get("contract") || null
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
