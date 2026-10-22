// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mountApp } from '../web/src/main.js';
import { calculators, formatMoney, parseField, parseMoney } from '../web/src/forms.js';
import en from '../web/locales/en.json' with { type: 'json' };
import tr from '../web/locales/tr.json' with { type: 'json' };

const query = <T extends HTMLElement>(selector: string): T => {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing test element: ${selector}`);
  return node;
};
const tab = (name: string) => query<HTMLButtonElement>(`#tab-${name}`).click();
const submit = () => query<HTMLFormElement>('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
const change = (name: string, value: string) => {
  const input = query<HTMLInputElement>(`[name="${name}"]`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

beforeEach(() => {
  document.body.innerHTML = '<div id="test-root"></div>';
  mountApp(query('#test-root'));
});

describe('form parsing', () => {
  const moneyCases: [string, number | null][] = [['0', 0], ['1', 100], ['1.01', 101], ['1,01', 101], ['0.29', 29], ['1.005', null],
    ['-1', null], ['', null], ['NaN', null], ['Infinity', null], ['1e3', null], ['1,000.00', null],
    ['90071992547409.91', Number.MAX_SAFE_INTEGER], ['90071992547409.92', null]];
  it.each(moneyCases)('parses TL %s exactly', (value: string, expected: number | null) => {
    if (expected === null) expect(() => parseMoney(value)).toThrow(RangeError);
    else expect(parseMoney(value)).toBe(expected);
  });

  it('parses rates, areas and integer periods without silent coercion', () => {
    expect(parseField('2', 'percent')).toBe(0.02);
    expect(parseField('0.29', 'money')).toBe(29);
    expect(parseField('1.5', 'area')).toBe(1.5);
    expect(parseField('120', 'integer')).toBe(120);
    for (const invalid of ['-1', '', '1e3', 'Infinity']) expect(() => parseField(invalid, 'percent')).toThrow();
    expect(() => parseField('1.5', 'integer')).toThrow();
    expect(() => parseField('9'.repeat(400), 'area')).toThrow();
  });

  it('formats signed kuruş exactly, including the maximum safe amount', () => {
    const formatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
    expect(formatMoney(0, formatter)).toBe('₺0,00');
    expect(formatMoney(1, formatter)).toBe('₺0,01');
    expect(formatMoney(-1, formatter)).toBe('-₺0,01');
    expect(formatMoney(-101, formatter)).toBe('-₺1,01');
    expect(formatMoney(Number.MAX_SAFE_INTEGER, formatter)).toBe('₺90.071.992.547.409,91');
  });
});

describe('calculator UI', () => {
  it('provides matching translation keys and accessible input labels', () => {
    function keys(value: object, prefix = ''): string[] {
      return Object.entries(value).flatMap(([key, entry]) => typeof entry === 'object' && entry !== null
        ? keys(entry, `${prefix}${key}.`) : [`${prefix}${key}`]).sort();
    }
    expect(keys(en)).toEqual(keys(tr));
    for (const name of calculators) {
      tab(name);
      for (const input of document.querySelectorAll<HTMLInputElement>('input')) {
        expect(document.querySelector(`label[for="${input.id}"]`)?.textContent).toBeTruthy();
      }
    }
  });

  it('calculates every default scenario in both languages', () => {
    for (const language of ['tr', 'en']) {
      const select = query<HTMLSelectElement>('#language');
      select.value = language;
      select.dispatchEvent(new Event('change'));
      expect(document.documentElement.lang).toBe(language);
      for (const name of calculators) {
        tab(name);
        submit();
        expect(query('.error').textContent, `${language}/${name}`).toBe('');
        expect(query('.output dd').textContent).toBeTruthy();
        expect(query('.output').textContent).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it('formats TR currency, preserves scenarios, and marks stale results', () => {
    submit();
    expect(query('.output').textContent).toContain('%6');
    expect(query('.output').textContent).toContain('₺');
    change('monthlyRentKurus', '1234.56');
    expect(query('.output').classList.contains('is-stale')).toBe(true);
    tab('real'); tab('rental');
    expect(query<HTMLInputElement>('[name="monthlyRentKurus"]').value).toBe('1234.56');
    submit();
    expect(query('.output').classList.contains('is-stale')).toBe(false);
    const language = query<HTMLSelectElement>('#language');
    language.value = 'en'; language.dispatchEvent(new Event('change'));
    expect(query<HTMLInputElement>('[name="monthlyRentKurus"]').value).toBe('1234.56');
    expect(query('.output').textContent).toContain('Gross rental yield');
  });

  it('shows inline errors and focuses the invalid field', () => {
    change('propertyPriceKurus', '0'); submit();
    const input = query<HTMLInputElement>('[name="propertyPriceKurus"]');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('form-error');
    expect(document.activeElement).toBe(input);
    expect(query('.error').textContent).toContain(tr.error);
    change('propertyPriceKurus', '1000000'); submit();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(query('.error').textContent).toBe('');
    change('vacancyRate', '101'); submit();
    expect(query('[name="vacancyRate"]').getAttribute('aria-invalid')).toBe('true');
  });

  it('shows null payback and a full mortgage table', () => {
    tab('payback'); change('monthlyRentKurus', '0'); submit();
    expect(query('.output').textContent).toContain(tr.notRecovered);
    tab('mortgage'); submit();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(120);
    expect(document.querySelectorAll('thead th')).toHaveLength(8);
    expect(query('.table-scroll').tabIndex).toBe(0);
  });

  it('applies preset rates explicitly and preserves entered fixed-charge quotes', () => {
    tab('purchase');
    expect(query<HTMLInputElement>('[name="buyerDeedFeeRate"]').value).toBe('0');
    change('daskKurus', '42');
    query<HTMLButtonElement>('.preset-button').click();
    expect(query<HTMLInputElement>('[name="buyerDeedFeeRate"]').value).toBe('2');
    expect(query<HTMLInputElement>('[name="agentFeeRate"]').value).toBe('4');
    expect(query<HTMLInputElement>('[name="daskKurus"]').value).toBe('42');
    submit();
    expect(query('.error').textContent).toBe('');
  });

  it('supports tab keyboard navigation and the theme toggle', () => {
    const press = (key: string) => query<HTMLElement>('[role="tab"][aria-selected="true"]')
      .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    press('ArrowRight'); expect(document.activeElement?.id).toBe('tab-payback');
    press('End'); expect(document.activeElement?.id).toBe('tab-rentBuy');
    press('ArrowRight'); expect(document.activeElement?.id).toBe('tab-rental');
    press('ArrowLeft'); expect(document.activeElement?.id).toBe('tab-rentBuy');
    press('Home'); expect(document.activeElement?.id).toBe('tab-rental');
    const theme = query<HTMLButtonElement>('.theme-button');
    const previous = theme.getAttribute('aria-pressed'); theme.click();
    expect(theme.getAttribute('aria-pressed')).not.toBe(previous);
    expect(document.documentElement.dataset.theme).toBe(theme.getAttribute('aria-pressed') === 'true' ? 'dark' : 'light');
  });
});
