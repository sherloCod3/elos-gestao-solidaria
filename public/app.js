(() => {
  const rowsContainer = document.querySelector('[data-item-rows]');
  const addRowButton = document.querySelector('[data-add-row]');

  function updateRowIds(row, index) {
    row.querySelectorAll('[id]').forEach((element) => {
      element.id = element.id.replace(/^item-\d+-/, `item-${index}-`);
    });
    row.querySelectorAll('label[for]').forEach((label) => {
      label.htmlFor = label.htmlFor.replace(/^item-\d+-/, `item-${index}-`);
    });
  }

  function clearRow(row, index) {
    row.querySelectorAll('input, select, textarea').forEach((field) => {
      if (field.tagName === 'SELECT') {
        field.selectedIndex = 0;
      } else if (field.type === 'checkbox' || field.type === 'radio') {
        field.checked = false;
      } else {
        field.value = '';
      }
      field.removeAttribute('aria-invalid');
    });
    row.querySelectorAll('.field').forEach((field) => field.classList.remove('has-error'));
    row.querySelectorAll('.field-error').forEach((error) => error.remove());
    const hint = row.querySelector('.js-balance-hint');
    if (hint) {
      hint.textContent = '';
      hint.classList.remove('is-low');
    }
    updateRowIds(row, index);
  }

  function refreshBalanceHint(row) {
    const select = row.querySelector('.js-resource-select');
    const hint = row.querySelector('.js-balance-hint');
    if (!select || !hint) return;
    const option = select.selectedOptions[0];
    if (!option || !option.value) {
      hint.textContent = '';
      hint.classList.remove('is-low');
      return;
    }
    const saldo = Number(option.dataset.saldo ?? 0);
    const unidade = option.dataset.unidade ?? '';
    hint.textContent = `Saldo atual: ${saldo} ${unidade}.`;
    const quantity = Number(row.querySelector('.js-quantity')?.value ?? 0);
    hint.classList.toggle('is-low', Number.isFinite(quantity) && quantity > saldo);
  }

  if (rowsContainer) {
    rowsContainer.addEventListener('change', (event) => {
      if (event.target.matches('.js-resource-select')) {
        refreshBalanceHint(event.target.closest('[data-item-row]'));
      }
    });
    rowsContainer.addEventListener('input', (event) => {
      if (event.target.matches('.js-quantity')) {
        refreshBalanceHint(event.target.closest('[data-item-row]'));
      }
    });
    rowsContainer.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-row]');
      if (!removeButton) return;
      const row = removeButton.closest('[data-item-row]');
      if (!row) return;
      if (rowsContainer.querySelectorAll('[data-item-row]').length > 1) {
        row.remove();
      } else {
        clearRow(row, 0);
      }
    });
    rowsContainer.querySelectorAll('[data-item-row]').forEach(refreshBalanceHint);
  }

  if (addRowButton && rowsContainer) {
    addRowButton.addEventListener('click', () => {
      const rows = rowsContainer.querySelectorAll('[data-item-row]');
      const last = rows[rows.length - 1];
      if (!last) return;
      const clone = last.cloneNode(true);
      clearRow(clone, rows.length);
      rowsContainer.appendChild(clone);
      const firstInput = clone.querySelector('select, input');
      firstInput?.focus();
    });
  }

  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      const message = form.dataset.confirm || 'Confirmar esta ação?';
      if (!window.confirm(message)) {
        event.preventDefault();
      }
    });
  });
})();
