"use client";

import React, { useEffect, useRef } from "react";
import $ from "jquery";
import "select2/dist/css/select2.css";

// Ensure jQuery is available globally for select2
if (typeof window !== "undefined") {
  (window as any).$ = (window as any).jQuery = $;
}

// Lazy-require select2 only on client
let select2Loaded = false;
function ensureSelect2() {
  if (!select2Loaded && typeof window !== "undefined") {
    require("select2");
    select2Loaded = true;
  }
  // Inject minimal CSS for z-index and theming once
  if (typeof document !== 'undefined' && !document.getElementById('select2-custom-styles')) {
    const style = document.createElement('style');
    style.id = 'select2-custom-styles';
    style.textContent = `
      .select2-container .select2-dropdown { z-index: 10050 !important; }
      .select2-results__option[aria-disabled=true] { color: #9ca3af; }
      .select2-container--default .select2-search--dropdown .select2-search__field {
        color: #111827; /* gray-900 */
        background-color: #ffffff; /* white */
        border-color: #d1d5db; /* gray-300 */
        padding: 6px 8px;
      }
      .select2-container--default .select2-search--dropdown .select2-search__field::placeholder {
        color: #6b7280; /* gray-500 */
      }
      /* Ensure rendered text (selected value) is visible in light mode */
      .select2-container--default .select2-selection--single .select2-selection__rendered {
        color: #111827; /* gray-900 */
      }
      /* Placeholder color in light mode inside selection */
      .select2-container--default .select2-selection--single .select2-selection__placeholder {
        color: #6b7280; /* gray-500 */
      }
      .dark .select2-container--default .select2-selection--single { background-color: #1f2937; border-color: #374151; }
      .dark .select2-container--default .select2-selection--single .select2-selection__rendered { color: #e5e7eb !important; }
      .dark .select2-container--default .select2-selection--single .select2-selection__placeholder { color: #9ca3af !important; }
      /* Keep selection background consistent when dropdown is open */
      .dark .select2-container--default.select2-container--open .select2-selection--single {
        background-color: #1f2937 !important;
        border-color: #4b5563 !important;
      }
      .dark .select2-container--default.select2-container--open .select2-selection--single .select2-selection__rendered {
        color: #e5e7eb !important;
      }
      .dark .select2-container .select2-dropdown { background-color: #1f2937; color: #e5e7eb; border-color: #374151; }
      .dark .select2-container--default .select2-results > .select2-results__options { background-color: #1f2937 !important; }
      /* Base option color in dark mode */
      .dark .select2-results__option { color: #e5e7eb !important; }
      /* Hover/keyboard highlight state in dark mode */
      .dark .select2-results__option--highlighted { background-color: #4b5563 !important; color: #f9fafb !important; }
      /* Selected item within dropdown in dark mode */
      .dark .select2-container--default .select2-results__option[aria-selected=true],
      .dark .select2-container--default .select2-results__option--selected {
        background-color: #374151 !important; color: #e5e7eb !important;
      }
      /* Selected + highlighted (while navigating) in dark mode */
      .dark .select2-container--default .select2-results__option--highlighted[aria-selected=true] {
        background-color: #4b5563 !important; color: #f9fafb !important;
      }
      .dark .select2-container--default .select2-results__option--highlighted.select2-results__option--selected {
        background-color: #4b5563 !important; color: #f9fafb !important;
      }
      /* Disabled option in dark mode */
      .dark .select2-results__option[aria-disabled=true] { color: #6b7280 !important; }
      .dark .select2-container--default .select2-search--dropdown .select2-search__field {
        color: #e5e7eb; /* gray-200 */
        background-color: #111827; /* gray-900 */
        border-color: #374151; /* gray-700 */
      }
      /* Arrow indicator color tweaks */
      .select2-container--default .select2-selection--single .select2-selection__arrow b {
        border-color: #6b7280 transparent transparent transparent; /* gray-500 */
      }
      .dark .select2-container--default .select2-selection--single .select2-selection__arrow b {
        border-color: #9ca3af transparent transparent transparent; /* gray-400 */
      }
      /* Improve visibility of clear (remove all) control */
      /* Add spacing around the clear (x) and the text so it's not too tight */
      .select2-container--default .select2-selection--single .select2-selection__rendered {
        padding-right: 2rem; /* give space for the clear button */
      }
      .select2-selection__clear {
        color: #6b7280; /* gray-500 */
        font-weight: 700;
        margin-right: 10px; /* move away from the right edge */
        margin-left: 6px;  /* add gap from the selected text */
        opacity: 0.9;
      }
      .select2-selection__clear:hover { color: #ef4444; /* red-500 */ opacity: 1; }
      .dark .select2-selection__clear { color: #f3f4f6; /* gray-100 */ opacity: 0.95; }
      .dark .select2-selection__clear:hover { color: #f87171; /* red-400 */ opacity: 1; }
    `;
    document.head.appendChild(style);
  }
}

export type Select2Option = { id: string | number; text: string; disabled?: boolean };

type Props = {
  value?: string | number;
  onChange?: (value: string | number | "", data?: any) => void;
  options: Select2Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownToBody?: boolean; // default true to avoid clipping in modals
  ajaxUrl?: string; // if provided, Select2 will load options via AJAX
  minimumInputLength?: number;
  // For AJAX mode: provide an initial selected option so Select2 can render label
  initialSelected?: { id: string | number; text: string } | undefined;
};

export function Select2Field({ value, onChange, options, placeholder, disabled, className, dropdownToBody = false, ajaxUrl, minimumInputLength = 0, initialSelected }: Props) {
  const selectRef = useRef<HTMLSelectElement | null>(null);

  // Initialize Select2
  useEffect(() => {
    ensureSelect2();
    const el = selectRef.current;
    if (!el) return;

    console.log('[Select2Field] Init', { value, initialSelected, ajaxUrl });

    const $el = $(el);
    // Find nearest modal/dialog to mount dropdown to avoid clipping
    let dropdownParentEl: Element | null = null;
    try {
      dropdownParentEl = el.closest('[role="dialog"], [aria-modal="true"], .modal, .DialogContent, .ReactModal__Content');
    } catch { }
    const dropdownParent = dropdownToBody ? $(document.body) : $(dropdownParentEl || document.body);

    $el.select2({
      width: "100%",
      placeholder: placeholder || "",
      allowClear: true,
      dropdownParent,
      minimumInputLength,
      minimumResultsForSearch: 0,
      ajax: ajaxUrl
        ? {
          transport: (params: any, success: any, failure: any) => {
            const term = params?.data?.q || '';
            const url = `${ajaxUrl}${ajaxUrl.includes('?') ? '&' : '?'}q=${encodeURIComponent(term)}&format=select2`;
            fetch(url, { credentials: 'same-origin', cache: 'no-store' })
              .then((r) => r.json())
              .then((data) => {
                try { console.debug('[Select2Field] ajax success', { url, count: Array.isArray(data?.results) ? data.results.length : 0 }); } catch { }
                success(data);
              })
              .catch((err) => {
                try { console.error('[Select2Field] ajax error', { url, err }); } catch { }
                failure(err);
              });
          },
          delay: 200,
          dataType: 'json',
          data: (params: any) => ({ q: params?.term || '', format: 'select2' }),
          processResults: (data: any) => {
            const results = Array.isArray(data?.results) ? data.results : [];
            try { if (results.length === 0) console.debug('[Select2Field] ajax empty results'); } catch { }
            return { results };
          },
          cache: true,
        }
        : undefined,
    });

    // Style container to match input size (44px = h-11, rounded-lg = 8px border radius)
    const applyContainerStyles = () => {
      const $container = $el.next('.select2-container');
      if ($container && $container.length) {
        $container.css({ width: '100%' });
        const $sel = $container.find('.select2-selection--single');
        $sel.css({
          height: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '',
          borderRadius: '8px',
          borderWidth: '1px',
        });
        const $render = $sel.find('.select2-selection__rendered');
        $render.css({ paddingLeft: '16px', color: '' });
        const $arrow = $sel.find('.select2-selection__arrow');
        $arrow.css({ height: '44px' });
      }
    };
    applyContainerStyles();

    const handler = (e: any) => {
      const v = ($el.val() as string | null);
      const data = ($el as any).select2('data')?.[0];
      console.log('[Select2Field] change event', { v, data });
      if (onChange) onChange(v == null || v === "" ? "" : v, data);
    };
    $el.on("change", handler);

    // If there is an initial selected option (AJAX mode), ensure it exists so label shows up
    const ensureInitialSelected = () => {
      if (!ajaxUrl) return;
      if (!initialSelected || initialSelected.id == null) return;
      const currentOptions = Array.from(el.options).map((o) => o.value);
      const idStr = String(initialSelected.id);
      if (!currentOptions.includes(idStr)) {
        const opt = new Option(initialSelected.text, idStr, false, false);
        el.appendChild(opt);
      }
      // set value if matches
      if (value != null && value !== "") {
        $el.val(String(value)).trigger("change");
      }
    };
    ensureInitialSelected();

    // Preload initial results (q='') for AJAX mode to ensure items terlihat tanpa mengetik
    if (ajaxUrl) {
      const preloadUrl = `${ajaxUrl}${ajaxUrl.includes('?') ? '&' : '?'}q=&format=select2`;
      fetch(preloadUrl, { credentials: 'same-origin', cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => {
          const results = Array.isArray(data?.results) ? data.results : [];
          if (results.length) {
            // Save current value before adding options
            const currentValue = $el.val();
            
            // Seed as options so Select2 bisa render langsung
            const frag = document.createDocumentFragment();
            results.forEach((it: any) => {
              // Skip if option already exists
              const existingOpt = Array.from(el.options).find(o => o.value === String(it.id));
              if (!existingOpt) {
                const opt = new Option(String(it.text || it.id), String(it.id), false, false);
                (opt as any).disabled = !!it.disabled;
                frag.appendChild(opt);
              } else {
                // Update text if different
                if (existingOpt.text !== String(it.text || it.id)) {
                  existingOpt.text = String(it.text || it.id);
                }
              }
            });
            el.appendChild(frag);
            
            // Restore value after adding options
            if (currentValue) {
              $el.val(currentValue);
            }
            try { $el.trigger('change.select2'); } catch { }
          }
        })
        .catch(() => { });
    }

    // Force initial fetch on open when minimumInputLength === 0
    $el.on('select2:open', () => {
      const searchField = document.querySelector('.select2-container--open .select2-search__field') as HTMLInputElement | null;
      if (searchField) {
        if (typeof searchField.focus === 'function') searchField.focus();
        if (!searchField.getAttribute('placeholder')) {
          searchField.setAttribute('placeholder', placeholder || 'Ketik untuk mencari…');
        }
        // Force a value change to trigger AJAX with empty term
        searchField.value = ' ';
        searchField.dispatchEvent(new Event('input', { bubbles: true }));
        searchField.value = '';
        searchField.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    return () => {
      try { $el.off("change", handler); } catch { }
      try { $el.select2("destroy"); } catch { }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ajaxUrl, minimumInputLength, placeholder, dropdownToBody]);

  // Re-init when options set changes (to reflect disabled/text changes reliably)
  useEffect(() => {
    // For non-ajax mode, we need to notify Select2 when options change
    if (ajaxUrl) return;
    ensureSelect2();
    const el = selectRef.current;
    if (!el) return;
    const $el = $(el);
    try { $el.trigger("change.select2"); } catch { }
  }, [options, ajaxUrl]);

  // Keep initialSelected injected/synced when it changes (AJAX mode)
  useEffect(() => {
    if (!ajaxUrl) return;
    const el = selectRef.current;
    if (!el) return;
    if (!initialSelected || initialSelected.id == null) return;
    const $el = $(el);
    const idStr = String(initialSelected.id);
    const existingOption = Array.from(el.options).find((o) => o.value === idStr);

    if (!existingOption) {
      const opt = new Option(initialSelected.text, idStr, false, false);
      el.appendChild(opt);
      // Trigger change to update Select2 display
      try { $el.trigger('change.select2'); } catch { }
    } else if (existingOption.text !== initialSelected.text) {
      // Update existing option text if it differs (e.g. loaded from cache async)
      existingOption.text = initialSelected.text;
      // Trigger change to ensure Select2 updates the rendered label
      try { $el.trigger('change.select2'); } catch { }
    }
  }, [ajaxUrl, initialSelected]);

  // Sync value
  useEffect(() => {
    const el = selectRef.current;
    if (!el) return;
    const $el = $(el);
    
    console.log('[Select2Field] Sync value', { value, currentVal: $el.val() });
    
    if (value == null || value === "") {
      if ($el.val() !== null && $el.val() !== "") {
        $el.val(null);
        try { $el.trigger('change.select2'); } catch { }
      }
    } else {
      const valueStr = String(value);
      // Only set value if it's different from current value
      if ($el.val() !== valueStr) {
        console.log('[Select2Field] Setting value', { valueStr, ajaxUrl, initialSelected });
        // For AJAX mode, ensure option exists before setting value
        if (ajaxUrl) {
          const exists = Array.from(el.options).some((o) => o.value === valueStr);
          console.log('[Select2Field] Option exists?', { exists, options: Array.from(el.options).map(o => o.value) });
          if (!exists) {
            // Try to create option from initialSelected if available
            if (initialSelected && String(initialSelected.id) === valueStr) {
              console.log('[Select2Field] Creating option from initialSelected');
              const opt = new Option(initialSelected.text, valueStr, true, true);
              el.appendChild(opt);
            } else {
              // Create a temporary option - it will be replaced when AJAX loads
              console.log('[Select2Field] Creating temporary option');
              const opt = new Option(`ID: ${valueStr}`, valueStr, true, true);
              el.appendChild(opt);
            }
          }
        }
        // Set value without triggering change event to avoid loop
        $el.val(valueStr);
        console.log('[Select2Field] Value set, triggering change.select2');
      }
      // Manually trigger select2 to update display
      try { $el.trigger('change.select2'); } catch { }
    }
  }, [value, ajaxUrl, initialSelected, options]);

  // Sync disabled state
  useEffect(() => {
    const el = selectRef.current;
    if (!el) return;
    const $el = $(el);
    $el.prop('disabled', !!disabled);
    // Force Select2 to reflect disabled state
    try { $el.trigger('change.select2'); } catch { }
  }, [disabled]);

  return (
    <select ref={selectRef} className={className} disabled={disabled} defaultValue={value ? String(value) : ""}>
      <option value=""></option>
      {ajaxUrl && initialSelected && (
        <option value={String(initialSelected.id)}>{initialSelected.text}</option>
      )}
      {!ajaxUrl && options.map((o) => (
        <option key={String(o.id)} value={String(o.id)} disabled={!!o.disabled}>
          {o.text}
        </option>
      ))}
    </select>
  );
}

export default Select2Field;
