import {
  comparePricePerSqm, mortgage, netRentalYield, paybackPeriod,
  purchaseCost, realReturn, rentVsBuy,
} from '../../src/index.js';
import type { MortgageResult } from '../../src/index.js';
import { tr2026 } from '../../src/presets/tr-2026.js';
import en from '../locales/en.json' with { type: 'json' };
import tr from '../locales/tr.json' with { type: 'json' };
import { calculators, formatMoney, forms, parseField } from './forms.js';
import type { Calculator } from './forms.js';

type Language = 'en' | 'tr';
type Calculation = ReturnType<typeof calculate>;
interface Scenario { values: Record<string, string>; result?: Calculation; dirty: boolean }

function calculate(kind: Calculator, values: Record<string, number>) {
  const v = (key: string): number => {
    const value = values[key];
    if (value === undefined) throw new RangeError(`Missing ${key}.`);
    return value;
  };
  switch (kind) {
    case 'rental': return netRentalYield({ propertyPriceKurus: v('propertyPriceKurus'), monthlyRentKurus: v('monthlyRentKurus'),
      monthlyDuesKurus: v('monthlyDuesKurus'), annualPropertyTaxKurus: v('annualPropertyTaxKurus'),
      annualMaintenanceKurus: v('annualMaintenanceKurus'), vacancyRate: v('vacancyRate'), annualInsuranceKurus: v('annualInsuranceKurus') });
    case 'payback': return paybackPeriod({ investmentKurus: v('investmentKurus'), monthlyRentKurus: v('monthlyRentKurus'),
      annualRentGrowthRate: v('annualRentGrowthRate'), maxYears: v('maxYears') });
    case 'mortgage': return mortgage({ principalKurus: v('principalKurus'), monthlyInterestRate: v('monthlyInterestRate'),
      months: v('months'), bsmvRate: v('bsmvRate'), kkdfRate: v('kkdfRate') });
    case 'purchase': return purchaseCost({ propertyPriceKurus: v('propertyPriceKurus'), deedFeeBaseKurus: v('deedFeeBaseKurus'),
      buyerDeedFeeRate: v('buyerDeedFeeRate'), sellerDeedFeeRate: v('sellerDeedFeeRate'), revolvingFundKurus: v('revolvingFundKurus'),
      agentFeeRate: v('agentFeeRate'), agentVatRate: v('agentVatRate'), buyerAgentShare: v('buyerAgentShare'),
      appraisalKurus: v('appraisalKurus'), daskKurus: v('daskKurus') });
    case 'real': return realReturn({ nominalReturnRate: v('nominalReturnRate'), inflationRate: v('inflationRate') });
    case 'sqm': return comparePricePerSqm({ propertyPriceKurus: v('propertyPriceKurus'), areaSqm: v('areaSqm'),
      regionalAverageKurus: v('regionalAverageKurus') });
    case 'rentBuy': return rentVsBuy({ propertyPriceKurus: v('propertyPriceKurus'), monthlyRentKurus: v('monthlyRentKurus'),
      purchaseCostsKurus: v('purchaseCostsKurus'), annualOwnershipCostsKurus: v('annualOwnershipCostsKurus'),
      annualOpportunityRate: v('annualOpportunityRate'), years: v('years') });
  }
}

const outputKeys: Record<Calculator, string[]> = {
  rental: ['grossYield', 'netYield', 'netAnnualIncomeKurus', 'annualRentKurus', 'vacancyLossKurus',
    'collectedRentKurus', 'annualDuesKurus', 'annualPropertyTaxKurus', 'annualMaintenanceKurus', 'annualInsuranceKurus', 'annualExpensesKurus'],
  payback: ['years', 'initialAnnualRentKurus'],
  mortgage: ['monthlyPaymentKurus', 'totalPaymentKurus', 'finalPaymentKurus', 'totalInterestKurus',
    'totalBsmvKurus', 'totalKkdfKurus', 'totalFinancingCostKurus'],
  purchase: ['buyerTotalKurus', 'buyerCostsKurus', 'sellerCostsKurus', 'buyerDeedFeeKurus', 'sellerDeedFeeKurus',
    'agentFeeKurus', 'agentVatKurus', 'buyerAgentFeeKurus', 'sellerAgentFeeKurus', 'revolvingFundKurus',
    'appraisalKurus', 'daskKurus', 'totalTransactionCostsKurus', 'sellerNetProceedsKurus'],
  real: ['realReturnRate'],
  sqm: ['pricePerSqmKurus', 'differenceRate', 'differenceKurus'],
  rentBuy: ['totalRentKurus', 'totalBuyingEconomicCostKurus', 'rentMinusBuyKurus', 'initialCapitalKurus',
    'annualOpportunityCostKurus', 'totalOwnershipCostsKurus', 'totalOpportunityCostKurus'],
};

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function mountApp(root: HTMLElement): void {
  let language: Language = 'tr';
  let active: Calculator = 'rental';
  let dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const scenarios = new Map<Calculator, Scenario>(calculators.map((key) => [key, {
    values: Object.fromEntries(forms[key].map((field) => [field.key, field.value])), dirty: false,
  }]));

  function render(): void {
    const t = language === 'tr' ? tr : en;
    const labels: Record<string, string> = t.fields;
    const outputLabels: Record<string, string> = t.outputs;
    const state = scenarios.get(active)!;
    const locale = language === 'tr' ? 'tr-TR' : 'en-GB';
    const moneyFormat = new Intl.NumberFormat(locale, { style: 'currency', currency: 'TRY' });
    const percentFormat = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 });
    const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.title = `emlak-hesap · ${t.tabs[active]}`;
    root.replaceChildren();

    const skip = element('a', t.skip, 'skip');
    skip.href = '#calculator';
    const header = element('header', undefined, 'header shell');
    const brand = element('div', undefined, 'brand');
    brand.append(element('span', 'emlak-hesap', 'wordmark'), element('span', t.brandSub, 'brand-sub'));
    const controls = element('div', undefined, 'controls');
    const langLabel = element('label', t.language, 'sr-only');
    langLabel.htmlFor = 'language';
    const select = element('select');
    select.id = 'language';
    for (const [value, label] of [['tr', 'Türkçe'], ['en', 'English']] as const) {
      const option = element('option', label);
      option.value = value;
      option.selected = value === language;
      select.append(option);
    }
    select.addEventListener('change', () => { language = select.value as Language; render(); root.querySelector<HTMLSelectElement>('#language')!.focus(); });
    const theme = element('button', t.theme, 'theme-button');
    theme.type = 'button';
    theme.setAttribute('aria-pressed', String(dark));
    theme.addEventListener('click', () => { dark = !dark; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; theme.setAttribute('aria-pressed', String(dark)); });
    controls.append(langLabel, select, theme);
    header.append(brand, controls);

    const main = element('main', undefined, 'shell');
    const hero = element('section', undefined, 'hero');
    hero.append(element('p', t.eyebrow, 'eyebrow'), element('h1', t.title), element('p', t.intro, 'intro'), element('p', t.private, 'privacy'));
    const workbench = element('section', undefined, 'workbench');
    workbench.id = 'calculator';
    workbench.tabIndex = -1;
    const tabs = element('div', undefined, 'tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', t.navigation);
    for (const key of calculators) {
      const button = element('button', t.tabs[key]);
      button.id = `tab-${key}`;
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(key === active));
      button.setAttribute('aria-controls', 'panel');
      button.tabIndex = key === active ? 0 : -1;
      button.addEventListener('click', () => { active = key; render(); root.querySelector<HTMLButtonElement>(`#tab-${key}`)!.focus(); });
      button.addEventListener('keydown', (event) => {
        const index = calculators.indexOf(key);
        const target = event.key === 'ArrowRight' ? (index + 1) % calculators.length
          : event.key === 'ArrowLeft' ? (index + calculators.length - 1) % calculators.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? calculators.length - 1 : null;
        if (target !== null) {
          event.preventDefault();
          active = calculators[target]!;
          render();
          root.querySelector<HTMLButtonElement>(`#tab-${active}`)!.focus();
        }
      });
      tabs.append(button);
    }

    const panel = element('div', undefined, 'panel');
    panel.id = 'panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${active}`);
    const inputArea = element('div', undefined, 'input-area');
    inputArea.append(element('p', t.inputs, 'eyebrow'), element('h2', t.tabs[active]), element('p', t.sample, 'muted'));
    const form = element('form');
    form.noValidate = true;
    form.setAttribute('aria-label', t.tabs[active]);
    const fieldGrid = element('div', undefined, 'field-grid');
    for (const field of forms[active]) {
      const wrapper = element('div', undefined, 'field');
      const label = element('label', labels[field.key]);
      label.htmlFor = `input-${field.key}`;
      const input = element('input');
      input.id = label.htmlFor;
      input.name = field.key;
      input.type = 'number';
      input.required = true;
      input.autocomplete = 'off';
      input.inputMode = 'decimal';
      input.min = ['propertyPriceKurus', 'investmentKurus', 'principalKurus', 'deedFeeBaseKurus', 'regionalAverageKurus'].includes(field.key)
        ? '0.01' : field.kind === 'integer' ? '1' : field.kind === 'area' ? '0.000001' : '0';
      input.step = field.kind === 'integer' ? '1' : field.kind === 'money' ? '0.01' : 'any';
      if (field.max !== undefined) input.max = String(field.max);
      if (field.kind === 'percent' && !['nominalReturnRate', 'inflationRate'].includes(field.key)) input.max = '100';
      input.value = state.values[field.key]!;
      input.addEventListener('input', () => {
        state.values[field.key] = input.value;
        state.dirty = true;
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
        status.textContent = state.result ? t.stale : t.empty;
        output.classList.add('is-stale');
      });
      wrapper.append(label, input);
      fieldGrid.append(wrapper);
    }
    const status = element('p', state.result ? state.dirty ? t.stale : t.resultHint : t.empty, 'status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const error = element('p', undefined, 'error');
    error.id = 'form-error';
    error.setAttribute('role', 'alert');
    const submit = element('button', t.calculate, 'primary');
    submit.type = 'submit';
    form.append(fieldGrid);
    if (active === 'purchase') {
      const preset = element('button', t.preset, 'preset-button');
      preset.type = 'button';
      preset.addEventListener('click', () => {
        // The button changes rates only; it preserves any quotes already entered.
        const rateKeys = ['buyerDeedFeeRate', 'sellerDeedFeeRate', 'agentFeeRate', 'agentVatRate', 'buyerAgentShare'] as const;
        for (const key of rateKeys) {
          const input = form.elements.namedItem(key) as HTMLInputElement;
          input.value = String(tr2026.purchase[key] * 100);
          state.values[key] = input.value;
        }
        state.dirty = true;
        status.textContent = t.presetApplied;
        output.classList.add('is-stale');
      });
      form.append(preset, element('p', t.presetNote, 'muted small'));
    }
    const limits = element('details', undefined, 'limits');
    limits.append(element('summary', t.inputs), element('p', t.limits));
    form.append(error, submit, limits);
    inputArea.append(form);
    const resultArea = element('section', undefined, 'result-area');
    const resultTitle = element('h2', t.results);
    resultTitle.id = 'results-title';
    resultArea.setAttribute('aria-labelledby', resultTitle.id);
    resultArea.setAttribute('aria-live', 'polite');
    const output = element('div', undefined, `output${state.dirty ? ' is-stale' : ''}`);

    function formatted(key: string, value: unknown): string {
      if (value === null) return t.notRecovered;
      if (typeof value !== 'number') return '';
      if (key.endsWith('Kurus')) return formatMoney(value, moneyFormat);
      if (key === 'years') return `${numberFormat.format(value)} ${t.yearsUnit}`;
      return percentFormat.format(value);
    }

    function showResult(): void {
      output.replaceChildren();
      if (!state.result) return;
      const result = state.result;
      const entries = Object.fromEntries(Object.entries(result));
      if ('lowerCostOption' in result) {
        output.append(element('p', result.lowerCostOption === 'buy' ? t.optionBuy : result.lowerCostOption === 'rent' ? t.optionRent : t.optionEqual, 'verdict'));
      }
      const list = element('dl', undefined, 'breakdown');
      outputKeys[active].forEach((key, index) => {
        const row = element('div', undefined, index < 2 ? 'metric' : 'detail-row');
        row.append(element('dt', outputLabels[key]), element('dd', formatted(key, entries[key])));
        list.append(row);
      });
      output.append(list);
      if ('monthlyPaymentKurus' in result) showSchedule(result);
    }

    function showSchedule(result: MortgageResult): void {
      const details = element('details', undefined, 'schedule');
      const scroll = element('div', undefined, 'table-scroll');
      scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region');
      scroll.setAttribute('aria-label', t.schedule);
      const table = element('table');
      table.append(element('caption', t.schedule, 'sr-only'));
      const columns = ['month', 'openingBalanceKurus', 'paymentKurus', 'principalKurus', 'interestKurus', 'bsmvKurus', 'kkdfKurus', 'closingBalanceKurus'] as const;
      const head = element('thead');
      const heading = element('tr');
      for (const key of columns) { const th = element('th', outputLabels[key]); th.scope = 'col'; heading.append(th); }
      head.append(heading);
      const body = element('tbody');
      for (const row of result.schedule) {
        const line = element('tr');
        for (const key of columns) line.append(element('td', key === 'month' ? String(row[key]) : formatMoney(row[key], moneyFormat)));
        body.append(line);
      }
      table.append(head, body);
      scroll.append(table);
      details.append(element('summary', t.schedule), scroll);
      output.append(details);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      error.textContent = '';
      let current: HTMLInputElement | undefined;
      for (const input of form.querySelectorAll('input')) {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
      try {
        const values: Record<string, number> = {};
        for (const field of forms[active]) {
          current = form.elements.namedItem(field.key) as HTMLInputElement;
          if (!current.checkValidity()) throw new RangeError('Invalid field value.');
          values[field.key] = parseField(current.value, field.kind);
        }
        current = undefined;
        state.result = calculate(active, values);
        state.dirty = false;
        output.classList.remove('is-stale');
        status.textContent = t.resultHint;
        showResult();
      } catch (cause) {
        const name = cause instanceof Error ? cause.message.split(' ')[0] : '';
        const invalid = current ?? (name ? form.elements.namedItem(name) as HTMLInputElement | null : null);
        if (invalid) {
          invalid.setAttribute('aria-invalid', 'true');
          invalid.setAttribute('aria-describedby', error.id);
          invalid.focus();
        }
        state.dirty = true;
        output.classList.add('is-stale');
        error.textContent = `${t.error} ${invalid ? t.fieldError : t.limits}`;
        status.textContent = state.result ? t.stale : t.empty;
      }
    });

    showResult();
    resultArea.append(element('p', t.rounding, 'eyebrow small'), resultTitle, status, output);
    panel.append(inputArea, resultArea);
    workbench.append(tabs, panel);
    const note = element('aside', undefined, 'method-note');
    note.append(element('p', t.notes[active]));
    main.append(hero, workbench, note);
    const footer = element('footer', undefined, 'footer shell');
    const sources = element('details');
    sources.append(element('summary', t.source));
    const sourceList = element('ul');
    for (const [text, href] of [
      [t.sourceDeed, 'https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Finfografikler%2Fpdfs%2Ftapuharci.pdf'],
      [t.sourceAgent, 'https://eskisehir.ticaret.gov.tr/data/64edb08513b876171c69c106/TA%C5%9EINMAZ%20T%C4%B0CARET%C4%B0%20HAKKINDA%20Y%C3%96NETMEL%C4%B0K%20.pdf'],
      [t.sourceVat, 'https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fkdv-oranlari.pdf'],
    ]) {
      const li = element('li');
      const link = element('a', text);
      link.href = href!;
      link.rel = 'noreferrer';
      li.append(link); sourceList.append(li);
    }
    sources.append(sourceList);
    footer.append(element('p', t.advice), sources, element('p', t.version, 'small'));
    root.append(skip, header, main, footer);
  }

  render();
}

const root = document.getElementById('app');
if (root) mountApp(root);
