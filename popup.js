document.addEventListener('DOMContentLoaded', function () {
  const categoryView = document.getElementById('category-view');
  const tabs = document.querySelectorAll('.tab');
  let currentCategory = "Food"; // Default category
  const buttonsContainer = document.getElementById('buttons');
  const addExpenseButton = document.getElementById('add-expense');
  const setBudgetButton = document.getElementById('set-budget');
  const resetButton = document.getElementById('reset');
  const clearExpensesButton = document.getElementById('clear-expenses'); 
  
  document.getElementById("set-period").addEventListener("click", function() {
    let period = document.getElementById("budget-period").value;
    let startDate = new Date();
    let nextResetDate = new Date(startDate);
  
    if (period === "Weekly") nextResetDate.setDate(startDate.getDate() + 7);
    if (period === "Bi-Weekly") nextResetDate.setDate(startDate.getDate() + 14);
    if (period === "Monthly") nextResetDate.setMonth(startDate.getMonth() + 1);
  
    chrome.storage.local.set({
        budgetPeriod: period,
        startDate: startDate.toISOString(),
        nextResetDate: nextResetDate.toISOString()
    }, function() {
        alert(`Budget period set to ${period}. Next reset on ${nextResetDate.toDateString()}`);
    });
  });
  
  function checkAndResetBudgetPeriod() {
    chrome.storage.local.get(["nextResetDate"], function(data) {
        let today = new Date().toISOString(); 
        if (data.nextResetDate && today >= data.nextResetDate) {
            resetAllBudgetsAndExpenses(); 
            alert("Your budget period has ended. Resetting all expenses and budgets.");
        }
    });
}

  function updateCategoryView(category) {
    chrome.storage.local.get({ expenses: {}, budgets: {} }, function (data) {
      categoryView.innerHTML = `<h2>${category}</h2>`;
      
      if (category === "Overall") {
        buttonsContainer.style.display = 'none';
        let overallSpent = 0;
        let overallBudget = 0;
        let categoryBreakdown = document.createElement('div');

        for (let cat in data.expenses) {
          let categorySpent = data.expenses[cat].reduce((sum, exp) => sum + exp.amount, 0);
          overallSpent += categorySpent;
          
          let categoryText = document.createElement('p');
          categoryText.textContent = `${cat}: $${categorySpent} spent`;
          categoryBreakdown.appendChild(categoryText);
        }
        
        for (let cat in data.budgets) {
          overallBudget += data.budgets[cat] || 0;
        }

        let percentageOverall = overallBudget > 0 ? (overallSpent / overallBudget) * 100 : 0;
        let progressBarOverall = createProgressBar(percentageOverall);
        
        categoryView.appendChild(progressBarOverall);
        let budgetDiv = document.createElement('div');
        budgetDiv.textContent = `Overall Budget Max: $${overallBudget}`;
        categoryView.appendChild(budgetDiv);
        categoryView.appendChild(categoryBreakdown);
      } else {
        buttonsContainer.style.display = 'block';
        let totalSpent = data.expenses[category]?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
        let budgetMax = data.budgets[category] || 0;
        
        let percentage = budgetMax > 0 ? (totalSpent / budgetMax) * 100 : 0;
        let progressBar = createProgressBar(percentage);
        
        categoryView.appendChild(progressBar);
        let budgetDiv = document.createElement('div');
        budgetDiv.textContent = `Budget Max: $${budgetMax}`;
        budgetDiv.classList.add('budget-max');
        categoryView.appendChild(budgetDiv);

        let expensesDiv = document.createElement('div');
        expensesDiv.classList.add('expenses-list');
        
        data.expenses[category]?.forEach((exp, index) => {
          let expItem = document.createElement('div');
          expItem.classList.add('expense-item');
          expItem.innerHTML = `<span class="expense-text">- ${exp.name}: $${exp.amount}</span>`;

          let editBtn = document.createElement('button');
          editBtn.textContent = 'Edit';
          editBtn.classList.add('edit-expense');
          editBtn.onclick = () => editExpense(category, index);

          let deleteBtn = document.createElement('button');
          deleteBtn.textContent = 'Delete';
          deleteBtn.classList.add('delete-expense');
          deleteBtn.onclick = () => deleteExpense(category, index);

          expItem.appendChild(editBtn);
          expItem.appendChild(deleteBtn);
          expensesDiv.appendChild(expItem);
        });

        categoryView.appendChild(expensesDiv);
      }
    });
  }

  function createProgressBar(percentage) {
    let progressBar = document.createElement('div');
    progressBar.classList.add('progress-container');
    let progressFill = document.createElement('div');
    progressFill.classList.add('progress-fill');
    progressFill.style.width = `${Math.min(percentage, 100)}%`;

    let messageDiv = document.createElement('div');
    messageDiv.classList.add('budget-message');

    if (percentage <= 60) {
      progressFill.style.background = "#28a745";
      messageDiv.textContent = "Great job budgeting!";
      messageDiv.style.color = "#28a745";
    } else if (percentage > 60 && percentage <= 80) {
      progressFill.style.background = "#ffc107";
      messageDiv.textContent = "Caution: Keep an eye on the budget";
      messageDiv.style.color = "#ffc107";
    } else if (percentage > 80 && percentage <= 95) {
      progressFill.style.background = "#fd7e14";
      messageDiv.textContent = "Getting close to the end here";
      messageDiv.style.color = "#fd7e14";
    } else {
      progressFill.style.background = "#dc3545";
      messageDiv.textContent = "ERROR: No more spending! Your budget is falling apart";
      messageDiv.style.color = "#dc3545";
    }

    progressBar.appendChild(progressFill);
    progressBar.appendChild(messageDiv);
    return progressBar;
  }

  function editExpense(category, index) {
    chrome.storage.local.get({ expenses: {} }, function (data) {
      let expenses = data.expenses[category];
      let expense = expenses[index];

      let updatedValue = prompt(`Edit expense (format: name:amount)`, `${expense.name}:${expense.amount}`);
      if (updatedValue) {
        let [newName, newAmount] = updatedValue.split(':');
        newAmount = parseFloat(newAmount);

        if (!isNaN(newAmount) && newAmount > 0) {
          expenses[index] = { name: newName.trim(), amount: newAmount };
          chrome.storage.local.set({ expenses: data.expenses }, function () {
            updateCategoryView(currentCategory);
            if (currentCategory !== "Overall") {
              updateCategoryView("Overall");
            }
          });
        } else {
          alert("Invalid input. Please enter in the format: name:amount");
        }
      }
    });
  }

  function deleteExpense(category, index) {
    chrome.storage.local.get({ expenses: {} }, function (data) {
      data.expenses[category].splice(index, 1);
      chrome.storage.local.set({ expenses: data.expenses }, function () {
        updateCategoryView(currentCategory);
        if (currentCategory !== "Overall") {
          updateCategoryView("Overall");
        }
      });
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', function () {
      currentCategory = this.dataset.category;
      updateCategoryView(currentCategory);
    });
  });

  updateCategoryView(currentCategory);

  // Add Expense Button
addExpenseButton.addEventListener('click', function () {
    let expenseInput = prompt('Enter expense (format: name:amount)');
    if (expenseInput) {
      let [name, amount] = expenseInput.split(':');
      amount = parseFloat(amount);
  
      if (!isNaN(amount) && amount > 0) {
        chrome.storage.local.get({ expenses: {} }, function (data) {
          let expenses = data.expenses;
          if (!expenses[currentCategory]) {
            expenses[currentCategory] = [];
          }
          expenses[currentCategory].push({ name: name.trim(), amount });
          chrome.storage.local.set({ expenses }, function () {
            updateCategoryView(currentCategory);
            if (currentCategory !== "Overall") {
              updateCategoryView("Overall");
            }
          });
        });
      } else {
        alert("Invalid input. Use format: name:amount");
      }
    }
  });
  
  // Set Budget Max Button
  setBudgetButton.addEventListener('click', function () {
    let budgetInput = prompt(`Set max budget for ${currentCategory}`);
    let budgetMax = parseFloat(budgetInput);
  
    if (!isNaN(budgetMax) && budgetMax > 0) {
      chrome.storage.local.get({ budgets: {} }, function (data) {
        let budgets = data.budgets;
        budgets[currentCategory] = budgetMax;
        
        chrome.storage.local.set({ budgets }, function () {
          updateCategoryView(currentCategory);
          if (currentCategory !== "Overall") {
            updateCategoryView("Overall");
          }
        });
      });
    } else {
      alert("Please enter a valid number.");
    }
  });
  
  function resetAllBudgetsAndExpenses() {
    chrome.storage.local.set({ expenses: {}, budgets: {} }, function () {
        chrome.storage.local.get(["budgetPeriod"], function(data) {
            let newStartDate = new Date();
            let newResetDate = new Date(newStartDate);
            
            if (data.budgetPeriod === "Weekly") newResetDate.setDate(newStartDate.getDate() + 7);
            if (data.budgetPeriod === "Bi-Weekly") newResetDate.setDate(newStartDate.getDate() + 14);
            if (data.budgetPeriod === "Monthly") newResetDate.setMonth(newStartDate.getMonth() + 1);

            chrome.storage.local.set({
                startDate: newStartDate.toISOString(),
                nextResetDate: newResetDate.toISOString()
            }, function() {
                updateCategoryView("Overall");
            });
        });
    });
}

checkAndResetBudgetPeriod();

});
