// DOM Elements
const inventoryForm = document.getElementById('inventory-form');
const itemNameInput = document.getElementById('item-name');
const itemQuantityInput = document.getElementById('item-quantity');
const itemPriceInput = document.getElementById('item-price');
const inventoryList = document.getElementById('inventory-list');
const clearAllBtn = document.getElementById('clear-all-btn');

// Error Elements
const nameError = document.getElementById('name-error');
const quantityError = document.getElementById('quantity-error');
const priceError = document.getElementById('price-error');

// Chart Instance
let inventoryChart = null;

// LocalStorage Key
const STORAGE_KEY = 'abcLogisticsInventory';

// State
let inventory = [];
let chartMode = 'quantity'; // 'quantity' or 'value'

// Theme Colors for Chart
const BAR_RED = '#CC0633';
const HOVER_RED = '#A30529';
const TEXT_SECONDARY = '#6B6B6B';
const GRID_COLOR = '#E8E5E0';

// Initialize Application
function init() {
    // Only initialize if we are on the Control Centre page (which has the form)
    if (inventoryForm) {
        loadInventory();
        setupEventListeners();
        renderList();
        renderChart();
    }
}

function loadInventory() {
    const stored = localStorage.getItem(STORAGE_KEY);
    inventory = stored ? JSON.parse(stored) : [];
}

function saveInventory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
}

function setupEventListeners() {
    inventoryForm.addEventListener('submit', handleAddItem);
    clearAllBtn.addEventListener('click', handleClearAll);

    // Clear errors on input
    itemNameInput.addEventListener('input', () => clearError(itemNameInput, nameError));
    itemQuantityInput.addEventListener('input', () => clearError(itemQuantityInput, quantityError));
    itemPriceInput.addEventListener('input', () => clearError(itemPriceInput, priceError));
}

function handleAddItem(e) {
    e.preventDefault();

    let hasError = false;

    // 1. Get Values
    const name = itemNameInput.value.trim();
    const quantityStr = itemQuantityInput.value;
    const priceStr = itemPriceInput.value;

    // 2. Clear previous errors
    clearError(itemNameInput, nameError);
    clearError(itemQuantityInput, quantityError);
    clearError(itemPriceInput, priceError);

    // 3. Validation
    // Duplicate Name
    if (inventory.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        showError(itemNameInput, nameError, 'Error: Item name already exists.');
        hasError = true;
    }

    // Number conversions (strict typing checks)
    const quantity = Number(quantityStr);
    const price = Number(priceStr);

    // Alphanumeric values in price/quantity check (isNaN)
    if (isNaN(quantity) || quantityStr.trim() === '') {
        showError(itemQuantityInput, quantityError, 'Error: Quantity must be a valid number.');
        hasError = true;
    } else if (quantity < 0) { // Negative numbers not allowed
        showError(itemQuantityInput, quantityError, 'Error: Quantity cannot be negative.');
        hasError = true;
    }

    if (isNaN(price) || priceStr.trim() === '') {
        showError(itemPriceInput, priceError, 'Error: Price must be a valid number.');
        hasError = true;
    } else if (price < 0) { // Negative numbers not allowed
        showError(itemPriceInput, priceError, 'Error: Price cannot be negative.');
        hasError = true;
    }

    if (hasError) return;

    // 4. Add to state
    inventory.push({
        id: Date.now().toString(),
        name,
        quantity,
        price
    });

    // 5. Save & Update UI
    saveInventory();
    renderList();
    renderChart();

    // 6. Reset form
    inventoryForm.reset();
    itemNameInput.focus();
}

function handleClearAll(e) {
    if (inventory.length === 0) return;

    if (confirm('Are you sure you want to clear all inventory items? This cannot be undone.')) {
        inventory = [];
        saveInventory();
        renderList();
        renderChart();
    }
}

function handleDeleteItem(id) {
    inventory = inventory.filter(item => item.id !== id);
    saveInventory();
    renderList();
    renderChart();
}

function showError(inputElement, errorElement, message) {
    inputElement.classList.add('invalid');
    errorElement.textContent = message;
}

function clearError(inputElement, errorElement) {
    inputElement.classList.remove('invalid');
    errorElement.textContent = '';
}

// UI Rendering
function renderList() {
    inventoryList.innerHTML = '';

    if (inventory.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" class="empty-state">No items in inventory. Add an item to get started.</td>`;
        inventoryList.appendChild(tr);
        return;
    }

    inventory.forEach(item => {
        const tr = document.createElement('tr');
        const totalValue = item.quantity * item.price;

        tr.innerHTML = `
            <td>
                <strong>${item.name}</strong>
                <button class="btn-delete" onclick="handleDeleteItem('${item.id}')" title="Delete item">&times;</button>
            </td>
            <td class="td-val">${item.quantity}</td>
            <td class="td-val">$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        inventoryList.appendChild(tr);
    });
}

function setChartMode(mode) {
    chartMode = mode;

    // Update toggle button states
    document.getElementById('toggle-qty').classList.toggle('active', mode === 'quantity');
    document.getElementById('toggle-val').classList.toggle('active', mode === 'value');

    // Update chart title
    document.getElementById('chart-title').textContent =
        mode === 'quantity' ? 'Quantity Overview' : 'Total Value Overview';

    renderChart();
}

function renderChart() {
    const ctx = document.getElementById('inventoryChart').getContext('2d');

    // Extract data based on current mode
    const labels = inventory.map(item => item.name);
    const data = chartMode === 'quantity'
        ? inventory.map(item => item.quantity)
        : inventory.map(item => item.quantity * item.price);

    const datasetLabel = chartMode === 'quantity' ? 'Quantity in Stock' : 'Total Value ($)';

    if (inventoryChart) {
        // Update existing chart
        inventoryChart.data.labels = labels;
        inventoryChart.data.datasets[0].data = data;
        inventoryChart.data.datasets[0].label = datasetLabel;

        // Update tooltip callback for the current mode
        inventoryChart.options.plugins.tooltip.callbacks.label = function (context) {
            if (chartMode === 'value') {
                return `Value: $${context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            return `Quantity: ${context.parsed.y}`;
        };

        // Update tick format
        inventoryChart.options.scales.y.ticks.callback = chartMode === 'value'
            ? function (value) { return '$' + value.toLocaleString(); }
            : undefined;
        inventoryChart.options.scales.y.ticks.precision = chartMode === 'quantity' ? 0 : 2;

        inventoryChart.update();
    } else {
        // Create new chart
        Chart.defaults.color = TEXT_SECONDARY;
        Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

        inventoryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: datasetLabel,
                    data: data,
                    backgroundColor: BAR_RED,
                    hoverBackgroundColor: HOVER_RED,
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#fff',
                        bodyColor: '#e2e8f0',
                        padding: 12,
                        cornerRadius: 6,
                        displayColors: false,
                        callbacks: {
                            label: function (context) {
                                if (chartMode === 'value') {
                                    return `Value: $${context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                }
                                return `Quantity: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: GRID_COLOR,
                            drawBorder: false
                        },
                        ticks: {
                            precision: 0
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    }
                },
                animation: {
                    duration: 500,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
}

// Start App
document.addEventListener('DOMContentLoaded', init);
