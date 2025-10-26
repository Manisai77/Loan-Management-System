let users = [];
let loans = [];
let userIdCounter = 1;
let loanCounter = 101; 
let currentRole = null; 
let currentUserId = null; 
let currentUserEmail = null; 
let currentView = null; 


function calculateCreditScore(reportedScore, loanAmount, annualIncome) {
    const weightScore = 0.7; 
    const weightIncome = 0.2; 
    const weightAmount = 0.1; 

    
    const incomeFactor = Math.min(1, annualIncome / 1000000); 
    const scoreFromIncome = 300 + (incomeFactor * 550); 

    const amountFactor = Math.min(1, loanAmount / 1000000); 
    const scoreFromAmount = 850 - (amountFactor * 200); 

    let adjustedScore = (reportedScore * weightScore) + 
                        (scoreFromIncome * weightIncome) + 
                        (scoreFromAmount * weightAmount);

    adjustedScore = Math.max(300, Math.min(850, adjustedScore));

    return Math.round(adjustedScore);
}


function adjustInterestRate(baseRate, adjustedScore) {
    let rateAdjustment = 0; 

    if (adjustedScore >= 750) {
        rateAdjustment = -1.5; 
    } else if (adjustedScore >= 700) {
         rateAdjustment = -0.5;
    } else if (adjustedScore < 600) {
        rateAdjustment = +1.5;
    } else if (adjustedScore < 650) {
         rateAdjustment = +0.5;
    }
    
    const finalRate = baseRate + rateAdjustment;
    return Math.max(1, Math.min(50, parseFloat(finalRate.toFixed(2))));
}



function calculateEMI(P, R, n) {

    if (n === 0 || P === 0 || R < 0) return { emi: 0, totalRepayment: 0, totalInterest: 0 };
    
    const r = (R / 100) / 12;
    let EMI;

    if (r === 0) {
        EMI = P / n;
    } else {
        const powerFactor = Math.pow((1 + r), n);
        EMI = P * r * powerFactor / (powerFactor - 1);
    }
    
    const roundedEMI = parseFloat(EMI.toFixed(2));
    const totalRepayment = roundedEMI * n;
    const totalInterest = totalRepayment - P;
    
    return {
        emi: roundedEMI,
        totalRepayment: totalRepayment,
        totalInterest: totalInterest
    };
}


function calculateAmortizationSchedule(P, R, n, EMI) {
    const monthlyRate = (R / 100) / 12; 
    let balance = P;
    const schedule = [];

    for (let month = 1; month <= n; month++) {
        let interestPayment = balance * monthlyRate;
        let principalPayment = EMI - interestPayment;

        if (month === n) {
            principalPayment = balance;
            interestPayment = EMI - principalPayment; 
            if (interestPayment < 0) interestPayment = 0; 
        }

        balance -= principalPayment;
        
        if (month === n) {
             balance = 0; 
        } else if (balance < 0) {
            balance = 0;
        }

        schedule.push({
            month: month,
            principal: principalPayment,
            interest: interestPayment,
            balance: balance,
            emi: EMI
        });
    }
    return schedule;
}

function getNextDueDate(loan) {
    if (loan.status !== 'Approved') return 'N/A';
    
    let baseDate = new Date(); 
    
    if (loan.transactionLedger && loan.transactionLedger.length > 0) {
        const lastPaymentEntry = loan.transactionLedger.filter(t => t.flow === 'CREDIT').pop();
        if (lastPaymentEntry) {
            const lastPaymentDate = new Date(lastPaymentEntry.date);
            baseDate = lastPaymentDate;
        }
    }
    
    const nextMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 10);
    
    return nextMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(number) {
    const num = parseFloat(number);
    if (isNaN(num)) return '₹0.00';
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function showMessage(message, type) {
    const container = document.getElementById('messageContainer');
    const colorMap = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    const bgColor = colorMap[type] || 'bg-gray-500';

    const messageBox = document.createElement('div');
    messageBox.className = `p-4 mb-2 rounded-lg text-white font-semibold shadow-xl ${bgColor} transform transition-transform duration-300 translate-x-0`;
    messageBox.textContent = message;

    container.appendChild(messageBox);

    setTimeout(() => {
        messageBox.classList.add('translate-x-full', 'opacity-0');
        messageBox.addEventListener('transitionend', () => messageBox.remove());
    }, 3000);
}

function showView(viewId) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registrationScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.add('hidden');

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
    }
}

function changeView(viewName) {
    currentView = viewName;
    
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.add('hidden');
    });

    const targetPanel = document.getElementById(viewName);
    if (targetPanel) {
        targetPanel.classList.remove('hidden');
    }

    document.querySelectorAll('#navButtons button').forEach(button => {
        button.classList.remove('nav-active');
        if (button.getAttribute('data-view') === viewName) {
            button.classList.add('nav-active');
        }
    });

    if (currentRole === 'user') {
        if (viewName === 'user-dashboard') renderUserDashboardKPIs();
        if (viewName === 'user-loans') renderLoans('loanListUser');
        // 'user-apply' is just the form, no extra rendering needed, but ensure live calc works
        if (viewName === 'user-apply') updateLiveCalculation();
    } else if (currentRole === 'admin') {
        if (viewName === 'admin-dashboard') renderAdminDashboardKPIs();
        if (viewName === 'admin-users') renderAdminUserApprovals();
        if (viewName === 'admin-loans') renderLoans('loanList');
    }
}


function registerUser(event) {
    event.preventDefault();

    const form = event.target;
    const email = form.regEmail.value.trim();
    const password = form.regPassword.value;

    if (users.some(u => u.email === email)) {
        showMessage('Registration failed. An account with this email already exists.', 'error');
        return;
    }

    const newUser = {
        id: userIdCounter++,
        email: email,
        password: password, 
        role: 'user',
        status: 'Pending' 
    };

    users.push(newUser);
    showMessage(`Account created for ${email}. Awaiting admin approval.`, 'info');
    form.reset();
    showView('loginScreen'); 
}

function approveUser(id) {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex !== -1 && users[userIndex].status === 'Pending') {
        users[userIndex].status = 'Approved';
        showMessage(`User ${users[userIndex].email} account approved!`, 'success');
        renderAdminUserApprovals(); 
    }
}


function rejectUser(id) {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex !== -1 && users[userIndex].status === 'Pending') {
        users[userIndex].status = 'Rejected';
        showMessage(`User ${users[userIndex].email} account rejected.`, 'error');
        renderAdminUserApprovals();
    }
}


function renderNavButtons() {
    const navButtonsContainer = document.getElementById('navButtons');
    navButtonsContainer.innerHTML = '';
    
    const buttonClass = "bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-150 text-sm";
    
    if (currentRole === 'user') {
        navButtonsContainer.innerHTML = `
            <button class="${buttonClass}" data-view="user-dashboard" onclick="changeView('user-dashboard')">Dashboard</button>
            <button class="${buttonClass}" data-view="user-apply" onclick="changeView('user-apply')">Loan Application</button>
            <button class="${buttonClass}" data-view="user-loans" onclick="changeView('user-loans')">My Loan Applications</button>
        `;
        changeView('user-dashboard');
    } else if (currentRole === 'admin') {
         navButtonsContainer.innerHTML = `
            <button class="${buttonClass}" data-view="admin-dashboard" onclick="changeView('admin-dashboard')">Dashboard</button>
            <button class="${buttonClass}" data-view="admin-users" onclick="changeView('admin-users')">User Management</button>
            <button class="${buttonClass}" data-view="admin-loans" onclick="changeView('admin-loans')">Loan Register</button>
        `;
        changeView('admin-dashboard');
    }
}

function handleLogin(event, role) {
    event.preventDefault();

    let email, password;
    const form = event.target; 

    email = form.querySelector('input[type="email"]').value;
    password = form.querySelector('input[type="password"]').value;

    currentRole = null;
    currentUserId = null;
    currentUserEmail = null;

    if (role === 'admin') {
        if (email === 'admin@gmail.com' && password === 'secureadmin') {
            currentRole = 'admin';
            currentUserId = 0; 
            currentUserEmail = email;
        }
    } else {
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            if (user.status === 'Approved') {
                currentRole = 'user';
                currentUserId = user.id;
                currentUserEmail = user.email;
            } else if (user.status === 'Pending') {
                showMessage('Login denied. Your account is still awaiting administrator approval.', 'error');
                return;
            } else if (user.status === 'Rejected') {
                showMessage('Login denied. Your account application was rejected.', 'error');
                return;
            }
        }
    }

    if (currentRole) {
        showMessage(`Login successful! Logged in as ${currentRole}.`, 'success');
        showView('mainApp');
        document.getElementById('roleIndicator').textContent = `Logged in as: ${currentUserEmail} (${currentRole.toUpperCase()})`;
        
        renderNavButtons(); 
    } else {
        showMessage('Login failed. Check your credentials.', 'error');
    }
}

function logout() {
    currentRole = null;
    currentUserId = null;
    currentUserEmail = null;
    
    document.querySelectorAll('#loanListUser, #loanList, #userApprovalList').forEach(el => {
        if(el) el.innerHTML = '';
    });
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));
    
    showMessage('You have been logged out.', 'info');
    showView('loginScreen');
}

function renderUserDashboardKPIs() {
    if (currentRole !== 'user' || !currentUserId) return;

    const userLoans = loans.filter(loan => loan.userId === currentUserId);
    
    const totalApplied = userLoans.length;
    const approvedLoans = userLoans.filter(l => l.status === 'Approved' || l.status === 'Paid').length;
    
    let totalLoanAmount = 0;
    let pendingLoans = 0;
    userLoans.forEach(l => {
        if (l.status === 'Approved' || l.status === 'Paid') {
            totalLoanAmount += l.amount;
        } else if (l.status === 'Pending') {
            pendingLoans++;
        }
    });
    
    let nextEMIAmount = 0;
    const approvedLoan = userLoans.find(l => l.status === 'Approved');
    if (approvedLoan) {
        nextEMIAmount = parseFloat(approvedLoan.monthlyRepayment);
    }
    
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 10); 
    const nextDueDate = nextMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const dashboardHtml = `
        <div class="p-3 bg-gray-50 rounded-lg">
            <p class="text-xs font-medium text-gray-500">Total Applied</p>
            <p class="text-xl font-bold text-gray-800">${totalApplied}</p>
        </div>
         <div class="p-3 bg-green-50 rounded-lg border border-green-200">
            <p class="text-xs font-medium text-green-700">Approved Loans</p>
            <p class="text-xl font-bold text-green-600">${approvedLoans}</p>
        </div>
         <div class="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p class="text-xs font-medium text-orange-700">Pending Applications</p>
            <p class="text-xl font-bold text-orange-600">${pendingLoans}</p>
        </div>
         <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p class="text-xs font-medium text-blue-700">Next EMI Due</p>
            <p class="text-xl font-bold text-blue-600">
                ${nextEMIAmount > 0 ? formatCurrency(nextEMIAmount) : 'N/A'}
                <span class="text-sm font-normal text-gray-600 block">${nextEMIAmount > 0 ? `due ${nextDueDate}` : ''}</span>
            </p>
        </div>
    `;
    const userDashboardView = document.getElementById('userDashboardView');
    if (userDashboardView) userDashboardView.querySelector('.grid').innerHTML = dashboardHtml;
}

function renderAdminDashboardKPIs() {
    if (currentRole !== 'admin') return;

    const totalUsers = users.length;
    const pendingUsers = users.filter(u => u.status === 'Pending').length;
    const totalLoans = loans.length;
    const approvedLoanValue = loans
        .filter(l => l.status === 'Approved' || l.status === 'Paid')
        .reduce((sum, loan) => sum + loan.amount, 0);

     const dashboardHtml = `
        <div class="p-3 bg-gray-50 rounded-lg">
            <p class="text-xs font-medium text-gray-500">Total Users</p>
            <p class="text-xl font-bold text-gray-800">${totalUsers}</p>
        </div>
        <div class="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p class="text-xs font-medium text-orange-700">Pending Users</p>
            <p class="text-xl font-bold text-orange-600">${pendingUsers}</p>
        </div>
        <div class="p-3 bg-blue-50 rounded-lg">
            <p class="text-xs font-medium text-gray-500">Total Loans</p>
            <p class="text-xl font-bold text-blue-800">${totalLoans}</p>
        </div>
        <div class="p-3 bg-green-50 rounded-lg border border-green-200">
            <p class="text-xs font-medium text-green-700">Approved Loan Value</p>
            <p class="text-xl font-bold text-green-600">${formatCurrency(approvedLoanValue)}</p>
        </div>
    `;
    const adminDashboardView = document.getElementById('adminDashboardView');
    if (adminDashboardView) adminDashboardView.querySelector('.grid').innerHTML = dashboardHtml;
}

function renderAdminUserApprovals() {
    if (currentRole !== 'admin') return;
    
    const userListContainer = document.getElementById('userApprovalList');
    if (!userListContainer) return;

    userListContainer.innerHTML = ''; 

    const usersAwaitingApproval = users.filter(u => u.status === 'Pending');

    if (usersAwaitingApproval.length === 0) {
        userListContainer.innerHTML = `<p id="noPendingUsers" class="text-gray-500 text-center py-5 bg-white rounded-xl shadow-md">No pending users awaiting approval.</p>`;
    } else {
        usersAwaitingApproval.forEach(user => {
            const userCard = `
                <div class="bg-gray-50 p-4 rounded-xl shadow-md border-l-4 border-orange-500 flex justify-between items-center">
                    <div>
                        <p class="font-bold text-gray-800">${user.email}</p>
                        <span class="text-sm text-orange-600">Status: Pending</span>
                    </div>
                    <div class="space-x-2">
                        <button onclick="approveUser(${user.id})" class="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg text-sm transition shadow-md">Approve</button>
                        <button onclick="rejectUser(${user.id})" class="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-sm transition shadow-md">Reject</button>
                    </div>
                </div>
            `;
            userListContainer.innerHTML += userCard;
        });
    }
}


function updateLiveCalculation() {
    const form = document.getElementById('loanForm');
    if (!form) return; 
    
    const amount = parseFloat(form.loanAmount.value);
    const term = parseInt(form.loanTermMonths.value, 10);
    const baseRate = parseFloat(form.interestRate.value);
    const reportedScore = parseInt(form.creditScore.value, 10);
    const annualIncome = parseFloat(form.annualIncome.value);


    const liveEMI = document.getElementById('liveEMI');
    const liveTotalRepayment = document.getElementById('liveTotalRepayment');
    const liveTotalInterest = document.getElementById('liveTotalInterest');
    const finalRateDisplay = document.getElementById('finalRateDisplay');
    
    if (amount > 0 && term > 0 && baseRate > 0 && reportedScore >= 300 && reportedScore <= 850 && annualIncome > 0) {
        
        const adjustedScore = calculateCreditScore(reportedScore, amount, annualIncome);

        const finalRate = adjustInterestRate(baseRate, adjustedScore);

        const { emi, totalRepayment, totalInterest } = calculateEMI(amount, finalRate, term);
        
        liveEMI.textContent = formatCurrency(emi);
        liveTotalRepayment.textContent = formatCurrency(totalRepayment);
        liveTotalInterest.textContent = formatCurrency(totalInterest);
        
        finalRateDisplay.textContent = `(Rate: ${finalRate.toFixed(2)}% | Adj. Score: ${adjustedScore})`;

        document.getElementById('liveCalculationOutput').classList.remove('opacity-50');
    } else {
        liveEMI.textContent = '₹0.00';
        liveTotalRepayment.textContent = '₹0.00';
        liveTotalInterest.textContent = '₹0.00';
        finalRateDisplay.textContent = `(Rate: ${baseRate.toFixed(1)}%)`;
        document.getElementById('liveCalculationOutput').classList.add('opacity-50');
    }
}

function addLoan(event) {
    event.preventDefault();

    if (!currentUserId) {
        showMessage("You must be logged in to submit a loan application.", 'error');
        return;
    }

    const form = event.target;
    const amount = parseFloat(form.loanAmount.value);
    const term = parseInt(form.loanTermMonths.value, 10);
    const baseRate = parseFloat(form.interestRate.value);
    const reportedScore = parseInt(form.creditScore.value, 10);
    const annualIncome = parseFloat(form.annualIncome.value);
    
    const userEmail = users.find(u => u.id === currentUserId)?.email || 'Admin Application';

    if (isNaN(amount) || isNaN(term) || amount <= 0 || term <= 0 || isNaN(baseRate) || baseRate <= 0 || isNaN(reportedScore) || reportedScore < 300 || reportedScore > 850 || isNaN(annualIncome) || annualIncome <= 0) {
        showMessage("Invalid input values. Please check all required fields.", 'error');
        return;
    }
    
    const adjustedScore = calculateCreditScore(reportedScore, amount, annualIncome);
    const finalRate = adjustInterestRate(baseRate, adjustedScore);

    const { emi, totalRepayment, totalInterest } = calculateEMI(amount, finalRate, term);

    const newLoan = {
        id: loanCounter++,
        userId: currentUserId, 
        applicant: userEmail,
        amount: amount,
        termMonths: term,
        baseInterestRate: baseRate, 
        interestRate: finalRate, 
        creditScore: reportedScore,
        systemAdjustedScore: adjustedScore, 
        annualIncome: annualIncome, 
        monthlyRepayment: emi, 
        totalRepayment: totalRepayment, 
        totalInterest: totalInterest, 
        totalPaid: 0, 
        remainingAmount: totalRepayment, 
        penaltyAmount: 0, 
        transactionLedger: [], 
        status: 'Pending', 
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        penaltyDays: 0 
    };

    loans.push(newLoan);
    changeView('user-loans');
    
    showMessage(`Application submitted for ${userEmail}. Final Rate: ${finalRate.toFixed(2)}%. EMI: ${formatCurrency(emi)}.`, 'success');

    form.reset();
    form.interestRate.value = 10.0;
    updateLiveCalculation(); 
}

function addPenalty(loanId) {
    if (currentRole !== 'admin') {
        showMessage('Access Denied: Only administrators can add penalties.', 'error');
        return;
    }
    
    const loan = loans.find(l => l.id === loanId);
    if (!loan || loan.status !== 'Approved') {
        showMessage('Penalty can only be applied to Approved loans.', 'error');
        return;
    }

    const penaltyFine = 100.00; 
    
    loan.penaltyDays += 30;
    loan.penaltyAmount += penaltyFine; 
    
    loan.remainingAmount += penaltyFine;

     loan.transactionLedger.push({
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        amount: parseFloat(penaltyFine.toFixed(2)),
        type: 'Penalty',
        flow: 'DEBIT' 
    });
    
    showMessage(`Penalty of ${formatCurrency(penaltyFine)} added to Loan ${loan.id}. New remaining balance: ${formatCurrency(loan.remainingAmount)}.`, 'error');
    
    renderLoans('loanList');
    toggleRepaymentDetails(loanId, true); 
}

function addRefund(loanId) {
     if (currentRole !== 'admin') {
        showMessage('Access Denied: Only administrators can process refunds.', 'error');
        return;
    }

    const loan = loans.find(l => l.id === loanId);
    if (!loan || (loan.status !== 'Approved' && loan.status !== 'Paid')) {
        showMessage('Refund can only be applied to Approved or Paid loans.', 'error');
        return;
    }

    const refundAmount = 50.00; 

    loan.remainingAmount -= refundAmount;
    
     loan.transactionLedger.push({
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        amount: parseFloat(refundAmount.toFixed(2)),
        type: 'Refund',
        flow: 'CREDIT' 
    });
    
    showMessage(`Refund of ${formatCurrency(refundAmount)} applied to Loan ${loan.id}. New remaining balance: ${formatCurrency(loan.remainingAmount)}.`, 'info');
    
    renderLoans('loanList');
    toggleRepaymentDetails(loanId, true); 
}



function approveLoan(id) {
    const loanIndex = loans.findIndex(l => l.id === id);
    if (loanIndex !== -1 && loans[loanIndex].status === 'Pending') {
        loans[loanIndex].status = 'Approved';
        showMessage(`Loan for ${loans[loanIndex].applicant} has been APPROVED!`, 'success');
        renderLoans('loanList'); 
    }
}


function rejectLoan(id) {
    const loanIndex = loans.findIndex(l => l.id === id);
    if (loanIndex !== -1 && loans[loanIndex].status === 'Pending') {
        loans[loanIndex].status = 'Rejected';
        showMessage(`Loan for ${loans[loanIndex].applicant} has been REJECTED.`, 'error');
        renderLoans('loanList'); 
    }
}


function recordPayment(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan || loan.status !== 'Approved') {
        showMessage('Cannot record payment for a non-approved loan.', 'error');
        return;
    }

    const paymentAmountInput = document.getElementById(`paymentAmount-${loanId}`);
    const paymentTypeInput = document.getElementById(`paymentType-${loanId}`);

    const paymentAmount = parseFloat(paymentAmountInput.value);
    const paymentType = paymentTypeInput ? paymentTypeInput.value : 'EMI';

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        showMessage('Please enter a valid payment amount.', 'error');
        return;
    }
    
    if (loan.remainingAmount - paymentAmount < -0.01) {
        showMessage('Payment amount exceeds remaining balance.', 'error');
        return;
    }

    loan.totalPaid = loan.totalPaid + paymentAmount;
    
    loan.remainingAmount = parseFloat((loan.totalRepayment + loan.penaltyAmount - loan.totalPaid).toFixed(2));
    
     loan.transactionLedger.push({
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        amount: parseFloat(paymentAmount.toFixed(2)),
        type: paymentType,
        flow: 'CREDIT' 
    });

    if (loan.remainingAmount <= 0.01) {
        loan.remainingAmount = 0;
        loan.status = 'Paid';
        showMessage(`Loan ${loan.id} fully paid!`, 'success');
    }

    showMessage(`${paymentType} payment of ${formatCurrency(paymentAmount)} recorded for Loan ${loan.id}.`, 'success');

    paymentAmountInput.value = '';
    
    if (currentRole === 'admin') {
        renderLoans('loanList');
    } else {
        renderLoans('loanListUser');
    }
    
    toggleRepaymentDetails(loanId, true); 
}


function generateLoanReport(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) {
        showMessage('Loan not found.', 'error');
        return;
    }

    const schedule = calculateAmortizationSchedule(loan.amount, loan.interestRate, loan.termMonths, loan.monthlyRepayment);
    
    let scheduleTable = `
| Month | EMI (₹) | Principal (₹) | Interest (₹) | Remaining Balance (₹) |
|---|---|---|---|---|
`;
    schedule.forEach(p => {
        scheduleTable += `| ${p.month} | ${formatCurrency(p.emi)} | ${formatCurrency(p.principal)} | ${formatCurrency(p.interest)} | ${formatCurrency(p.balance)} |\n`;
    });


    let ledgerTable = `
| Date | Type | Amount (₹) | Flow |
|---|---|---|---|
`;
    if (loan.transactionLedger.length === 0) {
        ledgerTable = "\n*(No transactions recorded yet.)*";
    } else {
        loan.transactionLedger.forEach(t => {
            const flowSign = t.flow === 'CREDIT' ? '+' : '-';
            const amountDisplay = formatCurrency(t.amount);
            ledgerTable += `| ${t.date} | ${t.type} | ${amountDisplay} | ${t.flow} |\n`;
        });
    }


    const reportContent = `
# Loan Report - ${loan.applicant} (ID: ${loan.id})

## A. Customer Details
* **Applicant:** ${loan.applicant} (${currentUserEmail})
* **Initial Credit Score (Reported):** ${loan.creditScore}
* **System Adjusted Score:** ${loan.systemAdjustedScore}
* **Annual Income:** ${formatCurrency(loan.annualIncome)}

---

## B. Loan Details
* **Principal Amount:** ${formatCurrency(loan.amount)}
* **Loan Term:** ${loan.termMonths} Months
* **Final Annual Interest Rate:** ${loan.interestRate.toFixed(2)}%
* **Loan Status:** **${loan.status.toUpperCase()}**
* **Application Date:** ${loan.date}

### Financial Summary
| Metric | Amount |
|---|---|
| Monthly EMI | **${formatCurrency(loan.monthlyRepayment)}** |
| Total Repayment (P + I) | ${formatCurrency(loan.totalRepayment)} |
| Total Interest Payable | ${formatCurrency(loan.totalInterest)} |
| Total Penalties Added | ${formatCurrency(loan.penaltyAmount)} |

---

## C. Repayment Status and Transaction Ledger
* **Total Paid to Date:** ${formatCurrency(loan.totalPaid)}
* **Remaining Balance (Incl. Penalties):** **${formatCurrency(loan.remainingAmount)}**
* **Next Due Date (Simulated):** ${getNextDueDate(loan)}

### Transaction Ledger
${ledgerTable}

---

## D. EMI Amortization Schedule

*(This table shows the breakdown of each monthly EMI payment into Principal and Interest components)*

${scheduleTable}
        `;

    showReportModal(`Loan Report: ${loan.applicant} (ID: ${loan.id})`, reportContent);
}


function showReportModal(title, content) {
    document.getElementById('reportModalTitle').textContent = title;
    document.getElementById('reportModalContent').innerHTML = `
        <div class="prose max-w-none">
            <pre class="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">${content}</pre>
        </div>
    `;
    document.getElementById('reportModal').classList.remove('hidden');
}


function closeReportModal() {
    document.getElementById('reportModal').classList.add('hidden');
    document.getElementById('reportModalContent').innerHTML = '';
}

function toggleRepaymentDetails(loanId, forceOpen = false) {
    const detailsPanel = document.getElementById(`repaymentDetails-${loanId}`);
    if (detailsPanel) {
        if (forceOpen || detailsPanel.classList.contains('hidden')) {
            detailsPanel.classList.remove('hidden');
        } else {
            detailsPanel.classList.add('hidden');
        }
    }
}


function renderLoans(containerId) {
    const listContainer = document.getElementById(containerId);
    
    if (!listContainer) {
        console.error(`Loan list container with ID '${containerId}' not found.`);
        return;
    }
    
    listContainer.innerHTML = ''; 

    let loansToRender = [];
    if (containerId === 'loanList') { 
        loansToRender = loans; 
    } else if (containerId === 'loanListUser') { 
        loansToRender = loans.filter(loan => loan.userId === currentUserId);
    } else {
        loansToRender = []; 
    }

    if (loansToRender.length === 0) {
        listContainer.innerHTML = `
            <p class="text-gray-500 text-center py-10 bg-white rounded-xl shadow-md">
                No loan applications found.
            </p>`;
        return;
    }

    loansToRender.forEach(loan => {
        let statusClass = 'bg-gray-100 text-gray-800 border-gray-500';
        let loanActions = '';
        
        if (loan.status === 'Approved') {
            statusClass = 'bg-green-100 text-green-800 border-green-500';
        } else if (loan.status === 'Rejected') {
            statusClass = 'bg-red-100 text-red-800 border-red-500';
        } else if (loan.status === 'Paid') {
            statusClass = 'bg-blue-100 text-blue-800 border-blue-500';
        }
        
        const hasPenalties = loan.penaltyAmount > 0;
        const cardColorClass = hasPenalties ? 'border-yellow-500' : 'border-blue-500';
        
        const penaltyWarning = hasPenalties ? 
            `<p class="text-sm font-bold text-yellow-700 mt-2">! Total Penalties: ${formatCurrency(loan.penaltyAmount)} (Due to ${loan.penaltyDays} days delayed).</p>` : '';

        if (loan.status === 'Pending' && currentRole === 'admin') {
            loanActions = `
                <div class="flex space-x-2 mt-4 pt-4 border-t border-gray-100">
                    <button onclick="approveLoan(${loan.id})" class="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg text-sm font-semibold transition shadow-md">Approve</button>
                    <button onclick="rejectLoan(${loan.id})" class="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-sm font-semibold transition shadow-md">Reject</button>
                </div>
            `;
        }
        
        let reportButton = `
            <button onclick="generateLoanReport(${loan.id})" class="text-indigo-600 hover:text-indigo-800 px-3 py-1 rounded-lg text-sm font-semibold transition shadow-sm border border-indigo-100 bg-indigo-50">
                Generate Report
            </button>
        `;
        
        loanActions = loanActions || `<div class="flex space-x-2 mt-4 pt-4 border-t border-gray-100"></div>`;
        loanActions = loanActions.replace(`border-t border-gray-100">`, `border-t border-gray-100">${reportButton}`);
        


        let adminPenaltyActions = '';
        let adminRefundAction = '';

         if (loan.status === 'Approved' && currentRole === 'admin') {
            adminPenaltyActions = `
                <button onclick="addPenalty(${loan.id})" class="text-white bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded-lg text-sm font-semibold transition shadow-md">
                    Add Penalty (₹100)
                </button>
            `;
            adminRefundAction = `
                <button onclick="addRefund(${loan.id})" class="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-sm font-semibold transition shadow-md ml-2">
                    Add Refund (₹50)
                </button>
            `;
         }
        
        let repaymentTrackerHtml = '';
        if (loan.status === 'Approved' || loan.status === 'Paid') {
            
            const nextDueDate = getNextDueDate(loan);
            
            const ledgerRows = loan.transactionLedger.map((t, index) => {
                const flowClass = t.flow === 'CREDIT' ? 'text-green-600' : 'text-red-600';
                const flowSign = t.flow === 'CREDIT' ? '+' : '-';
                return `
                <tr class="border-t border-gray-100">
                    <td class="py-2 px-3 text-xs text-gray-500">${t.date}</td>
                    <td class="py-2 px-3 text-xs text-gray-700">${t.type}</td>
                    <td class="py-2 px-3 text-xs font-mono text-right font-semibold ${flowClass}">${flowSign} ${formatCurrency(t.amount)}</td>
                    <td class="py-2 px-3 text-xs font-bold text-center ${flowClass}">${t.flow}</td>
                </tr>
                `;
            }).reverse().join(''); 
            
            repaymentTrackerHtml = `
                <div class="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                    <div class="col-span-1">
                        <p class="font-medium text-gray-500">Next Due Date:</p>
                        <p class="text-lg font-bold text-blue-700">${nextDueDate}</p>
                    </div>
                    <div class="col-span-1">
                        <p class="font-medium text-gray-500">Remaining Amount (Incl. Penalties):</p>
                        <p class="text-xl font-bold ${loan.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}">
                            ${formatCurrency(loan.remainingAmount)}
                        </p>
                    </div>
                    <div class="col-span-2 flex justify-between items-center mt-2">
                        <p class="font-medium text-gray-500">Total Paid:</p>
                        <p class="text-lg font-mono font-semibold">${formatCurrency(loan.totalPaid)}</p>
                    </div>
                    
                    ${loan.status === 'Approved' ? `
                        <div class="col-span-2">
                            <button onclick="toggleRepaymentDetails(${loan.id})" class="w-full bg-indigo-500 text-white font-semibold py-2 rounded-lg hover:bg-indigo-600 transition text-sm mt-2 shadow-md">
                                View Ledger / Record Payment
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Repayment Details & Payment Form (Hidden by default) -->
                <div id="repaymentDetails-${loan.id}" class="hidden mt-4 pt-4 border-t border-gray-100 bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-bold text-gray-700 mb-3">Record New Payment</h4>
                    <div class="space-y-3 mb-4">
                        <!-- Payment Amount -->
                        <input type="number" id="paymentAmount-${loan.id}" placeholder="${formatCurrency(loan.monthlyRepayment)} (EMI)" min="0.01" step="0.01" value="${loan.monthlyRepayment.toFixed(2)}"
                               class="w-full p-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-sm">
                        
                        <div class="flex space-x-2">
                             <!-- Payment Type -->
                            <select id="paymentType-${loan.id}" class="w-1/3 p-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-sm">
                                <option value="EMI">EMI</option>
                                <option value="Prepayment">Prepayment</option>
                            </select>

                            <!-- Action Buttons -->
                            <button onclick="recordPayment(${loan.id})" class="flex-shrink-0 w-2/3 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition text-sm font-semibold shadow-md">
                                Record Payment
                            </button>
                        </div>
                    </div>
                    
                    ${currentRole === 'admin' ? `
                        <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                            <span class="text-xs font-medium text-gray-600">Admin Actions:</span>
                            <div>
                                ${adminPenaltyActions}
                                ${adminRefundAction}
                            </div>
                        </div>
                    ` : ''}

                    <h4 class="font-bold text-gray-700 mb-2 mt-4 border-t pt-3">Transaction Ledger (${loan.transactionLedger.length} entries)</h4>
                    <div class="max-h-40 overflow-y-auto">
                        <table class="min-w-full text-left bg-white rounded-md">
                            <thead>
                                <tr class="bg-gray-200 text-gray-600 uppercase text-xs">
                                    <th class="py-2 px-3 font-semibold w-2/6">Date</th>
                                    <th class="py-2 px-3 font-semibold w-2/6">Type</th>
                                    <th class="py-2 px-3 font-semibold w-1/6 text-right">Amount</th>
                                    <th class="py-2 px-3 font-semibold w-1/6 text-center">Flow</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${ledgerRows || `<tr><td colspan="4" class="text-center py-4 text-gray-400">No transactions recorded yet.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        const scoreDetails = loan.systemAdjustedScore ? 
            `<p class="text-sm font-medium text-gray-500 mt-2">Adj. Score: ${loan.systemAdjustedScore} (Rate: ${loan.interestRate.toFixed(2)}%)</p>` : '';


        const loanCard = `
            <div class="bg-white p-6 rounded-xl shadow-md border-l-4 transition hover:shadow-lg ${cardColorClass}">
                <div class="flex justify-between items-start mb-4 pb-2 border-b border-gray-100">
                    <h3 class="text-xl font-bold text-gray-900">${loan.applicant} <span class="text-base text-gray-500">(ID: ${loan.id})</span></h3>
                    <span class="px-3 py-1 text-sm font-bold rounded-full ${statusClass} border">
                        ${loan.status.toUpperCase()}
                    </span>
                </div>
                
                <!-- Basic Loan Details (2 Columns) -->
                <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                        <p class="font-medium text-gray-500 text-xs">Principal Amount:</p>
                        <p class="text-lg font-mono text-blue-800 font-bold">${formatCurrency(loan.amount)}</p>
                    </div>
                    <div>
                        <p class="font-medium text-gray-500 text-xs">Term / Final Rate:</p>
                        <p class="text-lg text-gray-800 font-bold">${loan.termMonths} Months @ ${loan.interestRate.toFixed(1)}%</p>
                    </div>
                </div>

                <!-- Financial Summary (3 Columns for EMI/Repayment/Interest) -->
                <div class="grid grid-cols-3 gap-3 text-sm text-center border-t pt-4">
                    <div class="p-2 bg-green-50 rounded-lg">
                        <p class="text-xs font-medium text-gray-600">Monthly EMI</p>
                        <p class="text-xl font-mono text-green-700 font-bold">${formatCurrency(loan.monthlyRepayment)}</p>
                    </div>
                    <div class="p-2 bg-blue-50 rounded-lg">
                        <p class="text-xs font-medium text-gray-600">Total Repayment (P+I)</p>
                        <p class="text-base font-mono text-blue-800 font-semibold">${formatCurrency(loan.totalRepayment)}</p>
                    </div>
                    <div class="p-2 bg-red-50 rounded-lg">
                        <p class="text-xs font-medium text-gray-600">Total Interest Payable</p>
                        <p class="text-base font-mono text-red-600 font-semibold">${formatCurrency(loan.totalInterest)}</p>
                    </div>
                </div>

                <div class="border-t pt-3 mt-3">
                    <p class="font-medium text-gray-500 text-xs">Credit Score (Reported): <span class="text-gray-800 font-semibold">${loan.creditScore}</span></p>
                    ${scoreDetails}
                </div>
                
                ${penaltyWarning}
                ${repaymentTrackerHtml}
                ${loanActions}
            </div>
        `;
        listContainer.innerHTML += loanCard;
    });
}

function initializeSampleData() {
    const initialUsers = [
        { id: userIdCounter++, email: "user@gmail.com", password: "password123", role: "user", status: "Approved" },
        { id: userIdCounter++, email: "pending@test.com", password: "test", role: "user", status: "Pending" },
        { id: userIdCounter++, email: "rejected@test.com", password: "test", role: "user", status: "Rejected" },
    ];
    users.push(...initialUsers);

    const sampleData = [
        { id: loanCounter++, userId: 1, applicant: "user@gmail.com", amount: 10000, termMonths: 36, baseInterestRate: 8, creditScore: 710, annualIncome: 500000, status: 'Pending', date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), penaltyDays: 0, penaltyAmount: 0 },
        { id: loanCounter++, userId: 1, applicant: "user@gmail.com", amount: 50000, termMonths: 12, baseInterestRate: 12, creditScore: 750, annualIncome: 2000000, status: 'Approved', date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), penaltyDays: 0, penaltyAmount: 0 },
        { id: loanCounter++, userId: 99, applicant: "Charlie Brown (External)", amount: 25000, termMonths: 60, baseInterestRate: 9.5, creditScore: 600, annualIncome: 300000, status: 'Approved', date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), penaltyDays: 15, penaltyAmount: 500 }, // Initial penalty for testing
    ];

    loans = sampleData.map(loan => {
        const adjustedScore = calculateCreditScore(loan.creditScore, loan.amount, loan.annualIncome);
        loan.systemAdjustedScore = adjustedScore;

        const finalRate = adjustInterestRate(loan.baseInterestRate, adjustedScore);
        loan.interestRate = finalRate;

        const { emi, totalRepayment: calculatedTotalRepayment, totalInterest } = calculateEMI(loan.amount, finalRate, loan.termMonths);

        loan.monthlyRepayment = parseFloat(emi.toFixed(2));
        loan.totalRepayment = parseFloat(calculatedTotalRepayment.toFixed(2));
        loan.totalInterest = parseFloat(totalInterest.toFixed(2));

        let initialPaid = 0;
        let transactionLedger = [];
        const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        
        if (loan.id === 102) { 
            const { emi: newEmi } = calculateEMI(loan.amount, finalRate, loan.termMonths);
            const paymentAmount = newEmi;
            initialPaid = paymentAmount * 2; 

            transactionLedger.push(
                { date: 'Oct 10, 2025', amount: parseFloat(paymentAmount.toFixed(2)), type: 'EMI', flow: 'CREDIT' },
                { date: 'Nov 10, 2025', amount: parseFloat(paymentAmount.toFixed(2)), type: 'EMI', flow: 'CREDIT' }
            );
        }
        
        if (loan.id === 103 && loan.penaltyAmount > 0) {
             transactionLedger.push(
                { date: currentDate, amount: parseFloat(loan.penaltyAmount.toFixed(2)), type: 'Penalty', flow: 'DEBIT' }
            );
        }

        loan.totalPaid = parseFloat(initialPaid.toFixed(2));
        loan.transactionLedger = transactionLedger;
        
        loan.remainingAmount = parseFloat((loan.totalRepayment + loan.penaltyAmount - loan.totalPaid).toFixed(2));
        
        if (loan.remainingAmount <= 0.01) {
            loan.remainingAmount = 0;
            loan.status = 'Paid';
        }

        return loan;
    });
}

function setupEventListeners() {
    document.getElementById('userLoginForm')?.addEventListener('submit', (e) => handleLogin(e, 'user'));
    document.getElementById('adminLoginForm')?.addEventListener('submit', (e) => handleLogin(e, 'admin'));

    document.getElementById('registrationForm')?.addEventListener('submit', registerUser);

    document.getElementById('loanForm')?.addEventListener('submit', addLoan);
}

window.onload = () => {
    initializeSampleData();
    setupEventListeners();
    showView('loginScreen');
};
